import type { FastifyInstance } from 'fastify'
import { kubernetesRoutes } from './routes.js'

export async function kubernetesModuleRoutes(app: FastifyInstance) {
  await app.register(kubernetesRoutes, { prefix: '/kubernetes' })
}
