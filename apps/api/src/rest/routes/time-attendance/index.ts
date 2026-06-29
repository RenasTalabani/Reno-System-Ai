import type { FastifyInstance } from 'fastify'
import { timeAttendanceRoutes } from './routes.js'

export async function timeAttendanceModuleRoutes(app: FastifyInstance) {
  await app.register(timeAttendanceRoutes)
}