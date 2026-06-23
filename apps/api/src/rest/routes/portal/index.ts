import type { FastifyInstance } from 'fastify'
import { portalCoreRoutes } from './core.routes.js'
import { portalEmployeeRoutes } from './employee.routes.js'
import { portalCustomerRoutes } from './customer.routes.js'
import { portalSupplierRoutes } from './supplier.routes.js'
import { portalTicketRoutes } from './tickets.routes.js'
import { portalNotificationRoutes } from './notifications.routes.js'

export async function portalRoutes(app: FastifyInstance) {
  await app.register(portalCoreRoutes, { prefix: '/' })
  await app.register(portalEmployeeRoutes, { prefix: '/employee' })
  await app.register(portalCustomerRoutes, { prefix: '/customer' })
  await app.register(portalSupplierRoutes, { prefix: '/supplier' })
  await app.register(portalTicketRoutes, { prefix: '/tickets' })
  await app.register(portalNotificationRoutes, { prefix: '/notifications' })
}
