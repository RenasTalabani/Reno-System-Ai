/**
 * Reno Brain — AI SRE (Site Reliability Engineer)
 * Phase 25: Disaster Recovery & Backup Infrastructure
 *
 * Continuously evaluates system health, backup integrity, infrastructure capacity,
 * and predicts failures before they occur. ALL recommended remediation actions
 * require human approval — Reno Brain NEVER executes actions autonomously.
 *
 * Real production data only — no mocks.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@reno/database'
import { registry } from '../observability/metrics.js'
import { logger } from '@reno/logger'
import { getRtoPtoStatus, computeDrReadinessScore } from '../dr/rto-rpo.monitor.js'

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' })
const AI_MODEL = process.env['AI_MODEL'] ?? 'claude-haiku-4-5-20251001'

export interface SreTelemetry {
  backupStatus: {
    lastBackupAt: Date | null
    lastBackupType: string | null
    totalBackupsLast7d: number
    failedBackupsLast24h: number
    verifiedBackupsLast7d: number
    storageUsedBytes: number
  }
  rtoRpo: Awaited<ReturnType<typeof getRtoPtoStatus>>
  drReadinessScore: number
  drReadinessTrend: Array<{ scoredAt: Date; score: number }>
  capacityMetrics: {
    heapUsedMb: number
    heapTotalMb: number
    heapUsagePct: number
    rssMb: number
    totalUsersGrowthRate: number
    dbRowsEstimate: number
  }
  openSreIncidents: number
  recentPlaybookExecutions: { status: string; playbookName: string | null; startedAt: Date }[]
  replicationStatus: { total: number; failed: number; pending: number }
}

async function gatherSreTelemetry(tenantId?: string): Promise<SreTelemetry> {
  const now = new Date()
  const last7d = new Date(now.getTime() - 7 * 86400000)
  const last24h = new Date(now.getTime() - 86400000)

  const whereClause = tenantId ? { tenantId } : {}

  const [
    lastBackup, totalBackups7d, failedBackups24h, verifiedBackups7d,
    rtoRpo, drScore, drHistory,
    metricsJson,
    userCount7dAgo, userCountNow,
    openIncidents,
    recentExecutions,
    replicationStats,
  ] = await Promise.all([
    prisma.bkpJob.findFirst({
      where: { ...whereClause, status: { in: ['completed', 'verified'] }, deletedAt: null },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true, jobType: true, sizeBytes: true },
    }),
    prisma.bkpJob.count({ where: { ...whereClause, createdAt: { gte: last7d }, deletedAt: null } }),
    prisma.bkpJob.count({ where: { ...whereClause, status: 'failed', createdAt: { gte: last24h } } }),
    prisma.bkpJob.count({ where: { ...whereClause, isVerified: true, createdAt: { gte: last7d } } }),
    getRtoPtoStatus(),
    computeDrReadinessScore(),
    prisma.drReadinessScore.findMany({ where: { scoredAt: { gte: new Date(now.getTime() - 7 * 86400000) } }, orderBy: { scoredAt: 'asc' }, select: { scoredAt: true, score: true }, take: 7 }),
    registry.getMetricsAsJSON(),
    prisma.coreUser.count({ where: { ...whereClause, deletedAt: null, createdAt: { lte: last7d } } }),
    prisma.coreUser.count({ where: { ...whereClause, deletedAt: null } }),
    prisma.aiSreIncident.count({ where: { ...whereClause, status: { in: ['open', 'investigating'] }, deletedAt: null } }),
    prisma.drPlaybookExecution.findMany({ orderBy: { startedAt: 'desc' }, take: 5, select: { status: true, startedAt: true, playbookId: true } }),
    prisma.bkpReplication.groupBy({ by: ['status'], _count: true }),
  ])

  const heapMetric = metricsJson.find(m => m.name === 'reno_process_heap_bytes')?.values?.[0]?.value ?? 0
  const heapTotalMetric = metricsJson.find(m => m.name === 'reno_process_heap_total_bytes')?.values?.[0]?.value ?? 1
  const rssMetric = metricsJson.find(m => m.name === 'reno_process_rss_bytes')?.values?.[0]?.value ?? 0

  const playbookNames = await prisma.drPlaybook.findMany({
    where: { id: { in: recentExecutions.map(e => e.playbookId) } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(playbookNames.map(p => [p.id, p.name]))

  const repTotal = replicationStats.reduce((s, r) => s + r._count, 0)
  const repFailed = replicationStats.find(r => r.status === 'failed')?._count ?? 0
  const repPending = replicationStats.find(r => r.status === 'pending')?._count ?? 0

  return {
    backupStatus: {
      lastBackupAt: lastBackup?.completedAt ?? null,
      lastBackupType: lastBackup?.jobType ?? null,
      totalBackupsLast7d: totalBackups7d,
      failedBackupsLast24h: failedBackups24h,
      verifiedBackupsLast7d: verifiedBackups7d,
      storageUsedBytes: Number(lastBackup?.sizeBytes ?? 0),
    },
    rtoRpo,
    drReadinessScore: drScore,
    drReadinessTrend: drHistory,
    capacityMetrics: {
      heapUsedMb: Math.round((heapMetric as number) / 1048576),
      heapTotalMb: Math.round((heapTotalMetric as number) / 1048576),
      heapUsagePct: Math.round(((heapMetric as number) / (heapTotalMetric as number)) * 100),
      rssMb: Math.round((rssMetric as number) / 1048576),
      totalUsersGrowthRate: userCountNow - userCount7dAgo,
      dbRowsEstimate: userCountNow * 15, // approximate based on users
    },
    openSreIncidents: openIncidents,
    recentPlaybookExecutions: recentExecutions.map(e => ({
      status: e.status,
      playbookName: nameMap.get(e.playbookId) ?? null,
      startedAt: e.startedAt,
    })),
    replicationStatus: { total: repTotal, failed: repFailed, pending: repPending },
  }
}

function buildSrePrompt(telemetry: SreTelemetry): string {
  return `You are Reno Brain acting as an AI Site Reliability Engineer (AI SRE).

Analyze the following LIVE production telemetry and provide:
1. Backup health assessment
2. Disaster recovery readiness evaluation
3. Capacity trend forecasting (next 30/60/90 days)
4. Predictive failure identification
5. Specific remediation recommendations (NEVER mark as auto-executable — all require human approval)
6. Infrastructure Digital Twin state assessment

## Live Backup Status
${JSON.stringify(telemetry.backupStatus, null, 2)}

## RTO/RPO Compliance
${JSON.stringify(telemetry.rtoRpo, null, 2)}

## DR Readiness Score: ${telemetry.drReadinessScore}/100
Trend (last 7 days): ${JSON.stringify(telemetry.drReadinessTrend.map(d => ({ date: d.scoredAt, score: d.score })))}

## Capacity Metrics
${JSON.stringify(telemetry.capacityMetrics, null, 2)}

## Replication Status
${JSON.stringify(telemetry.replicationStatus, null, 2)}

## Open SRE Incidents: ${telemetry.openSreIncidents}

## Recent DR Playbook Executions
${JSON.stringify(telemetry.recentPlaybookExecutions, null, 2)}

Respond with a JSON object in this exact structure:
{
  "backupHealth": {
    "score": <0-100>,
    "status": "healthy|degraded|critical",
    "issues": ["<issue>"],
    "predictedFailures": ["<predicted issue in next 24h/7d>"]
  },
  "drReadiness": {
    "score": <0-100>,
    "rtoCompliant": <boolean>,
    "rpoCompliant": <boolean>,
    "gaps": ["<gap description>"],
    "recommendations": ["<specific action — for human review>"]
  },
  "capacityForecast": {
    "currentTrend": "growing|stable|shrinking",
    "next30daysHeapMb": <estimated>,
    "next60daysHeapMb": <estimated>,
    "next90daysDbRows": <estimated>,
    "riskLevel": "low|medium|high",
    "scalingRecommendation": "<specific recommendation>"
  },
  "incidentTimeline": [
    { "timestamp": "<ISO>", "event": "<event>", "source": "<metrics|backup|replication>", "severity": "info|warning|critical" }
  ],
  "digitalTwin": {
    "apiHealth": "healthy|degraded|critical",
    "dbHealth": "healthy|degraded|critical",
    "backupHealth": "healthy|degraded|critical",
    "cacheHealth": "healthy|degraded|critical",
    "replicationHealth": "healthy|degraded|critical",
    "overallSystemState": "healthy|degraded|critical",
    "simulatedFailurePoints": ["<component that could fail>"]
  },
  "selfHealingRecommendations": [
    {
      "action": "<specific command or API call>",
      "reason": "<why this helps>",
      "requiresHumanApproval": true,
      "estimatedImpact": "low|medium|high",
      "priority": "low|medium|high|critical"
    }
  ],
  "overallSreRisk": "low|medium|high|critical",
  "summary": "<2-3 sentence executive summary>"
}`
}

export async function runSreAnalysis(tenantId?: string): Promise<{
  analysis: Record<string, unknown>
  telemetry: SreTelemetry
  incidentId: string | null
}> {
  if (!process.env['ANTHROPIC_API_KEY']) {
    const telemetry = await gatherSreTelemetry(tenantId)
    return {
      analysis: {
        overallSreRisk: 'unknown',
        summary: 'AI SRE unavailable — ANTHROPIC_API_KEY not configured.',
        drReadiness: { score: telemetry.drReadinessScore },
        backupHealth: { score: telemetry.backupStatus.totalBackupsLast7d > 0 ? 70 : 20 },
        _note: 'Configure ANTHROPIC_API_KEY to enable AI SRE.',
      },
      telemetry,
      incidentId: null,
    }
  }

  const telemetry = await gatherSreTelemetry(tenantId)
  const prompt = buildSrePrompt(telemetry)

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) as Record<string, unknown> : { overallSreRisk: 'unknown' }

  // Create SRE incident if critical risk or DR issues detected
  let incidentId: string | null = null
  const riskLevel = analysis['overallSreRisk'] as string
  if (riskLevel === 'critical' || riskLevel === 'high') {
    const timeline = analysis['incidentTimeline']
    const digitalTwin = analysis['digitalTwin']
    const recs = analysis['selfHealingRecommendations']

    const incident = await prisma.aiSreIncident.create({
      data: {
        tenantId: tenantId ?? null,
        title: `AI SRE: ${riskLevel.toUpperCase()} Risk Detected`,
        severity: riskLevel,
        category: 'infrastructure',
        status: 'open',
        aiAnalysis: analysis['summary'] as string ?? '',
        timeline: (Array.isArray(timeline) ? timeline : []) as object,
        affectedServices: (digitalTwin ? Object.entries(digitalTwin as Record<string, string>).filter(([, v]) => v !== 'healthy').map(([k]) => k) : []) as object,
        recommendations: (Array.isArray(recs) ? recs : []) as object,
        capacityForecast: (analysis['capacityForecast'] ?? {}) as object,
        digitalTwinState: (digitalTwin ?? {}) as object,
        humanApprovalRequired: true,
        autoActionsBlocked: true,
      },
    }).catch(() => null)
    incidentId = incident?.id ?? null
  }

  // Log AI usage
  await prisma.aiUsageLog.create({
    data: {
      tenantId: tenantId ?? (await prisma.coreTenant.findFirst({ select: { id: true } }))?.id ?? '',
      module: 'ai-sre',
      feature: 'sre_analysis',
      model: AI_MODEL,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      status: 'success',
      metadata: { riskLevel, incidentId } as object,
    },
  }).catch(() => {})

  logger.info({ riskLevel, incidentId }, 'AI SRE analysis completed')

  return { analysis, telemetry, incidentId }
}

export async function reconstructIncidentTimeline(incidentId: string): Promise<{
  timeline: Array<{ timestamp: string; event: string; source: string; severity: string }>
}> {
  const incident = await prisma.aiSreIncident.findFirst({ where: { id: incidentId, deletedAt: null } })
  if (!incident) throw new Error('Incident not found')

  // Gather correlated events around incident detection time
  const detectedAt = incident.detectedAt
  const windowStart = new Date(detectedAt.getTime() - 3600000)
  const windowEnd = new Date(detectedAt.getTime() + 3600000)

  const [auditLogs, bkpJobs, secEvents, obsIncidents] = await Promise.all([
    prisma.sysAuditLog.findMany({
      where: { occurredAt: { gte: windowStart, lte: windowEnd } },
      orderBy: { occurredAt: 'asc' },
      take: 50,
      select: { action: true, module: true, occurredAt: true },
    }),
    prisma.bkpJob.findMany({
      where: { createdAt: { gte: windowStart, lte: windowEnd } },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { jobType: true, status: true, createdAt: true, errorMessage: true },
    }),
    prisma.secSecurityEvent.findMany({
      where: { createdAt: { gte: windowStart, lte: windowEnd } },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { eventType: true, severity: true, title: true, createdAt: true },
    }),
    prisma.obsIncident.findMany({
      where: { detectedAt: { gte: windowStart, lte: windowEnd }, deletedAt: null },
      orderBy: { detectedAt: 'asc' },
      take: 10,
      select: { title: true, severity: true, detectedAt: true, category: true },
    }),
  ])

  const timeline: Array<{ timestamp: string; event: string; source: string; severity: string }> = [
    ...auditLogs.map(e => ({ timestamp: e.occurredAt.toISOString(), event: `${e.module}: ${e.action}`, source: 'audit_log', severity: 'info' })),
    ...bkpJobs.map(e => ({ timestamp: e.createdAt.toISOString(), event: `Backup ${e.jobType}: ${e.status}${e.errorMessage ? ` — ${e.errorMessage.slice(0, 100)}` : ''}`, source: 'backup', severity: e.status === 'failed' ? 'critical' : 'info' })),
    ...secEvents.map(e => ({ timestamp: e.createdAt.toISOString(), event: `Security: ${e.title}`, source: 'security', severity: e.severity })),
    ...obsIncidents.map(e => ({ timestamp: e.detectedAt.toISOString(), event: `Incident: ${e.title}`, source: 'monitoring', severity: e.severity })),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  // Persist reconstructed timeline
  await prisma.aiSreIncident.update({
    where: { id: incidentId },
    data: { timeline: timeline as object },
  })

  return { timeline }
}

export async function forecastCapacity(tenantId?: string): Promise<Record<string, unknown>> {
  const telemetry = await gatherSreTelemetry(tenantId)

  if (!process.env['ANTHROPIC_API_KEY']) {
    return {
      currentTrend: 'stable',
      next30daysHeapMb: telemetry.capacityMetrics.heapUsedMb * 1.1,
      next60daysHeapMb: telemetry.capacityMetrics.heapUsedMb * 1.2,
      next90daysDbRows: telemetry.capacityMetrics.dbRowsEstimate * 1.3,
      riskLevel: 'low',
      scalingRecommendation: 'No AI configured — using linear projection.',
      _note: 'Configure ANTHROPIC_API_KEY for AI-powered forecasting.',
    }
  }

  const { analysis } = await runSreAnalysis(tenantId)
  return (analysis['capacityForecast'] as Record<string, unknown>) ?? {}
}
