import type { FastifyInstance } from 'fastify'
import { aiWorkTaskRoutes } from './tasks.routes.js'
import { aiWorkScheduleRoutes } from './schedules.routes.js'

export async function aiWorkRoutes(app: FastifyInstance) {
  await app.register(aiWorkTaskRoutes, { prefix: '/tasks' })
  await app.register(aiWorkScheduleRoutes, { prefix: '/schedules' })
}
