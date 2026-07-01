import type { FastifyInstance } from 'fastify'
import { knowledgeGraphRoutes } from './routes.js'

export async function knowledgeGraphModuleRoutes(app: FastifyInstance) {
  await app.register(knowledgeGraphRoutes, { prefix: '/knowledge-graph' })
}
