import type { FastifyInstance } from 'fastify'
import { chatRoutes } from './routes.js'

export async function chatModuleRoutes(app: FastifyInstance) {
  await app.register(chatRoutes)
}
