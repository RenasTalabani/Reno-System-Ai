import type { FastifyInstance } from 'fastify'
import { educationAdminRoutes } from './routes.js'
export async function educationAdminModuleRoutes(app: FastifyInstance) { await app.register(educationAdminRoutes) }
