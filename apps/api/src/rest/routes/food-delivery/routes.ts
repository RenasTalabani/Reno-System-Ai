import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function foodDeliveryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalRestaurants, openRestaurants, todayOrders] = await Promise.all([
      prisma.fdlRestaurant.count({ where: { tenantId } }),
      prisma.fdlRestaurant.count({ where: { tenantId, isOpen: true } }),
      prisma.fdlOrder.count({ where: { tenantId, placedAt: { gte: new Date(new Date().toDateString()) } } }),
    ])
    return { success: true, data: { totalRestaurants, openRestaurants, todayOrders } }
  })

  app.get('/restaurants', async (req) => {
    const { tenantId } = req
    const restaurants = await prisma.fdlRestaurant.findMany({
      where: { tenantId },
      include: { _count: { select: { menuItems: true, orders: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: restaurants }
  })

  app.post('/restaurants', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const restaurant = await prisma.fdlRestaurant.create({ data: { tenantId, ...data } as never })
    return { success: true, data: restaurant }
  })

  app.post('/restaurants/:id/menu', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const item = await prisma.fdlMenuItem.create({ data: { restaurantId: id, ...data } as never })
    return { success: true, data: item }
  })

  app.get('/restaurants/:id/menu', async (req) => {
    const { id } = req.params as { id: string }
    const items = await prisma.fdlMenuItem.findMany({ where: { restaurantId: id, isAvailable: true }, orderBy: { name: 'asc' } })
    return { success: true, data: items }
  })

  app.post('/orders', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const orderRef = `ORD-${Date.now().toString(36).toUpperCase()}`
    const order = await prisma.fdlOrder.create({ data: { tenantId, orderRef, ...data } as never })
    return { success: true, data: order }
  })

  app.patch('/orders/:id/status', async (req) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const order = await prisma.fdlOrder.update({ where: { id }, data: { status } })
    return { success: true, data: order }
  })
}
