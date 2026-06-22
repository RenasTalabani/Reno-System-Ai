import type { FastifyInstance } from 'fastify'
import { pmDashboardRoutes } from './dashboard.routes.js'
import { pmProjectRoutes } from './projects.routes.js'
import { pmTaskRoutes } from './tasks.routes.js'
import { pmMilestoneRoutes } from './milestones.routes.js'
import { pmBoardRoutes } from './boards.routes.js'
import { pmTimeLogRoutes } from './time-logs.routes.js'
import { pmResourceRoutes } from './resources.routes.js'

export async function pmRoutes(app: FastifyInstance) {
  await app.register(pmDashboardRoutes, { prefix: '/dashboard' })
  await app.register(pmProjectRoutes, { prefix: '/projects' })
  await app.register(pmTaskRoutes, { prefix: '/tasks' })
  await app.register(pmMilestoneRoutes, { prefix: '/milestones' })
  await app.register(pmBoardRoutes, { prefix: '/boards' })
  await app.register(pmTimeLogRoutes, { prefix: '/time-logs' })
  await app.register(pmResourceRoutes, { prefix: '/resources' })
}
