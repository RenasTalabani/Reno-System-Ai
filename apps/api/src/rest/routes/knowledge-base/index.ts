import type { FastifyInstance } from 'fastify'
import { knowledgeBaseRoutes } from './routes.js'

export async function knowledgeBaseModuleRoutes(app: FastifyInstance) {
  await app.register(knowledgeBaseRoutes)
}
