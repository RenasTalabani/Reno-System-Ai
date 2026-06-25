/**
 * Reno Brain — AI Monitoring & Self-Healing
 * Phase 24: Observability & Monitoring Platform
 *
 * Uses real production telemetry data to detect anomalies, explain root causes,
 * and recommend fixes. Operates on live data from Reno modules — not mocks.
 */

import type { FastifyInstance } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { registry } from '../../../observability/metrics.js'
import { logger } from '@reno/logger'

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' })
const AI_MODEL = process.env['AI_MODEL'] ?? 'claude-haiku-4-5-20251001'

interface TelemetrySnapshot {
  metrics: Record<string, unknown>
  incidents: unknown[]
  recentErrors: unknown[]
  kpis: Record<string, unknown>
  dbSlowQueries: unknown
  jobStats: unknown
  securityEvents: unknown[]
}

async function gatherTelemetry(tenantId: string): Promise<TelemetrySnapshot> {
  const now = new Date()
  const last1h = new Date(now.getTime() - 3600000)
  const last24h = new Date(now.getTime() - 86400000)

  const [metricsJson, incidents, recentErrors, kpis, dbSlowCount, jobStats, secEvents] = await Promise.all([
    registry.getMetricsAsJSON(),
    prisma.obsIncident.findMany({
      where: { tenantId, status: 'open', deletedAt: null },
      orderBy: { detectedAt: 'desc' },
      take: 10,
      select: { title: true, severity: true, category: true, affectedArea: true, detectedAt: true, metrics: true },
    }),
    prisma.sysAuditLog.findMany({
      where: { tenantId, occurredAt: { gte: last1h } },
      orderBy: { occurredAt: 'desc' },
      take: 20,
      select: { action: true, module: true, occurredAt: true },
    }),
    // Real KPI snapshot
    Promise.all([
      prisma.coreUser.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      prisma.coreSession.count({ where: { tenantId, isActive: true, expiresAt: { gt: now } } }),
      prisma.secLoginAttempt.count({ where: { tenantId, success: false, createdAt: { gte: last1h } } }),
      prisma.sysJob.count({ where: { tenantId, status: 'failed', createdAt: { gte: last24h } } }),
    ]).then(([users, sessions, failedLogins, failedJobs]) => ({ activeUsers: users, activeSessions: sessions, failedLoginsLastHour: failedLogins, failedJobsLast24h: failedJobs })),
    prisma.sysAuditLog.count({ where: { tenantId, occurredAt: { gte: last1h } } }), // proxy for DB activity
    prisma.sysJob.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _count: true }),
    prisma.secSecurityEvent.findMany({
      where: { tenantId, createdAt: { gte: last1h } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { eventType: true, severity: true, title: true, createdAt: true, ipAddress: true },
    }),
  ])

  // Extract key numeric metrics
  const metricsMap: Record<string, unknown> = {}
  for (const m of metricsJson) {
    if (m.name?.startsWith('reno_') && m.values?.[0] !== undefined) {
      metricsMap[m.name] = m.values[0].value
    }
  }

  return {
    metrics: metricsMap,
    incidents,
    recentErrors,
    kpis,
    dbSlowQueries: dbSlowCount,
    jobStats,
    securityEvents: secEvents,
  }
}

function buildAnomalyPrompt(telemetry: TelemetrySnapshot, tenantId: string): string {
  return `You are Reno Brain, the AI monitoring core of the Reno Business Operating System.

Analyze the following LIVE production telemetry for tenant ${tenantId} and:
1. Identify any anomalies or risks
2. Explain the root cause of each issue in plain language
3. Provide specific, actionable remediation steps
4. Estimate business impact (high/medium/low)
5. Learn from recurring patterns if visible

## Live Metrics (from Prometheus)
${JSON.stringify(telemetry.metrics, null, 2)}

## Open Incidents
${JSON.stringify(telemetry.incidents, null, 2)}

## Live KPIs
${JSON.stringify(telemetry.kpis, null, 2)}

## Recent Security Events (last 1h)
${JSON.stringify(telemetry.securityEvents, null, 2)}

## Background Job Status
${JSON.stringify(telemetry.jobStats, null, 2)}

## Recent Activity (last 1h, audit log count)
DB audit log entries: ${JSON.stringify(telemetry.dbSlowQueries)}

Respond with a JSON object in this exact structure:
{
  "overallRisk": "low|medium|high|critical",
  "riskScore": <0-100>,
  "summary": "<one sentence summary>",
  "anomalies": [
    {
      "id": "<unique-id>",
      "title": "<anomaly title>",
      "severity": "info|warning|critical",
      "affectedArea": "<api|database|cache|jobs|security|users>",
      "rootCause": "<plain language explanation>",
      "evidence": "<what metric or data triggered this>",
      "recommendation": "<specific fix steps>",
      "estimatedImpact": "low|medium|high",
      "autoResolvable": <true|false>
    }
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>"
  ],
  "recurringPatterns": [
    "<pattern description if any>"
  ],
  "healthyAreas": ["<area that looks good>"]
}`
}

