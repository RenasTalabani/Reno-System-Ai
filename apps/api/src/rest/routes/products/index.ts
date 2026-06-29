import type { FastifyInstance } from 'fastify'
import { productsRoutes } from './routes.js'

export async function productsModuleRoutes(app: FastifyInstance) {
  await app.register(productsRoutes)
}