import type { FastifyInstance } from 'fastify'
import { ppmRoutes } from './routes.js'
export async function ppmModuleRoutes(app: FastifyInstance) {
  await app.register(ppmRoutes)
}
