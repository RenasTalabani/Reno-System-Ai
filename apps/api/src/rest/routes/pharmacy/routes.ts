import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function pharmacyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalDrugs, lowStock, pendingPrescriptions] = await Promise.all([
      prisma.phxDrug.count({ where: { tenantId } }),
      prisma.phxDrug.count({ where: { tenantId, stock: { lte: prisma.phxDrug.fields.reorderLevel as never } } }).catch(() => 0),
      prisma.phxPrescription.count({ where: { tenantId, status: 'pending' } }),
    ])
    return { success: true, data: { totalDrugs, lowStock, pendingPrescriptions } }
  })

  app.get('/drugs', async (req) => {
    const { tenantId } = req
    const drugs = await prisma.phxDrug.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      take: 100,
    })
    return { success: true, data: drugs }
  })

  app.post('/drugs', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const drug = await prisma.phxDrug.create({ data: { tenantId, ...data } as never })
    return { success: true, data: drug }
  })

  app.get('/drugs/low-stock', async (req) => {
    const { tenantId } = req
    const drugs = await prisma.phxDrug.findMany({ where: { tenantId } })
    const lowStock = drugs.filter(d => d.stock <= d.reorderLevel)
    return { success: true, data: lowStock }
  })

  app.post('/prescriptions', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const rx = await prisma.phxPrescription.create({ data: { tenantId, ...data } as never })
    return { success: true, data: rx }
  })

  app.patch('/prescriptions/:id/dispense', async (req) => {
    const { id } = req.params as { id: string }
    const rx = await prisma.phxPrescription.update({ where: { id }, data: { status: 'dispensed', dispensedAt: new Date() } })
    await prisma.phxDrug.update({ where: { id: rx.drugId }, data: { stock: { decrement: rx.quantity } } })
    return { success: true, data: rx }
  })
}
