import type { FastifyInstance } from 'fastify'
import { loyalty2Routes } from './routes.js'

export async function loyalty2ModuleRoutes(app: FastifyInstance) {
  await app.register(loyalty2Routes)
}