import type { FastifyInstance } from 'fastify'
import { hrEmployeeRoutes } from './employees.routes.js'
import { hrAttendanceRoutes } from './attendance.routes.js'
import { hrLeaveRoutes } from './leave.routes.js'
import { hrShiftRoutes } from './shifts.routes.js'
import { hrPayrollRoutes } from './payroll.routes.js'
import { hrDocumentRoutes } from './documents.routes.js'
import { hrHolidayRoutes } from './holidays.routes.js'
import { hrJobPositionRoutes } from './job-positions.routes.js'
import { hrDashboardRoutes } from './dashboard.routes.js'

export async function hrRoutes(app: FastifyInstance) {
  await app.register(hrDashboardRoutes, { prefix: '/dashboard' })
  await app.register(hrEmployeeRoutes, { prefix: '/employees' })
  await app.register(hrAttendanceRoutes, { prefix: '/attendance' })
  await app.register(hrLeaveRoutes, { prefix: '/leave' })
  await app.register(hrShiftRoutes, { prefix: '/shifts' })
  await app.register(hrPayrollRoutes, { prefix: '/payroll' })
  await app.register(hrDocumentRoutes, { prefix: '/documents' })
  await app.register(hrHolidayRoutes, { prefix: '/holidays' })
  await app.register(hrJobPositionRoutes, { prefix: '/positions' })
}
