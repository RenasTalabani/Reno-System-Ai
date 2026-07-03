import { FastifyInstance } from 'fastify'
import { siemRoutes } from './routes.js'

export async function siemModuleRoutes(app: FastifyInstance) {
  await app.register(siemRoutes, { prefix: '/siem' })
}
