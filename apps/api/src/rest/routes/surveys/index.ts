import type { FastifyInstance } from 'fastify'
import { surveysRoutes } from './routes.js'

export async function surveysModuleRoutes(app: FastifyInstance) {
  await app.register(surveysRoutes)
}