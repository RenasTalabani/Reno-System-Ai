import type { FastifyInstance } from 'fastify'
import { sub2Routes } from './routes.js'

export async function sub2ModuleRoutes(app: FastifyInstance) {
  await app.register(sub2Routes)
}
