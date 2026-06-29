import type { FastifyInstance } from 'fastify'
import { reporting3Routes } from './routes.js'
export async function reporting3ModuleRoutes(app: FastifyInstance) { await app.register(reporting3Routes) }
