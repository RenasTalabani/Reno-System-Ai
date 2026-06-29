import type { FastifyInstance } from 'fastify'
import { grantsRoutes } from './routes.js'

export async function grantsModuleRoutes(app: FastifyInstance) {
  await app.register(grantsRoutes)
}
