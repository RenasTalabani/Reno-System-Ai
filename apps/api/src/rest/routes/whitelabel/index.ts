import type { FastifyInstance } from 'fastify'
import { whitelabelRoutes } from './whitelabel.routes.js'

export async function wlRoutes(app: FastifyInstance) {
  await app.register(whitelabelRoutes, { prefix: '' })
}
