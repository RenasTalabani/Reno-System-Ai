import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function queueClusterRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    engines: ['rabbitmq', 'kafka', 'redis-streams', 'nats', 'sqs-compatible'],
    queueTypes: ['classic', 'quorum', 'stream', 'priority', 'delayed'],
    haModes: ['mirrored', 'quorum', 'single'],
    nodeRoles: ['leader', 'follower'],
    severities: ['info', 'warning', 'critical'],
  }))

  // T2: create cluster (auto-creates nodes with leader election)
  app.post('/clusters', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, engine = 'rabbitmq', nodeCount = 3, version = '3.13', haMode = 'mirrored', metadata } = req.body as any
    const cluster = await prisma.qcCluster.create({
      data: { tenantId: r.tenantId, name, engine, nodeCount, version, haMode, status: 'running', metadata: metadata as never },
    })
    for (let i = 0; i < Math.min(nodeCount, 9); i++) {
      await prisma.qcNode.create({
        data: { tenantId: r.tenantId, clusterId: cluster.id, name: `${name}-node-${i}`, role: i === 0 ? 'leader' : 'follower', status: 'running', cpuUsage: Math.random() * 30, memUsage: Math.random() * 40, diskUsage: Math.random() * 20 },
      })
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'queue-cluster', entityType: 'QcCluster', entityId: cluster.id, newValues: { name, engine } as never } as never }).catch(() => null)
    return cluster
  })

  // T3: list clusters
  app.get('/clusters', async (req) => {
    const r = req as unknown as { tenantId: string }
    const clusters = await prisma.qcCluster.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { nodes: true, queues: true, alerts: true } } } })
    return { clusters, total: clusters.length }
  })

  // T4: get cluster
  app.get('/clusters/:cid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    return prisma.qcCluster.findFirstOrThrow({ where: { id: cid, tenantId: r.tenantId }, include: { nodes: true, _count: { select: { queues: true } } } })
  })

  // T5: update cluster
  app.patch('/clusters/:cid', async (req) => {
    const { cid } = req.params as any
    const data = req.body as any
    return prisma.qcCluster.update({ where: { id: cid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T6: list nodes
  app.get('/clusters/:cid/nodes', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const nodes = await prisma.qcNode.findMany({ where: { clusterId: cid, tenantId: r.tenantId }, orderBy: { name: 'asc' } })
    return { nodes, total: nodes.length }
  })

  // T7: simulate node failure (safe — flags node, promotes a follower)
  app.post('/clusters/:cid/nodes/:nid/simulate-failure', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { cid, nid } = req.params as any
    const node = await prisma.qcNode.findUniqueOrThrow({ where: { id: nid } })
    await prisma.qcNode.update({ where: { id: nid }, data: { status: 'failed' } })
    let promoted: string | null = null
    if (node.role === 'leader') {
      const follower = await prisma.qcNode.findFirst({ where: { clusterId: cid, status: 'running', role: 'follower' } })
      if (follower) {
        await prisma.qcNode.update({ where: { id: follower.id }, data: { role: 'leader' } })
        await prisma.qcNode.update({ where: { id: nid }, data: { role: 'follower' } })
        promoted = follower.id
      }
    }
    await prisma.qcAlert.create({
      data: { tenantId: r.tenantId, clusterId: cid, alertType: 'node-failure', severity: 'critical', message: `Node ${node.name} failed (simulated)${promoted ? '; leader promoted' : ''}` },
    })
    return { success: true, failedNode: nid, promotedNode: promoted }
  })

  // T8: recover node
  app.post('/clusters/:cid/nodes/:nid/recover', async (req) => {
    const { nid } = req.params as any
    await prisma.qcNode.update({ where: { id: nid }, data: { status: 'running' } })
    return { success: true }
  })

  // T9: create queue
  app.post('/clusters/:cid/queues', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { name, queueType = 'classic', durable = true, maxLength, metadata } = req.body as any
    return prisma.qcQueue.create({
      data: { tenantId: r.tenantId, clusterId: cid, name, queueType, durable, maxLength, status: 'active', metadata: metadata as never },
    })
  })

  // T10: list queues
  app.get('/clusters/:cid/queues', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const queues = await prisma.qcQueue.findMany({ where: { clusterId: cid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { queues, total: queues.length }
  })

  // T11: publish message
  app.post('/clusters/:cid/queues/:qid/publish', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const { payload, priority = 0 } = req.body as any
    const message = await prisma.qcMessage.create({
      data: { tenantId: r.tenantId, queueId: qid, payload: payload as never, priority, status: 'ready' },
    })
    await prisma.qcQueue.update({ where: { id: qid }, data: { messageCount: { increment: 1 } } })
    return message
  })

  // T12: publish batch
  app.post('/clusters/:cid/queues/:qid/publish-batch', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const { messages = [] } = req.body as any
    const created = []
    for (const m of messages.slice(0, 100)) {
      created.push(await prisma.qcMessage.create({
        data: { tenantId: r.tenantId, queueId: qid, payload: m.payload as never, priority: m.priority ?? 0, status: 'ready' },
      }))
    }
    await prisma.qcQueue.update({ where: { id: qid }, data: { messageCount: { increment: created.length } } })
    return { published: created.length }
  })

  // T13: consume messages (delivers up to prefetch)
  app.post('/clusters/:cid/queues/:qid/consume', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const { limit = 10 } = req.body as any
    const messages = await prisma.qcMessage.findMany({
      where: { queueId: qid, tenantId: r.tenantId, status: 'ready' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: Math.min(limit, 50),
    })
    for (const m of messages) {
      await prisma.qcMessage.update({ where: { id: m.id }, data: { status: 'delivered', deliveredAt: new Date(), attempts: { increment: 1 } } })
    }
    return { messages, count: messages.length }
  })

  // T14: ack message
  app.post('/clusters/:cid/queues/:qid/messages/:mid/ack', async (req) => {
    const { qid, mid } = req.params as any
    await prisma.qcMessage.update({ where: { id: mid }, data: { status: 'acked', ackedAt: new Date() } })
    await prisma.qcQueue.update({ where: { id: qid }, data: { messageCount: { decrement: 1 } } })
    return { success: true }
  })

  // T15: nack message (requeue)
  app.post('/clusters/:cid/queues/:qid/messages/:mid/nack', async (req) => {
    const { mid } = req.params as any
    const msg = await prisma.qcMessage.update({ where: { id: mid }, data: { status: 'ready', deliveredAt: null } })
    return { success: true, requeued: true, attempts: msg.attempts }
  })

  // T16: list messages
  app.get('/clusters/:cid/queues/:qid/messages', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const status = (req.query as any).status
    const where: any = { queueId: qid, tenantId: r.tenantId }
    if (status) where.status = status
    const messages = await prisma.qcMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
    return { messages, total: messages.length }
  })

  // T17: create consumer
  app.post('/clusters/:cid/queues/:qid/consumers', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const { name, prefetch = 10, metadata } = req.body as any
    const consumer = await prisma.qcConsumer.create({
      data: { tenantId: r.tenantId, queueId: qid, name, prefetch, status: 'active', metadata: metadata as never },
    })
    await prisma.qcQueue.update({ where: { id: qid }, data: { consumerCount: { increment: 1 } } })
    return consumer
  })

  // T18: list consumers
  app.get('/clusters/:cid/queues/:qid/consumers', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const consumers = await prisma.qcConsumer.findMany({ where: { queueId: qid, tenantId: r.tenantId } })
    return { consumers, total: consumers.length }
  })

  // T19: purge queue
  app.post('/clusters/:cid/queues/:qid/purge', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { qid } = req.params as any
    const result = await prisma.qcMessage.deleteMany({ where: { queueId: qid, tenantId: r.tenantId, status: { in: ['ready', 'delivered'] } } })
    await prisma.qcQueue.update({ where: { id: qid }, data: { messageCount: 0 } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'PURGE', module: 'queue-cluster', entityType: 'QcQueue', entityId: qid, newValues: { purged: result.count } as never } as never }).catch(() => null)
    return { success: true, purged: result.count }
  })

  // T20: cluster health
  app.get('/clusters/:cid/health', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const nodes = await prisma.qcNode.findMany({ where: { clusterId: cid, tenantId: r.tenantId } })
    const running = nodes.filter(n => n.status === 'running').length
    const health = running === nodes.length ? 'healthy' : running > nodes.length / 2 ? 'degraded' : 'critical'
    return { clusterId: cid, health, totalNodes: nodes.length, runningNodes: running, failedNodes: nodes.length - running, hasLeader: nodes.some(n => n.role === 'leader' && n.status === 'running') }
  })

  // T21: list alerts
  app.get('/clusters/:cid/alerts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const alerts = await prisma.qcAlert.findMany({ where: { clusterId: cid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { alerts, total: alerts.length }
  })

  // T22: resolve alert
  app.post('/clusters/:cid/alerts/:aid/resolve', async (req) => {
    const { aid } = req.params as any
    await prisma.qcAlert.update({ where: { id: aid }, data: { isResolved: true, resolvedAt: new Date() } })
    return { success: true }
  })

  // T23: queue depth overview
  app.get('/clusters/:cid/overview', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const queues = await prisma.qcQueue.findMany({ where: { clusterId: cid, tenantId: r.tenantId } })
    const totalMessages = queues.reduce((s, q) => s + q.messageCount, 0)
    const totalConsumers = queues.reduce((s, q) => s + q.consumerCount, 0)
    return { queues: queues.length, totalMessages, totalConsumers, queueDepths: queues.map(q => ({ id: q.id, name: q.name, depth: q.messageCount, consumers: q.consumerCount })) }
  })

  // T24: overall stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [clusters, nodes, queues, messages, consumers, alerts] = await Promise.all([
      prisma.qcCluster.count({ where: { tenantId: r.tenantId } }),
      prisma.qcNode.count({ where: { tenantId: r.tenantId } }),
      prisma.qcQueue.count({ where: { tenantId: r.tenantId } }),
      prisma.qcMessage.count({ where: { tenantId: r.tenantId } }),
      prisma.qcConsumer.count({ where: { tenantId: r.tenantId } }),
      prisma.qcAlert.count({ where: { tenantId: r.tenantId, isResolved: false } }),
    ])
    return { clusters, nodes, queues, messages, consumers, openAlerts: alerts }
  })

  // T25: node metrics refresh (simulation)
  app.post('/clusters/:cid/refresh-metrics', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const nodes = await prisma.qcNode.findMany({ where: { clusterId: cid, tenantId: r.tenantId } })
    for (const n of nodes) {
      await prisma.qcNode.update({ where: { id: n.id }, data: { cpuUsage: Math.random() * 80, memUsage: Math.random() * 70, diskUsage: Math.random() * 60 } })
    }
    return { refreshed: nodes.length }
  })

  // T26: delete consumer
  app.delete('/clusters/:cid/queues/:qid/consumers/:conId', async (req) => {
    const { qid, conId } = req.params as any
    await prisma.qcConsumer.delete({ where: { id: conId } })
    await prisma.qcQueue.update({ where: { id: qid }, data: { consumerCount: { decrement: 1 } } })
    return { success: true }
  })

  // T27: delete queue
  app.delete('/clusters/:cid/queues/:qid', async (req) => {
    const { qid } = req.params as any
    await prisma.qcQueue.delete({ where: { id: qid } })
    return { success: true }
  })

  // T28: delete cluster
  app.delete('/clusters/:cid', async (req) => {
    const { cid } = req.params as any
    await prisma.qcCluster.delete({ where: { id: cid } })
    return { success: true }
  })
}
