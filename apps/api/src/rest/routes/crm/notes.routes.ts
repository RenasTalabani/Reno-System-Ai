import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmNoteRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { contactId, companyId, opportunityId } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId
    if (opportunityId) where.opportunityId = opportunityId
    const notes = await prisma.crmNote.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })
    return reply.send({ success: true, data: notes })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const note = await prisma.crmNote.create({
      data: {
        tenantId,
        contactId: body.contactId,
        companyId: body.companyId,
        opportunityId: body.opportunityId,
        authorId: userId,
        content: body.content,
        isPinned: body.isPinned ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: note })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const { content, isPinned } = req.body as any
    await prisma.crmNote.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { content, isPinned, updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmNote.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}
