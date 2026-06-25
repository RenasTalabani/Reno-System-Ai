import type { FastifyInstance } from 'fastify'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { registry } from '../../../observability/metrics.js'

export async function tracingRoutes(app: FastifyInstance) {
  // GET /v1/monitoring/traces/config — OpenTelemetry config info
  app.get('/config', { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.send(buildSuccessResponse({
      enabled: true,
      exporterEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? null,
      sampler: 'always-on',
      instrumentations: ['fastify', 'pg'],
      propagators: ['tracecontext', 'baggage'],
      correlationIdHeader: 'x-request-id',
    }))
  })

  // GET /v1/monitoring/traces/summary — span/trace stats from Prometheus counters
  app.get('/summary', { preHandler: [requireAuth] }, async (_request, reply) => {
    const metrics = await registry.getMetricsAsJSON()
    const spanMetric = metrics.find(m => m.name === 'reno_trace_spans_total')
    const activeSpanMetric = metrics.find(m => m.name === 'reno_active_spans')

    const totalSpans = spanMetric?.values?.[0]?.value ?? 0
    const activeSpans = activeSpanMetric?.values?.[0]?.value ?? 0

    return reply.send(buildSuccessResponse({
      totalSpans,
      activeSpans,
      collectedAt: new Date().toISOString(),
      jaegerUi: process.env['JAEGER_UI_URL'] ?? null,
      tempoUrl: process.env['TEMPO_URL'] ?? null,
    }))
  })
}
