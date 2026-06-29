import type { FastifyInstance } from 'fastify'
import { invoice2Routes } from './routes.js'

export async function invoice2ModuleRoutes(app: FastifyInstance) {
  await app.register(invoice2Routes)
}