import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function aiExecKnowledgeRoutes(app: FastifyInstance) {
  // Knowledge nodes
  app.get('/nodes', async (req, reply) => {
    const { tenantId } = req as any
    const { nodeType, limit = 50, offset = 0 } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (nodeType) where.nodeType = nodeType
    const [nodes, total] = await Promise.all([
      prisma.aiKnowledgeNode.findMany({
        where, orderBy: { importance: 'desc' }, take: Number(limit), skip: Number(offset),
        include: { outgoingEdges: { take: 5 }, incomingEdges: { take: 5 } },
      }),
      prisma.aiKnowledgeNode.count({ where }),
    ])
    return reply.send({ success: true, data: nodes, meta: { total } })
  })

  app.post('/nodes', async (req, reply) => {
    const { tenantId } = req as any
    const { nodeType, relatedEntityType, relatedEntityId, label, properties = {}, importance = 0.5 } = req.body as any
    if (!label?.trim()) return reply.status(400).send({ success: false, error: 'Label required' })
    const node = await prisma.aiKnowledgeNode.create({
      data: { tenantId, nodeType, relatedEntityType, relatedEntityId, label, properties, importance },
    })
    return reply.status(201).send({ success: true, data: node })
  })

  app.patch('/nodes/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { label, properties, importance } = req.body as any
    await prisma.aiKnowledgeNode.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { label, properties, importance },
    })
    const updated = await prisma.aiKnowledgeNode.findFirst({ where: { id } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/nodes/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    await prisma.aiKnowledgeNode.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send({ success: true })
  })

  // Knowledge edges
  app.get('/edges', async (req, reply) => {
    const { tenantId } = req as any
    const { nodeId } = req.query as any
    const where: any = { tenantId }
    if (nodeId) where.OR = [{ fromNodeId: nodeId }, { toNodeId: nodeId }]
    const edges = await prisma.aiKnowledgeEdge.findMany({ where, orderBy: { weight: 'desc' }, take: 100 })
    return reply.send({ success: true, data: edges })
  })

  app.post('/edges', async (req, reply) => {
    const { tenantId } = req as any
    const { fromNodeId, toNodeId, relationship, weight = 1.0, metadata = {} } = req.body as any

    if (!fromNodeId || !toNodeId || !relationship) return reply.status(400).send({ success: false, error: 'fromNodeId, toNodeId, relationship required' })

    const existing = await prisma.aiKnowledgeEdge.findFirst({
      where: { fromNodeId, toNodeId, relationship },
    })
    if (existing) return reply.send({ success: true, data: existing })

    const edge = await prisma.aiKnowledgeEdge.create({
      data: { tenantId, fromNodeId, toNodeId, relationship, weight, metadata },
    })
    return reply.status(201).send({ success: true, data: edge })
  })

  app.delete('/edges/:id', async (req, reply) => {
    const { id } = req.params as any
    await prisma.aiKnowledgeEdge.delete({ where: { id } }).catch(() => null)
    return reply.send({ success: true })
  })

  // Get full graph (nodes + edges) for visualization
  app.get('/graph', async (req, reply) => {
    const { tenantId } = req as any
    const [nodes, edges] = await Promise.all([
      prisma.aiKnowledgeNode.findMany({ where: { tenantId, deletedAt: null }, orderBy: { importance: 'desc' }, take: 200 }),
      prisma.aiKnowledgeEdge.findMany({ where: { tenantId }, take: 500 }),
    ])
    return reply.send({ success: true, data: { nodes, edges, nodeCount: nodes.length, edgeCount: edges.length } })
  })
}
