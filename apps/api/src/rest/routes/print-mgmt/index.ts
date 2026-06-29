import type { FastifyInstance } from 'fastify'
import { printMgmtRoutes } from './routes.js'
export async function printMgmtModuleRoutes(app: FastifyInstance) { await app.register(printMgmtRoutes) }
