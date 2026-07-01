import type { FastifyInstance } from 'fastify'
import { autonomousRoutes } from './routes.js'

export async function aiAutonomousModuleRoutes(app: FastifyInstance) {
  await app.register(autonomousRoutes, { prefix: '/ai-autonomous' })
}
