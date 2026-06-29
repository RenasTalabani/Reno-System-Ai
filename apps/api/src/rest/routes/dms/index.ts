import type { FastifyInstance } from 'fastify'
import { dmsRoutes } from './routes.js'

export async function dmsModuleRoutes(app: FastifyInstance) {
  await app.register(dmsRoutes)
}
