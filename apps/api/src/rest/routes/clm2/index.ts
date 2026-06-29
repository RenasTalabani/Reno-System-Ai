import type { FastifyInstance } from 'fastify'
import { clm2Routes } from './routes.js'

export async function clm2ModuleRoutes(app: FastifyInstance) {
  await app.register(clm2Routes)
}