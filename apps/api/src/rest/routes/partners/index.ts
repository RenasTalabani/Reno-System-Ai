import type { FastifyInstance } from 'fastify'
import { partnerRoutes } from './partners.routes.js'

export async function partnerModuleRoutes(app: FastifyInstance) {
  await app.register(partnerRoutes, { prefix: '' })
}
