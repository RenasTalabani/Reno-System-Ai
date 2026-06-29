import type { FastifyInstance } from 'fastify'
import { slaRoutes } from './routes.js'

export async function slaModuleRoutes(app: FastifyInstance) {
  await app.register(slaRoutes)
}
