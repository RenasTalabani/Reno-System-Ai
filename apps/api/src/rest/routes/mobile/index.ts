import type { FastifyInstance } from 'fastify'
import { mobileRoutes } from './mobile.routes.js'

export async function mobileModuleRoutes(app: FastifyInstance) {
  await app.register(mobileRoutes, { prefix: '' })
}
