import type { FastifyInstance } from 'fastify'
import { mkiRoutes } from './routes.js'

export async function mkiModuleRoutes(app: FastifyInstance) {
  await app.register(mkiRoutes, { prefix: '/mki' })
}
