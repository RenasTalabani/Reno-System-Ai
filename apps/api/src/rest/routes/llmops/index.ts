import type { FastifyInstance } from 'fastify'
import { llmopsRoutes } from './routes.js'

export async function llmopsModuleRoutes(app: FastifyInstance) {
  await app.register(llmopsRoutes, { prefix: '/llmops' })
}
