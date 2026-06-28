import type { FastifyInstance } from 'fastify'
import { forecastingRoutes } from './forecasting.routes.js'

export async function forecastModuleRoutes(app: FastifyInstance) {
  await app.register(forecastingRoutes, { prefix: '' })
}
