import type { FastifyInstance } from 'fastify'
import { signaturesRoutes } from './routes.js'

export async function signaturesModuleRoutes(app: FastifyInstance) {
  await app.register(signaturesRoutes)
}
