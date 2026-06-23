import type { FastifyInstance } from 'fastify'
import { finDashboardRoutes } from './dashboard.routes.js'
import { finFiscalYearRoutes } from './fiscal-years.routes.js'
import { finAccountRoutes } from './accounts.routes.js'
import { finCostCenterRoutes } from './cost-centers.routes.js'
import { finJournalEntryRoutes } from './journal-entries.routes.js'
import { finBankAccountRoutes } from './bank-accounts.routes.js'
import { finVendorRoutes } from './vendors.routes.js'
import { finVendorBillRoutes } from './vendor-bills.routes.js'
import { finBudgetRoutes } from './budgets.routes.js'
import { finReportsRoutes } from './reports.routes.js'

export async function financeRoutes(app: FastifyInstance) {
  await app.register(finDashboardRoutes, { prefix: '/dashboard' })
  await app.register(finFiscalYearRoutes, { prefix: '/fiscal-years' })
  await app.register(finAccountRoutes, { prefix: '/accounts' })
  await app.register(finCostCenterRoutes, { prefix: '/cost-centers' })
  await app.register(finJournalEntryRoutes, { prefix: '/journal-entries' })
  await app.register(finBankAccountRoutes, { prefix: '/bank-accounts' })
  await app.register(finVendorRoutes, { prefix: '/vendors' })
  await app.register(finVendorBillRoutes, { prefix: '/vendor-bills' })
  await app.register(finBudgetRoutes, { prefix: '/budgets' })
  await app.register(finReportsRoutes, { prefix: '/reports' })
}
