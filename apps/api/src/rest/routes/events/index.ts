import type { FastifyInstance } from 'fastify'
import { sseRoutes } from './sse.routes.js'

export async function realtimeRoutes(app: FastifyInstance) {
  await app.register(sseRoutes, { prefix: '' })
}
