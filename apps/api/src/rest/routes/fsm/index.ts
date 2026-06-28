import type { FastifyInstance } from 'fastify'
import { fsmRoutes } from './fsm.routes.js'

export async function fsmModuleRoutes(app: FastifyInstance) {
  await app.register(fsmRoutes, { prefix: '' })
}
