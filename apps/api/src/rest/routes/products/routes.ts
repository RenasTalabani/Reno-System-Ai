import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function productsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalProducts, activeProducts, categories] = await Promise.all([
      prisma.pcProduct.count({ where: { tenantId } }),
      prisma.pcProduct.count({ where: { tenantId, isActive: true } }),
      prisma.pcCategory.count({ where: { tenantId, isActive: true } }),
    ])
    return { success: true, data: { totalProducts, activeProducts, categories } }
  })

  app.get('/categories', async (req) => {
    const { tenantId } = req
    const cats = await prisma.pcCategory.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    return { success: true, data: cats }
  })

  app.post('/categories', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const cat = await prisma.pcCategory.create({ data: { tenantId, ...data } as never })
    return { success: true, data: cat }
  })

  app.get('/', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.categoryId) where.categoryId = q.categoryId
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }
    if (q.active === 'true') where.isActive = true
    const products = await prisma.pcProduct.findMany({
      where: where as never,
      include: { category: { select: { name: true } }, _count: { select: { variants: true } } },
      orderBy: { name: 'asc' },
      take: 100,
    })
    return { success: true, data: products }
  })

  app.post('/', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const product = await prisma.pcProduct.create({ data: { tenantId, ...data } as never })
    return { success: true, data: product }
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const product = await prisma.pcProduct.findUnique({
      where: { id },
      include: { category: true, variants: { where: { isActive: true } } },
    })
    return { success: true, data: product }
  })

  app.patch('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const product = await prisma.pcProduct.update({ where: { id }, data: data as never })
    return { success: true, data: product }
  })

  app.post('/:id/variants', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const variant = await prisma.pcVariant.create({ data: { productId: id, ...data } as never })
    return { success: true, data: variant }
  })
}