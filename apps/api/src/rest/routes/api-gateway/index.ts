import type { FastifyInstance } from 'fastify'
import { apiGatewayRoutes } from './api-gateway.routes.js'

export async function apiGatewayModuleRoutes(app: FastifyInstance) {
  await app.register(apiGatewayRoutes, { prefix: '' })
}
