import type { FastifyInstance } from 'fastify'
import { drPlaybookRoutes } from './playbooks.routes.js'
import { drReadinessRoutes } from './readiness.routes.js'

export async function drRoutes(app: FastifyInstance) {
  await app.register(drPlaybookRoutes, { prefix: '/playbooks' })
  await app.register(drReadinessRoutes, { prefix: '/readiness' })
}
