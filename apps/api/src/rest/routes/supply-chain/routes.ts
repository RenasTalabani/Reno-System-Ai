import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function scmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/suppliers', async (req) => {
    const { tenantId } = req
    const suppliers = await prisma.scmSupplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } })
    return { success: true, data: suppliers }
  })

  app.post('/suppliers', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const supplier = await prisma.scmSupplier.create({ data: { tenantId, ...data } as never })
    return { success: true, data: supplier }
  })

  app.get('/purchase-orders', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const orders = await prisma.scmPurchaseOrder.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}) },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return { success: true, data: orders }
  })

  app.post('/purchase-orders', async (req) => {
    const { tenantId } = req
    const { items, ...rest } = req.body as Record<string, unknown>
    const po = await prisma.scmPurchaseOrder.create({
      data: { tenantId, ...rest, items: { create: (items as unknown[]) ?? [] } } as never,
      include: { items: true },
    })
    return { success: true, data: po }
  })

  app.patch('/purchase-orders/:id/status', async (req) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const po = await prisma.scmPurchaseOrder.update({ where: { id }, data: { status } })
    return { success: true, data: po }
  })

  app.get('/receipts', async (req) => {
    const { tenantId } = req
    const receipts = await prisma.scmReceipt.findMany({ where: { tenantId }, include: { lines: true, po: true }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: receipts }
  })

  app.post('/receipts', async (req) => {
    const { tenantId } = req
    const { lines, ...rest } = req.body as Record<string, unknown>
    const receipt = await prisma.scmReceipt.create({
      data: { tenantId, ...rest, lines: { create: (lines as unknown[]) ?? [] } } as never,
      include: { lines: true },
    })
    return { success: true, data: receipt }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [suppliers, openPOs, pendingReceipts] = await Promise.all([
      prisma.scmSupplier.count({ where: { tenantId, isActive: true } }),
      prisma.scmPurchaseOrder.count({ where: { tenantId, status: { in: ['pending', 'approved'] } } }),
      prisma.scmReceipt.count({ where: { tenantId, status: 'draft' } }),
    ])
    return { success: true, data: { suppliers, openPOs, pendingReceipts } }
  })
}


