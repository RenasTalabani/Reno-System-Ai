import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

const STATUSES = ['unknown', 'running', 'degraded', 'stopped', 'provisioning']
const POD_PHASES = ['Pending', 'Running', 'Succeeded', 'Failed', 'Unknown']
const PROVIDERS = ['kubernetes', 'eks', 'gke', 'aks', 'k3s', 'rke', 'openshift']

export async function kubernetesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async (_req, rep) => {
    return rep.send({ providers: PROVIDERS, statuses: STATUSES, podPhases: POD_PHASES, strategies: ['RollingUpdate', 'Recreate'], serviceTypes: ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'] })
  })

  // T2: create cluster
  app.post('/clusters', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const cluster = await prisma.k8sCluster.create({
      data: { tenantId, createdBy: userId, name: body.name, description: body.description, provider: body.provider ?? 'kubernetes', region: body.region, apiEndpoint: body.apiEndpoint, kubeVersion: body.kubeVersion ?? '1.29.0', status: 'provisioning', nodeCount: body.nodeCount ?? 3, cpuCapacity: body.cpuCapacity, memCapacity: body.memCapacity }
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'kubernetes', entityType: 'K8sCluster', entityId: cluster.id, newValues: { name: body.name } as never } }).catch(() => null)
    return rep.status(201).send(cluster)
  })

  // T3: list clusters
  app.get('/clusters', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const clusters = await prisma.k8sCluster.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { namespaces: true, deployments: true, pods: true } } }
    })
    return rep.send({ clusters, total: clusters.length })
  })

  // T4: get cluster
  app.get('/clusters/:cid', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId }, include: { _count: { select: { namespaces: true, deployments: true, pods: true, services: true } } } })
    if (!cluster) return rep.status(404).send({ error: 'Not found' })
    return rep.send(cluster)
  })

  // T5: update cluster (simulate status update / provision complete)
  app.patch('/clusters/:cid', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid } = req.params as any
    const body = req.body as any
    const exists = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    const data: any = {}
    if (body.status) data.status = body.status
    if (body.nodeCount) data.nodeCount = body.nodeCount
    if (body.kubeVersion) data.kubeVersion = body.kubeVersion
    if (body.isActive !== undefined) data.isActive = body.isActive
    const cluster = await prisma.k8sCluster.update({ where: { id: cid }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'kubernetes', entityType: 'K8sCluster', entityId: cid, newValues: data as never } }).catch(() => null)
    return rep.send(cluster)
  })

  // T6: create namespace
  app.post('/clusters/:cid/namespaces', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const body = req.body as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Cluster not found' })
    const ns = await prisma.k8sNamespace.create({
      data: { tenantId, clusterId: cid, name: body.name, labels: (body.labels ?? {}) as never, annotations: (body.annotations ?? {}) as never }
    })
    return rep.status(201).send(ns)
  })

  // T7: list namespaces
  app.get('/clusters/:cid/namespaces', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const namespaces = await prisma.k8sNamespace.findMany({ where: { clusterId: cid, tenantId } })
    return rep.send({ namespaces, total: namespaces.length })
  })

  // T8: create deployment
  app.post('/clusters/:cid/deployments', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid } = req.params as any
    const body = req.body as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Cluster not found' })
    const deployment = await prisma.k8sDeployment.create({
      data: { tenantId, clusterId: cid, createdBy: userId, namespace: body.namespace ?? 'default', name: body.name, image: body.image, replicas: body.replicas ?? 1, strategy: body.strategy ?? 'RollingUpdate', status: 'pending', labels: (body.labels ?? {}) as never, envVars: (body.envVars ?? {}) as never, resources: (body.resources ?? {}) as never, healthCheck: (body.healthCheck ?? {}) as never }
    })
    // Simulate pod creation
    const podNames = Array.from({ length: body.replicas ?? 1 }, (_, i) => body.name + '-pod-' + i)
    await prisma.k8sPod.createMany({
      data: podNames.map(podName => ({ tenantId, clusterId: cid, deploymentId: deployment.id, namespace: body.namespace ?? 'default', name: podName, phase: 'Running', status: 'running', cpuUsage: '100m', memUsage: '128Mi', startedAt: new Date() }))
    })
    await prisma.k8sDeployment.update({ where: { id: deployment.id }, data: { status: 'running', readyReplicas: body.replicas ?? 1, lastRolloutAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DEPLOY', module: 'kubernetes', entityType: 'K8sDeployment', entityId: deployment.id, newValues: { name: body.name, image: body.image } as never } }).catch(() => null)
    return rep.status(201).send({ ...deployment, status: 'running', readyReplicas: body.replicas ?? 1 })
  })

  // T9: list deployments
  app.get('/clusters/:cid/deployments', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { namespace } = req.query as any
    const where: any = { clusterId: cid, tenantId }
    if (namespace) where.namespace = namespace
    const deployments = await prisma.k8sDeployment.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { pods: true } } } })
    return rep.send({ deployments, total: deployments.length })
  })

  // T10: scale deployment
  app.post('/clusters/:cid/deployments/:did/scale', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid, did } = req.params as any
    const body = req.body as any
    const dep = await prisma.k8sDeployment.findFirst({ where: { id: did, clusterId: cid, tenantId } })
    if (!dep) return rep.status(404).send({ error: 'Not found' })
    const newReplicas = body.replicas
    await prisma.k8sDeployment.update({ where: { id: did }, data: { replicas: newReplicas, readyReplicas: newReplicas, lastRolloutAt: new Date() } })
    await prisma.k8sEvent.create({ data: { tenantId, clusterId: cid, namespace: dep.namespace, eventType: 'Normal', reason: 'Scaled', message: `Scaled to ${newReplicas} replicas`, objectKind: 'Deployment', objectName: dep.name } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SCALE', module: 'kubernetes', entityType: 'K8sDeployment', entityId: did, newValues: { replicas: newReplicas } as never } }).catch(() => null)
    return rep.send({ success: true, replicas: newReplicas })
  })

  // T11: rollout restart
  app.post('/clusters/:cid/deployments/:did/rollout', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid, did } = req.params as any
    const dep = await prisma.k8sDeployment.findFirst({ where: { id: did, clusterId: cid, tenantId } })
    if (!dep) return rep.status(404).send({ error: 'Not found' })
    await prisma.k8sDeployment.update({ where: { id: did }, data: { lastRolloutAt: new Date() } })
    await prisma.k8sEvent.create({ data: { tenantId, clusterId: cid, namespace: dep.namespace, eventType: 'Normal', reason: 'Rollout', message: 'Rolling restart initiated', objectKind: 'Deployment', objectName: dep.name } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ROLLOUT', module: 'kubernetes', entityType: 'K8sDeployment', entityId: did, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true, rolledOutAt: new Date() })
  })

  // T12: list pods
  app.get('/clusters/:cid/pods', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { namespace } = req.query as any
    const where: any = { clusterId: cid, tenantId }
    if (namespace) where.namespace = namespace
    const pods = await prisma.k8sPod.findMany({ where, orderBy: { createdAt: 'desc' } })
    return rep.send({ pods, total: pods.length })
  })

  // T13: create service
  app.post('/clusters/:cid/services', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const body = req.body as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Not found' })
    const svc = await prisma.k8sService.create({
      data: { tenantId, clusterId: cid, namespace: body.namespace ?? 'default', name: body.name, serviceType: body.serviceType ?? 'ClusterIP', clusterIp: body.clusterIp ?? '10.100.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255), ports: (body.ports ?? []) as never, selector: (body.selector ?? {}) as never }
    })
    return rep.status(201).send(svc)
  })

  // T14: list services
  app.get('/clusters/:cid/services', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const services = await prisma.k8sService.findMany({ where: { clusterId: cid, tenantId } })
    return rep.send({ services, total: services.length })
  })

  // T15: list events
  app.get('/clusters/:cid/events', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const events = await prisma.k8sEvent.findMany({ where: { clusterId: cid, tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return rep.send({ events, total: events.length })
  })

  // T16: get cluster health
  app.get('/clusters/:cid/health', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Not found' })
    const [totalPods, runningPods, failedPods, deployments] = await Promise.all([
      prisma.k8sPod.count({ where: { clusterId: cid, tenantId } }),
      prisma.k8sPod.count({ where: { clusterId: cid, tenantId, phase: 'Running' } }),
      prisma.k8sPod.count({ where: { clusterId: cid, tenantId, phase: 'Failed' } }),
      prisma.k8sDeployment.count({ where: { clusterId: cid, tenantId } }),
    ])
    const health = failedPods > 0 ? 'degraded' : runningPods === totalPods && totalPods > 0 ? 'healthy' : 'unknown'
    return rep.send({ clusterId: cid, health, totalPods, runningPods, failedPods, deployments, nodeCount: cluster.nodeCount })
  })

  // T17: delete deployment
  app.delete('/clusters/:cid/deployments/:did', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid, did } = req.params as any
    const dep = await prisma.k8sDeployment.findFirst({ where: { id: did, clusterId: cid, tenantId } })
    if (!dep) return rep.status(404).send({ error: 'Not found' })
    await prisma.k8sDeployment.delete({ where: { id: did } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'kubernetes', entityType: 'K8sDeployment', entityId: did, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true })
  })

  // T18: delete namespace
  app.delete('/clusters/:cid/namespaces/:nsId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { nsId } = req.params as any
    const ns = await prisma.k8sNamespace.findFirst({ where: { id: nsId, tenantId } })
    if (!ns) return rep.status(404).send({ error: 'Not found' })
    await prisma.k8sNamespace.delete({ where: { id: nsId } })
    return rep.send({ success: true })
  })

  // T19: delete service
  app.delete('/clusters/:cid/services/:svcId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { svcId } = req.params as any
    const svc = await prisma.k8sService.findFirst({ where: { id: svcId, tenantId } })
    if (!svc) return rep.status(404).send({ error: 'Not found' })
    await prisma.k8sService.delete({ where: { id: svcId } })
    return rep.send({ success: true })
  })

  // T20: simulate pod logs
  app.get('/clusters/:cid/pods/:podId/logs', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid, podId } = req.params as any
    const pod = await prisma.k8sPod.findFirst({ where: { id: podId, clusterId: cid, tenantId } })
    if (!pod) return rep.status(404).send({ error: 'Not found' })
    const fakeLogs = [
      `${new Date().toISOString()} INFO  Server starting on port 8080`,
      `${new Date().toISOString()} INFO  Connected to database`,
      `${new Date().toISOString()} INFO  Health check: OK`,
      `${new Date().toISOString()} INFO  Ready to serve traffic`,
    ]
    return rep.send({ podId, logs: fakeLogs, lines: fakeLogs.length })
  })

  // T21: simulate pod exec
  app.post('/clusters/:cid/pods/:podId/exec', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid, podId } = req.params as any
    const body = req.body as any
    const pod = await prisma.k8sPod.findFirst({ where: { id: podId, clusterId: cid, tenantId } })
    if (!pod) return rep.status(404).send({ error: 'Not found' })
    return rep.send({ stdout: `Simulated output of: ${body.command ?? 'echo hello'}`, stderr: '', exitCode: 0 })
  })

  // T22: get deployment details
  app.get('/clusters/:cid/deployments/:did', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid, did } = req.params as any
    const dep = await prisma.k8sDeployment.findFirst({ where: { id: did, clusterId: cid, tenantId }, include: { pods: true } })
    if (!dep) return rep.status(404).send({ error: 'Not found' })
    return rep.send(dep)
  })

  // T23: cluster overview / dashboard
  app.get('/clusters/:cid/overview', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Not found' })
    const [pods, deployments, services, namespaces, events] = await Promise.all([
      prisma.k8sPod.count({ where: { clusterId: cid, tenantId } }),
      prisma.k8sDeployment.count({ where: { clusterId: cid, tenantId } }),
      prisma.k8sService.count({ where: { clusterId: cid, tenantId } }),
      prisma.k8sNamespace.count({ where: { clusterId: cid, tenantId } }),
      prisma.k8sEvent.count({ where: { clusterId: cid, tenantId } }),
    ])
    return rep.send({ cluster, pods, deployments, services, namespaces, events })
  })

  // T24: overall stats
  app.get('/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [clusters, deployments, pods, services] = await Promise.all([
      prisma.k8sCluster.count({ where: { tenantId } }),
      prisma.k8sDeployment.count({ where: { tenantId } }),
      prisma.k8sPod.count({ where: { tenantId } }),
      prisma.k8sService.count({ where: { tenantId } }),
    ])
    const running = await prisma.k8sPod.count({ where: { tenantId, phase: 'Running' } })
    return rep.send({ clusters, deployments, pods, services, runningPods: running })
  })

  // T25: update image (rolling update)
  app.post('/clusters/:cid/deployments/:did/update-image', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid, did } = req.params as any
    const body = req.body as any
    const dep = await prisma.k8sDeployment.findFirst({ where: { id: did, clusterId: cid, tenantId } })
    if (!dep) return rep.status(404).send({ error: 'Not found' })
    await prisma.k8sDeployment.update({ where: { id: did }, data: { image: body.image, lastRolloutAt: new Date() } })
    await prisma.k8sEvent.create({ data: { tenantId, clusterId: cid, namespace: dep.namespace, eventType: 'Normal', reason: 'ImageUpdated', message: `Updated image to ${body.image}`, objectKind: 'Deployment', objectName: dep.name } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE_IMAGE', module: 'kubernetes', entityType: 'K8sDeployment', entityId: did, newValues: { image: body.image } as never } }).catch(() => null)
    return rep.send({ success: true, newImage: body.image })
  })

  // T26: simulate node metrics
  app.get('/clusters/:cid/nodes', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Not found' })
    const nodes = Array.from({ length: cluster.nodeCount }, (_, i) => ({
      name: `node-${i + 1}`,
      status: 'Ready',
      cpu: Math.floor(Math.random() * 60) + 20 + '%',
      memory: Math.floor(Math.random() * 50) + 30 + '%',
      pods: Math.floor(Math.random() * 20) + 5,
      kubeletVersion: cluster.kubeVersion,
    }))
    return rep.send({ nodes, count: nodes.length })
  })

  // T27: delete cluster
  app.delete('/clusters/:cid', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { cid } = req.params as any
    const exists = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    await prisma.k8sCluster.delete({ where: { id: cid } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'kubernetes', entityType: 'K8sCluster', entityId: cid, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true })
  })

  // T28: create cluster event manually
  app.post('/clusters/:cid/events', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const body = req.body as any
    const cluster = await prisma.k8sCluster.findFirst({ where: { id: cid, tenantId } })
    if (!cluster) return rep.status(404).send({ error: 'Not found' })
    const event = await prisma.k8sEvent.create({
      data: { tenantId, clusterId: cid, namespace: body.namespace, eventType: body.eventType ?? 'Normal', reason: body.reason ?? 'ManualEvent', message: body.message ?? 'Event created', objectKind: body.objectKind ?? 'Cluster', objectName: body.objectName ?? cluster.name }
    })
    return rep.status(201).send(event)
  })
}
