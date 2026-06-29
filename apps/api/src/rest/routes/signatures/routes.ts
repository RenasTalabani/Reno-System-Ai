import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { randomBytes } from 'crypto'

export async function signaturesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/requests', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const requests = await prisma.sigRequest.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}) },
      include: { signers: true },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: requests }
  })

  app.post('/requests', async (req) => {
    const { tenantId, userId } = req
    const { signers, ...rest } = req.body as { signers: { name: string; email: string; role?: string; order?: number }[]; [k: string]: unknown }
    const request = await prisma.sigRequest.create({
      data: {
        tenantId,
        createdBy: userId,
        ...rest,
        signers: {
          create: signers.map((s, i) => ({
            ...s,
            order: s.order ?? i + 1,
            token: randomBytes(24).toString('hex'),
          })),
        },
      } as never,
      include: { signers: true },
    })
    return { success: true, data: request }
  })

  app.get('/requests/:id', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const request = await prisma.sigRequest.findFirst({
      where: { id, tenantId },
      include: { signers: true },
    })
    return { success: true, data: request }
  })

  app.post('/sign/:token', async (req) => {
    const { token } = req.params as { token: string }
    const ipAddress = req.ip
    const signer = await prisma.sigSigner.update({
      where: { token },
      data: { status: 'signed', signedAt: new Date(), ipAddress },
      include: { request: { include: { signers: true } } },
    })
    const allSigned = signer.request.signers.every(s => s.status === 'signed' || s.id === signer.id)
    if (allSigned) {
      await prisma.sigRequest.update({ where: { id: signer.requestId }, data: { status: 'completed', completedAt: new Date() } })
    }
    return { success: true, data: { signed: true, completed: allSigned } }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, pending, completed] = await Promise.all([
      prisma.sigRequest.count({ where: { tenantId } }),
      prisma.sigRequest.count({ where: { tenantId, status: 'pending' } }),
      prisma.sigRequest.count({ where: { tenantId, status: 'completed' } }),
    ])
    return { success: true, data: { totalRequests: total, pendingRequests: pending, completedRequests: completed } }
  })
}
