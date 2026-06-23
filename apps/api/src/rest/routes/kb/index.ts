import type { FastifyInstance } from 'fastify'
import { kbDashboardRoutes } from './dashboard.routes.js'
import { kbCategoryRoutes } from './categories.routes.js'
import { kbArticleRoutes } from './articles.routes.js'

export async function kbRoutes(app: FastifyInstance) {
  await app.register(kbDashboardRoutes, { prefix: '/dashboard' })
  await app.register(kbCategoryRoutes, { prefix: '/categories' })
  await app.register(kbArticleRoutes, { prefix: '/articles' })
}
