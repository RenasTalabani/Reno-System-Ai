import type { FastifyInstance } from 'fastify'
import { lmsRoutes } from './lms.routes.js'

export async function lmsModuleRoutes(app: FastifyInstance) {
  await app.register(lmsRoutes, { prefix: '' })
}
