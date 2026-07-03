import { FastifyInstance } from 'fastify'
import { devConsoleRoutes } from './routes.js'

export async function devConsoleModuleRoutes(app: FastifyInstance) {
  await app.register(devConsoleRoutes, { prefix: '/dev-console' })
}
