import type { FastifyInstance } from 'fastify'
import { ocrRoutes } from './routes.js'

export async function ocrModuleRoutes(app: FastifyInstance) {
  await app.register(ocrRoutes)
}