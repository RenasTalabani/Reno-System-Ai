import type { FastifyInstance } from 'fastify'
import { aiStudioRoutes } from './routes.js'
export async function aiStudioModuleRoutes(app: FastifyInstance) {
  await app.register(aiStudioRoutes)
}
