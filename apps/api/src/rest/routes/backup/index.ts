import type { FastifyInstance } from 'fastify'
import { backupJobRoutes } from './jobs.routes.js'
import { backupSnapshotRoutes } from './snapshots.routes.js'
import { backupScheduleRoutes } from './schedules.routes.js'
import { backupRestoreRoutes } from './restore.routes.js'

export async function backupRoutes(app: FastifyInstance) {
  await app.register(backupJobRoutes, { prefix: '/jobs' })
  await app.register(backupSnapshotRoutes, { prefix: '/snapshots' })
  await app.register(backupScheduleRoutes, { prefix: '/schedules' })
  await app.register(backupRestoreRoutes, { prefix: '/restore' })
}
