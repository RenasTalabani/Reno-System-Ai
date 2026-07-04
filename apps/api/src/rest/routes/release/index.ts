import { FastifyInstance } from 'fastify'
import { releaseRoutes } from './routes.js'

export async function releaseModuleRoutes(app: FastifyInstance) {
  await app.register(releaseRoutes, { prefix: '/release' })
}