export async function aiMonitorRoutes(app: FastifyInstance) {
  // GET /v1/monitoring/ai/analyze — full AI anomaly analysis on real data
  app.get('/analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!process.env['ANTHROPIC_API_KEY']) {
      return reply.send(buildSuccessResponse({
        overallRisk: 'unknown',
        riskScore: 0,
        summary: 'Reno Brain analysis unavailable — ANTHROPIC_API_KEY not configured.',
        anomalies: [],
        recommendations: ['Configure ANTHROPIC_API_KEY to enable AI monitoring.'],
        recurringPatterns: [],
        healthyAreas: [],
        _note: 'Set ANTHROPIC_API_KEY in .env to enable live AI analysis.',
      }))
    }

    const telemetry = await gatherTelemetry(request.tenantId)
    const prompt = buildAnomalyPrompt(telemetry, request.tenantId)

    try {
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { overallRisk: 'unknown', anomalies: [], recommendations: [] }

      // Persist critical anomalies as incidents
      if (analysis.anomalies?.length > 0) {
        for (const anomaly of analysis.anomalies.filter((a: { severity: string }) => a.severity === 'critical')) {
          await prisma.obsIncident.create({
            data: {
              tenantId: request.tenantId,
              title: anomaly.title,
              description: anomaly.rootCause ?? anomaly.title,
              severity: anomaly.severity,
              category: anomaly.affectedArea ?? 'system',
              affectedArea: anomaly.affectedArea,
              metrics: (telemetry.metrics ?? {}) as object,
              aiAnalysis: anomaly.rootCause,
              aiRecommendations: [anomaly.recommendation] as unknown as object,
            },
          }).catch(() => {}) // non-fatal
        }
      }

      // Log AI usage
      await prisma.aiUsageLog.create({
        data: {
          tenantId: request.tenantId,
          userId: request.userId,
          module: 'monitoring',
          feature: 'monitoring_anomaly_detection',
          model: AI_MODEL,
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          requestDurationMs: 0,
          status: 'success',
          metadata: { riskScore: analysis.riskScore, anomalyCount: analysis.anomalies?.length ?? 0 } as object,
        },
      }).catch(() => {})

      return reply.send(buildSuccessResponse({
        ...analysis,
        telemetrySampledAt: new Date().toISOString(),
        dataSource: 'live_production',
      }))
    } catch (err) {
      logger.error({ err }, 'AI monitoring analysis failed')
      return reply.send(buildSuccessResponse({
        overallRisk: 'unknown',
        riskScore: 0,
        summary: 'AI analysis temporarily unavailable.',
        anomalies: [],
        recommendations: ['Check AI service connectivity.'],
        recurringPatterns: [],
        healthyAreas: [],
      }))
    }
  })

  // GET /v1/monitoring/ai/dashboard — AI monitoring dashboard summary
  app.get('/dashboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const [recentIncidents, aiUsageLast24h, openAlertsCount, metricsJson] = await Promise.all([
      prisma.obsIncident.findMany({
        where: { tenantId: request.tenantId, deletedAt: null },
        orderBy: { detectedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, severity: true, status: true, category: true, detectedAt: true, aiAnalysis: true },
      }),
      prisma.aiUsageLog.count({
        where: { tenantId: request.tenantId, feature: 'monitoring_anomaly_detection', occurredAt: { gte: new Date(Date.now() - 86400000) } },
      }),
      prisma.obsAlert.count({ where: { OR: [{ tenantId: request.tenantId }, { tenantId: null }], isActive: true, deletedAt: null } }),
      registry.getMetricsAsJSON(),
    ])

    const uptime = metricsJson.find(m => m.name === 'reno_api_uptime_seconds')?.values?.[0]?.value ?? 0
    const heapUsed = metricsJson.find(m => m.name === 'reno_process_heap_bytes')?.values?.[0]?.value ?? 0
    const heapTotal = metricsJson.find(m => m.name === 'reno_process_heap_total_bytes')?.values?.[0]?.value ?? 1

    return reply.send(buildSuccessResponse({
      monitoring: {
        openAlertsCount,
        recentIncidents,
        aiAnalysesLast24h: aiUsageLast24h,
        grafanaUrl: 'http://localhost:3001',
        prometheusUrl: 'http://localhost:9090',
      },
      system: {
        uptimeSeconds: uptime,
        heapUsedMb: Math.round((heapUsed as number) / 1048576),
        heapUsagePct: Math.round(((heapUsed as number) / (heapTotal as number)) * 100),
        environment: process.env['NODE_ENV'] ?? 'development',
      },
      capabilities: [
        'real-time anomaly detection',
        'root cause analysis',
        'self-healing recommendations',
        'cross-module correlation',
        'incident auto-creation for critical anomalies',
        'recurring pattern learning',
        'business impact estimation',
      ],
    }))
  })

  // POST /v1/monitoring/ai/incidents/:id/analyze — AI analysis for a specific incident
  app.post('/incidents/:id/analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const incident = await prisma.obsIncident.findFirst({
      where: { id, OR: [{ tenantId: request.tenantId }, { tenantId: null }], deletedAt: null },
    })

    if (!incident) {
      return reply.status(404).send(buildSuccessResponse(null))
    }

    if (!process.env['ANTHROPIC_API_KEY']) {
      return reply.send(buildSuccessResponse({ aiAnalysis: 'AI not configured.', recommendations: [] }))
    }

    const prompt = `You are Reno Brain. Analyze this production incident and provide:
1. Root cause analysis
2. Immediate remediation steps
3. Prevention measures

Incident:
Title: ${incident.title}
Description: ${incident.description}
Severity: ${incident.severity}
Category: ${incident.category}
Affected Area: ${incident.affectedArea ?? 'unknown'}
Metrics at detection: ${JSON.stringify(incident.metrics)}
Detected at: ${incident.detectedAt.toISOString()}

Respond with JSON: { "rootCause": "...", "immediateSteps": ["..."], "preventionMeasures": ["..."], "estimatedResolutionTime": "..." }`

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    await prisma.obsIncident.update({
      where: { id },
      data: {
        aiAnalysis: analysis.rootCause,
        aiRecommendations: [
          ...(analysis.immediateSteps ?? []),
          ...(analysis.preventionMeasures ?? []),
        ] as unknown as object,
      },
    })

    return reply.send(buildSuccessResponse(analysis))
  })
}
