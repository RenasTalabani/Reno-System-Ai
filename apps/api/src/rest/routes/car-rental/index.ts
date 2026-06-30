import type { FastifyInstance } from 'fastify'
import { carRentalRoutes } from './routes.js'
export async function carRentalModuleRoutes(app: FastifyInstance) { await app.register(carRentalRoutes) }
