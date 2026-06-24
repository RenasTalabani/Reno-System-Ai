import type { FastifyInstance } from 'fastify'
import { sdTicketRoutes } from './tickets.routes.js'
import { sdCategoryRoutes } from './categories.routes.js'
import { sdSlaRoutes } from './sla.routes.js'
import { sdAgentRoutes } from './agents.routes.js'
import { sdDashboardRoutes } from './dashboard.routes.js'

export async function helpdeskRoutes(app: FastifyInstance) {
  await app.register(sdDashboardRoutes, { prefix: '/dashboard' })
  await app.register(sdTicketRoutes, { prefix: '/tickets' })
  await app.register(sdCategoryRoutes, { prefix: '/categories' })
  await app.register(sdSlaRoutes, { prefix: '/sla' })
  await app.register(sdAgentRoutes, { prefix: '/agents' })
}
