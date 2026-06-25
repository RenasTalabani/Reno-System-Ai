import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.routes.js'
import { alertRoutes } from './alerts.routes.js'
import { kpiRoutes } from './kpi.routes.js'
import { aiMonitorRoutes } from './ai-monitor.routes.js'
import { tracingRoutes } from './tracing.routes.js'

export async function monitoringRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(alertRoutes, { prefix: '/alerts' })
  await app.register(kpiRoutes, { prefix: '/kpi' })
  await app.register(aiMonitorRoutes, { prefix: '/ai' })
  await app.register(tracingRoutes, { prefix: '/traces' })
}
