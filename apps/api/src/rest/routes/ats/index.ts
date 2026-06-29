import type { FastifyInstance } from 'fastify'
import { atsRoutes } from './routes.js'

export async function atsModuleRoutes(app: FastifyInstance) {
  await app.register(atsRoutes)
}