import type { FastifyInstance } from 'fastify'
import { apiGatewayRoutes } from './routes.js'

export async function apiGatewayModuleRoutes(app: FastifyInstance) {
  await app.register(apiGatewayRoutes, { prefix: '/api-gateway' })
}
