import type { FastifyInstance } from 'fastify'
import { csRoutes } from './cs.routes.js'

export async function csModuleRoutes(app: FastifyInstance) {
  await app.register(csRoutes, { prefix: '' })
}
