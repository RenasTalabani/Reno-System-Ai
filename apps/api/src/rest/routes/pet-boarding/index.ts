import type { FastifyInstance } from 'fastify'
import { petBoardingRoutes } from './routes.js'
export async function petBoardingModuleRoutes(app: FastifyInstance) { await app.register(petBoardingRoutes) }
