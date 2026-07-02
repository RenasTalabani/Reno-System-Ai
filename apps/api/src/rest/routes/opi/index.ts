import type { FastifyInstance } from 'fastify'
import { opiRoutes } from './routes.js'

export async function opiModuleRoutes(app: FastifyInstance) {
  await app.register(opiRoutes, { prefix: '/opi' })
}
