import type { FastifyInstance } from 'fastify'
import { treasuryRoutes } from './routes.js'

export async function treasuryModuleRoutes(app: FastifyInstance) {
  await app.register(treasuryRoutes)
}