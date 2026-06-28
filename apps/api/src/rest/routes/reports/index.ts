import type { FastifyInstance } from 'fastify'
import { reportsRoutes } from './reports.routes.js'

export async function reportBuilderRoutes(app: FastifyInstance) {
  await app.register(reportsRoutes, { prefix: '' })
}
