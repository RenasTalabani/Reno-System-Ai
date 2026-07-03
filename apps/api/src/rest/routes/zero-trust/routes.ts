import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

function riskLevel(score: number): string {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

export async function zeroTrustRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    policyTypes: ['access', 'device', 'network', 'data', 'session'],
    actions: ['allow', 'deny', 'mfa-required', 'step-up'],
    trustLevels: ['unverified', 'basic', 'managed', 'trusted'],
    deviceTypes: ['laptop', 'desktop', 'mobile', 'tablet', 'server'],
    segmentTypes: ['network', 'application', 'data', 'identity'],
    isolationModes: ['strict', 'moderate', 'permissive'],
  }))

  // T2: create policy
  app.post('/policies', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, policyType = 'access', resource, conditions, action = 'allow', priority = 0, metadata } = req.body as any
    const policy = await prisma.ztPolicy.create({
      data: { tenantId: r.tenantId, name, policyType, resource, conditions: conditions as never, action, priority, isActive: true, metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'zero-trust', entityType: 'ZtPolicy', entityId: policy.id, newValues: { name, resource, action } as never } as never }).catch(() => null)
    return policy
  })

  // T3: list policies
  app.get('/policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const policies = await prisma.ztPolicy.findMany({ where: { tenantId: r.tenantId }, orderBy: { priority: 'desc' } })
    return { policies, total: policies.length }
  })

  // T4: update policy
  app.patch('/policies/:pid', async (req) => {
    const { pid } = req.params as any
    const data = req.body as any
    return prisma.ztPolicy.update({ where: { id: pid }, data: { ...data, conditions: data.conditions as never, metadata: data.metadata as never } })
  })

  // T5: register device
  app.post('/devices', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, deviceType = 'laptop', os, fingerprint, metadata } = req.body as any
    return prisma.ztDevice.create({
      data: { tenantId: r.tenantId, userId: r.userId, name, deviceType, os, fingerprint, trustLevel: 'unverified', isCompliant: false, metadata: metadata as never },
    })
  })

  // T6: list devices
  app.get('/devices', async (req) => {
    const r = req as unknown as { tenantId: string }
    const devices = await prisma.ztDevice.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { devices, total: devices.length }
  })

  // T7: device compliance check (simulation)
  app.post('/devices/:did/compliance-check', async (req) => {
    const { did } = req.params as any
    const checks = {
      diskEncryption: Math.random() > 0.2,
      osUpToDate: Math.random() > 0.3,
      antivirusActive: Math.random() > 0.15,
      screenLockEnabled: Math.random() > 0.1,
    }
    const passed = Object.values(checks).filter(Boolean).length
    const isCompliant = passed === 4
    const trustLevel = isCompliant ? 'managed' : passed >= 3 ? 'basic' : 'unverified'
    const device = await prisma.ztDevice.update({
      where: { id: did },
      data: { isCompliant, trustLevel, lastCheckAt: new Date(), metadata: checks as never },
    })
    return { device, checks, passed, isCompliant }
  })

  // T8: promote device trust
  app.post('/devices/:did/trust', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { did } = req.params as any
    const { trustLevel = 'trusted' } = req.body as any
    const device = await prisma.ztDevice.update({ where: { id: did }, data: { trustLevel } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'TRUST_DEVICE', module: 'zero-trust', entityType: 'ZtDevice', entityId: did, newValues: { trustLevel } as never } as never }).catch(() => null)
    return device
  })

  // T9: evaluate access request (core zero-trust decision)
  app.post('/access/evaluate', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { resource, deviceId, context = {} } = req.body as any
    let riskScore = 20
    let device = null
    if (deviceId) {
      device = await prisma.ztDevice.findFirst({ where: { id: deviceId, tenantId: r.tenantId } })
      if (device) {
        if (device.trustLevel === 'trusted') riskScore -= 15
        else if (device.trustLevel === 'managed') riskScore -= 10
        else if (device.trustLevel === 'unverified') riskScore += 30
        if (!device.isCompliant) riskScore += 20
      }
    } else riskScore += 25
    if (context.unusualLocation) riskScore += 20
    if (context.unusualTime) riskScore += 10
    if (context.newIp) riskScore += 10
    riskScore = Math.max(0, Math.min(100, riskScore))

    const policies = await prisma.ztPolicy.findMany({ where: { tenantId: r.tenantId, isActive: true }, orderBy: { priority: 'desc' } })
    let matchedPolicy = null
    for (const p of policies) {
      const regex = new RegExp('^' + p.resource.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
      if (regex.test(resource)) { matchedPolicy = p; break }
    }

    let decision = 'allow'
    let reason = 'default allow, low risk'
    if (matchedPolicy) {
      if (matchedPolicy.action === 'deny') { decision = 'deny'; reason = `policy ${matchedPolicy.name} denies access` }
      else if (matchedPolicy.action === 'mfa-required' || riskScore >= 50) { decision = 'mfa-required'; reason = riskScore >= 50 ? 'elevated risk score' : `policy ${matchedPolicy.name} requires MFA` }
      else { decision = 'allow'; reason = `policy ${matchedPolicy.name} allows` }
    } else if (riskScore >= 75) { decision = 'deny'; reason = 'critical risk score' }
    else if (riskScore >= 50) { decision = 'mfa-required'; reason = 'elevated risk score' }

    const request = await prisma.ztAccessRequest.create({
      data: { tenantId: r.tenantId, userId: r.userId, deviceId: device?.id, policyId: matchedPolicy?.id, resource, decision, riskScore, reason, context: context as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'ZT_EVALUATE', module: 'zero-trust', entityType: 'ZtAccessRequest', entityId: request.id, newValues: { resource, decision, riskScore } as never } as never }).catch(() => null)
    return request
  })

  // T10: list access requests
  app.get('/access/requests', async (req) => {
    const r = req as unknown as { tenantId: string }
    const requests = await prisma.ztAccessRequest.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { requests, total: requests.length }
  })

  // T11: create segment
  app.post('/segments', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, segmentType = 'network', cidr, services, isolation = 'strict', metadata } = req.body as any
    return prisma.ztSegment.create({
      data: { tenantId: r.tenantId, name, segmentType, cidr, services: services as never, isolation, isActive: true, metadata: metadata as never },
    })
  })

  // T12: list segments
  app.get('/segments', async (req) => {
    const r = req as unknown as { tenantId: string }
    const segments = await prisma.ztSegment.findMany({ where: { tenantId: r.tenantId } })
    return { segments, total: segments.length }
  })

  // T13: update segment
  app.patch('/segments/:sid', async (req) => {
    const { sid } = req.params as any
    const data = req.body as any
    return prisma.ztSegment.update({ where: { id: sid }, data: { ...data, services: data.services as never, metadata: data.metadata as never } })
  })

  // T14: score session risk
  app.post('/sessions/score', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sessionRef, factors = {} } = req.body as any
    let score = 10
    if (factors.failedLogins) score += Math.min(30, factors.failedLogins * 10)
    if (factors.impossibleTravel) score += 40
    if (factors.torExit) score += 30
    if (factors.newDevice) score += 15
    if (factors.offHours) score += 10
    score = Math.min(100, score)
    const level = riskLevel(score)
    const action = level === 'critical' ? 'terminate' : level === 'high' ? 'mfa-challenge' : level === 'medium' ? 'monitor' : 'none'
    return prisma.ztSessionRisk.create({
      data: { tenantId: r.tenantId, userId: r.userId, sessionRef, riskScore: score, riskLevel: level, factors: factors as never, action },
    })
  })

  // T15: list session risks
  app.get('/sessions/risks', async (req) => {
    const r = req as unknown as { tenantId: string }
    const risks = await prisma.ztSessionRisk.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { risks, total: risks.length }
  })

  // T16: report violation
  app.post('/violations', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { violationType, severity = 'medium', description, metadata } = req.body as any
    return prisma.ztViolation.create({
      data: { tenantId: r.tenantId, userId: r.userId, violationType, severity, description, metadata: metadata as never },
    })
  })

  // T17: list violations
  app.get('/violations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const violations = await prisma.ztViolation.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { violations, total: violations.length }
  })

  // T18: resolve violation
  app.post('/violations/:vid/resolve', async (req) => {
    const { vid } = req.params as any
    await prisma.ztViolation.update({ where: { id: vid }, data: { isResolved: true, resolvedAt: new Date() } })
    return { success: true }
  })

  // T19: posture overview
  app.get('/posture', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [devices, policies, violations, requests] = await Promise.all([
      prisma.ztDevice.findMany({ where: { tenantId: r.tenantId } }),
      prisma.ztPolicy.count({ where: { tenantId: r.tenantId, isActive: true } }),
      prisma.ztViolation.count({ where: { tenantId: r.tenantId, isResolved: false } }),
      prisma.ztAccessRequest.findMany({ where: { tenantId: r.tenantId }, take: 200, orderBy: { createdAt: 'desc' } }),
    ])
    const compliant = devices.filter(d => d.isCompliant).length
    const denied = requests.filter(q => q.decision === 'deny').length
    const avgRisk = requests.length ? requests.reduce((s, q) => s + q.riskScore, 0) / requests.length : 0
    const postureScore = Math.max(0, Math.min(100, 100 - avgRisk - violations * 5 + (devices.length ? (compliant / devices.length) * 20 : 0)))
    return {
      postureScore: Number(postureScore.toFixed(1)),
      grade: postureScore >= 90 ? 'A' : postureScore >= 75 ? 'B' : postureScore >= 60 ? 'C' : postureScore >= 40 ? 'D' : 'F',
      devices: devices.length, compliantDevices: compliant,
      activePolicies: policies, openViolations: violations,
      recentDenials: denied, avgRiskScore: Number(avgRisk.toFixed(1)),
    }
  })

  // T20: simulate attack scenario (safe — only creates records)
  app.post('/simulate/attack', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { scenario = 'credential-stuffing' } = req.body as any
    const scenarios: Record<string, { violationType: string; severity: string; description: string }> = {
      'credential-stuffing': { violationType: 'credential-stuffing', severity: 'high', description: 'Simulated: multiple failed login attempts from rotating IPs' },
      'lateral-movement': { violationType: 'lateral-movement', severity: 'critical', description: 'Simulated: unusual east-west traffic between segments' },
      'data-exfiltration': { violationType: 'data-exfiltration', severity: 'critical', description: 'Simulated: large outbound data transfer to unknown host' },
      'privilege-escalation': { violationType: 'privilege-escalation', severity: 'high', description: 'Simulated: attempt to gain admin role without approval' },
    }
    const s = scenarios[scenario] ?? scenarios['credential-stuffing']
    const violation = await prisma.ztViolation.create({
      data: { tenantId: r.tenantId, userId: r.userId, ...s, metadata: { simulated: true, scenario } as never },
    })
    const risk = await prisma.ztSessionRisk.create({
      data: { tenantId: r.tenantId, userId: r.userId, sessionRef: `sim-${Date.now()}`, riskScore: s.severity === 'critical' ? 90 : 65, riskLevel: s.severity === 'critical' ? 'critical' : 'high', factors: { simulated: true, scenario } as never, action: s.severity === 'critical' ? 'terminate' : 'mfa-challenge' },
    })
    return { simulated: true, scenario, violation, risk }
  })

  // T21: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [policies, devices, requests, segments, risks, violations] = await Promise.all([
      prisma.ztPolicy.count({ where: { tenantId: r.tenantId } }),
      prisma.ztDevice.count({ where: { tenantId: r.tenantId } }),
      prisma.ztAccessRequest.count({ where: { tenantId: r.tenantId } }),
      prisma.ztSegment.count({ where: { tenantId: r.tenantId } }),
      prisma.ztSessionRisk.count({ where: { tenantId: r.tenantId } }),
      prisma.ztViolation.count({ where: { tenantId: r.tenantId } }),
    ])
    return { policies, devices, accessRequests: requests, segments, sessionRisks: risks, violations }
  })

  // T22: decision breakdown
  app.get('/access/decisions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const requests = await prisma.ztAccessRequest.findMany({ where: { tenantId: r.tenantId }, take: 500, orderBy: { createdAt: 'desc' } })
    const breakdown: Record<string, number> = {}
    for (const q of requests) breakdown[q.decision] = (breakdown[q.decision] ?? 0) + 1
    return { breakdown, total: requests.length }
  })

  // T23: delete policy
  app.delete('/policies/:pid', async (req) => {
    const { pid } = req.params as any
    await prisma.ztPolicy.delete({ where: { id: pid } })
    return { success: true }
  })

  // T24: delete device
  app.delete('/devices/:did', async (req) => {
    const { did } = req.params as any
    await prisma.ztDevice.delete({ where: { id: did } })
    return { success: true }
  })

  // T25: delete segment
  app.delete('/segments/:sid', async (req) => {
    const { sid } = req.params as any
    await prisma.ztSegment.delete({ where: { id: sid } })
    return { success: true }
  })

  // T26: get policy
  app.get('/policies/:pid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    return prisma.ztPolicy.findFirstOrThrow({ where: { id: pid, tenantId: r.tenantId } })
  })

  // T27: get device
  app.get('/devices/:did', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    return prisma.ztDevice.findFirstOrThrow({ where: { id: did, tenantId: r.tenantId } })
  })

  // T28: bulk policy test
  app.post('/policies/test', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { resources = [] } = req.body as any
    const policies = await prisma.ztPolicy.findMany({ where: { tenantId: r.tenantId, isActive: true }, orderBy: { priority: 'desc' } })
    const results = (resources as string[]).slice(0, 50).map(resource => {
      for (const p of policies) {
        const regex = new RegExp('^' + p.resource.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
        if (regex.test(resource)) return { resource, matched: p.name, action: p.action }
      }
      return { resource, matched: null, action: 'default-allow' }
    })
    return { results }
  })
}
