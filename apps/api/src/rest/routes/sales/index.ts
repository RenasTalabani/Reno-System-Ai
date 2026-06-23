import type { FastifyInstance } from 'fastify'
import { salesDashboardRoutes } from './dashboard.routes.js'
import { salesProductRoutes } from './products.routes.js'
import { salesQuotationRoutes } from './quotations.routes.js'
import { salesOrderRoutes } from './orders.routes.js'
import { salesInvoiceRoutes } from './invoices.routes.js'
import { salesPaymentRoutes } from './payments.routes.js'
import { salesSubscriptionRoutes } from './subscriptions.routes.js'
import { salesTaxRoutes } from './taxes.routes.js'
import { salesCurrencyRoutes } from './currencies.routes.js'
import { salesPriceListRoutes } from './price-lists.routes.js'
import { salesDiscountRoutes } from './discounts.routes.js'

export async function salesRoutes(app: FastifyInstance) {
  await app.register(salesDashboardRoutes, { prefix: '/dashboard' })
  await app.register(salesProductRoutes, { prefix: '/products' })
  await app.register(salesQuotationRoutes, { prefix: '/quotations' })
  await app.register(salesOrderRoutes, { prefix: '/orders' })
  await app.register(salesInvoiceRoutes, { prefix: '/invoices' })
  await app.register(salesPaymentRoutes, { prefix: '/payments' })
  await app.register(salesSubscriptionRoutes, { prefix: '/subscriptions' })
  await app.register(salesTaxRoutes, { prefix: '/taxes' })
  await app.register(salesCurrencyRoutes, { prefix: '/currencies' })
  await app.register(salesPriceListRoutes, { prefix: '/price-lists' })
  await app.register(salesDiscountRoutes, { prefix: '/discounts' })
}
