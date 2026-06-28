import type { FastifyInstance } from 'fastify'
import { assetRoutes } from './assets.routes.js'

export async function assetModuleRoutes(app: FastifyInstance) {
  await app.register(assetRoutes, { prefix: '' })
}
