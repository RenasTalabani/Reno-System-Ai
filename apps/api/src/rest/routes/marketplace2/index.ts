import type { FastifyInstance } from 'fastify'
import { marketplace2Routes } from './routes.js'

export async function marketplace2ModuleRoutes(app: FastifyInstance) {
  await app.register(marketplace2Routes)
}