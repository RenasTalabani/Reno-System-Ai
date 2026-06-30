import type { FastifyInstance } from 'fastify'
import { foodDeliveryRoutes } from './routes.js'
export async function foodDeliveryModuleRoutes(app: FastifyInstance) { await app.register(foodDeliveryRoutes) }
