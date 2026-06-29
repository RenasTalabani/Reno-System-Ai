import type { FastifyInstance } from 'fastify'
import { lms2Routes } from './routes.js'
export async function lms2ModuleRoutes(app: FastifyInstance) { await app.register(lms2Routes) }
