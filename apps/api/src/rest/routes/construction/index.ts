import type { FastifyInstance } from 'fastify'
import { constructionRoutes } from './routes.js'
export async function constructionModuleRoutes(app: FastifyInstance) { await app.register(constructionRoutes) }
