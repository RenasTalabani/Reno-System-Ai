import type { FastifyInstance } from 'fastify'
import { biOverviewRoutes } from './overview.routes.js'
import { biDashboardRoutes } from './dashboard.routes.js'
import { biKpiRoutes } from './kpi.routes.js'
import { biReportRoutes } from './report.routes.js'
import { biExportRoutes } from './export.routes.js'
import { biInsightRoutes } from './insights.routes.js'
import { biHealthRoutes } from './health.routes.js'

export async function analyticsRoutes(app: FastifyInstance) {
  await app.register(biOverviewRoutes, { prefix: '/overview' })
  await app.register(biDashboardRoutes, { prefix: '/dashboards' })
  await app.register(biKpiRoutes, { prefix: '/kpis' })
  await app.register(biReportRoutes, { prefix: '/reports' })
  await app.register(biExportRoutes, { prefix: '/exports' })
  await app.register(biInsightRoutes, { prefix: '/insights' })
  await app.register(biHealthRoutes, { prefix: '/health' })
}
