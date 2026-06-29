import type { FastifyInstance } from 'fastify'
import { omsRoutes } from './routes.js'

export async function omsModuleRoutes(app: FastifyInstance) {
  await app.register(omsRoutes)
}
