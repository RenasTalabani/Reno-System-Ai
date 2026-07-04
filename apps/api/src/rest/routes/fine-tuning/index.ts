import { FastifyInstance } from 'fastify'
import { fineTuningRoutes } from './routes.js'

export async function fineTuningModuleRoutes(app: FastifyInstance) {
  await app.register(fineTuningRoutes, { prefix: '/fine-tuning' })
}
