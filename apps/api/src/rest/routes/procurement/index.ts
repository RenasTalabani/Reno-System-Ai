import type { FastifyInstance } from 'fastify'
import { procDashboardRoutes } from './dashboard.routes.js'
import { procSupplierRoutes } from './suppliers.routes.js'
import { procRequisitionRoutes } from './requisitions.routes.js'
import { procRfqRoutes } from './rfqs.routes.js'
import { procQuotationRoutes } from './quotations.routes.js'
import { procOrderRoutes } from './orders.routes.js'

export async function procurementRoutes(app: FastifyInstance) {
  await app.register(procDashboardRoutes, { prefix: '/dashboard' })
  await app.register(procSupplierRoutes, { prefix: '/suppliers' })
  await app.register(procRequisitionRoutes, { prefix: '/requisitions' })
  await app.register(procRfqRoutes, { prefix: '/rfqs' })
  await app.register(procQuotationRoutes, { prefix: '/quotations' })
  await app.register(procOrderRoutes, { prefix: '/orders' })
}
