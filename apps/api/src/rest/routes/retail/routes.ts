import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function retailRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [stores, activeStores, openRegisters] = await Promise.all([
      prisma.retailStore.count({ where: { tenantId } }),
      prisma.retailStore.count({ where: { tenantId, isActive: true } }),
      prisma.retailRegister.count({ where: { store: { tenantId }, status: 'open' } }),
    ])
    return { success: true, data: { totalStores: stores, activeStores, openRegisters } }
  })

  app.get('/stores', async (req) => {
    const { tenantId } = req
    const stores = await prisma.retailStore.findMany({
      where: { tenantId },
      include: { _count: { select: { registers: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: stores }
  })

  app.post('/stores', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const store = await prisma.retailStore.create({ data: { tenantId, ...data } as never })
    return { success: true, data: store }
  })

  app.patch('/stores/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const store = await prisma.retailStore.update({ where: { id }, data: data as never })
    return { success: true, data: store }
  })

  app.get('/stores/:id/registers', async (req) => {
    const { id } = req.params as { id: string }
    const registers = await prisma.retailRegister.findMany({ where: { storeId: id }, orderBy: { name: 'asc' } })
    return { success: true, data: registers }
  })

  app.post('/stores/:id/registers', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const register = await prisma.retailRegister.create({ data: { storeId: id, ...data } as never })
    return { success: true, data: register }
  })

  app.patch('/registers/:id/open', async (req) => {
    const { id } = req.params as { id: string }
    const { openingBalance } = req.body as { openingBalance: number }
    const register = await prisma.retailRegister.update({ where: { id }, data: { status: 'open', openedAt: new Date(), openingBalance } })
    return { success: true, data: register }
  })

  app.patch('/registers/:id/close', async (req) => {
    const { id } = req.params as { id: string }
    const { closingBalance } = req.body as { closingBalance: number }
    const register = await prisma.retailRegister.update({ where: { id }, data: { status: 'closed', closedAt: new Date(), closingBalance } })
    return { success: true, data: register }
  })
}
