import type { FastifyInstance } from 'fastify'
import { personalAssistantRoutes } from './routes.js'

export async function personalAssistantModuleRoutes(app: FastifyInstance) {
  await app.register(personalAssistantRoutes, { prefix: '/personal-assistant' })
}
