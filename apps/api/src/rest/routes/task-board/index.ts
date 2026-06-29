import type { FastifyInstance } from 'fastify'
import { taskBoardRoutes } from './routes.js'

export async function taskBoardModuleRoutes(app: FastifyInstance) {
  await app.register(taskBoardRoutes)
}