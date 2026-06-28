import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function mobileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Push Tokens ────────────────────────────────────────────────────────────

  app.post('/push-tokens', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { token, platform, deviceName, appVersion } = request.body as any
    await prisma.mobPushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { tenantId, userId, token, platform: platform ?? 'android', deviceName, appVersion, isActive: true },
      update: { isActive: true, lastUsedAt: new Date(), deviceName, appVersion },
    })
    return reply.status(201).send(buildSuccessResponse({ registered: true }))
  })

  app.delete('/push-tokens/:token', async (request, reply) => {
    const { userId } = request as any
    const { token } = request.params as any
    await prisma.mobPushToken.updateMany({ where: { userId, token }, data: { isActive: false } })
    return reply.send(buildSuccessResponse({ deregistered: true }))
  })

  app.get('/push-tokens', async (request, reply) => {
    const { tenantId, userId } = request as any
    const tokens = await prisma.mobPushToken.findMany({ where: { tenantId, userId, isActive: true }, orderBy: { lastUsedAt: 'desc' } })
    return reply.send(buildSuccessResponse(tokens))
  })

  // ── Push Notifications (send) ──────────────────────────────────────────────

  app.post('/push', async (request, reply) => {
    const { tenantId } = request as any
    const { userId, userIds, title, body, data } = request.body as any
    const targetIds: string[] = userIds ?? (userId ? [userId] : [])

    const tokens = await prisma.mobPushToken.findMany({
      where: { tenantId, isActive: true, ...(targetIds.length > 0 ? { userId: { in: targetIds } } : {}) },
    })

    // Record notification
    const notif = await prisma.mobPushNotification.create({
      data: { tenantId, userId: targetIds[0] ?? null, title, body, data: data ?? {}, status: 'sent', sentCount: tokens.length, sentAt: new Date() },
    })

    // In production: call FCM/APNs here with each token
    // For now: simulate send and track last_used_at
    if (tokens.length > 0) {
      await prisma.mobPushToken.updateMany({
        where: { id: { in: tokens.map(t => t.id) } },
        data: { lastUsedAt: new Date() },
      })
    }

    return reply.status(201).send(buildSuccessResponse({ notificationId: notif.id, sentTo: tokens.length }))
  })

  app.get('/push/history', async (request, reply) => {
    const { tenantId } = request as any
    const notifications = await prisma.mobPushNotification.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return reply.send(buildSuccessResponse(notifications))
  })

  // ── Offline Queue ──────────────────────────────────────────────────────────

  // POST /mobile/offline-queue — mobile app submits queued operations
  app.post('/offline-queue', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { operations } = request.body as any
    const ops = Array.isArray(operations) ? operations : [operations]

    const created = await prisma.mobOfflineQueue.createMany({
      data: ops.map((op: any) => ({
        tenantId,
        userId,
        operation: op.operation ?? 'POST',
        endpoint: op.endpoint,
        payload: op.payload ?? {},
        status: 'pending',
      })),
    })

    // Process immediately (in production: worker queue)
    setImmediate(async () => {
      const pending = await prisma.mobOfflineQueue.findMany({ where: { tenantId, userId, status: 'pending' }, orderBy: { createdAt: 'asc' } })
      for (const item of pending) {
        try {
          // Simulate processing — in production, replay the HTTP call internally
          await prisma.mobOfflineQueue.update({ where: { id: item.id }, data: { status: 'processed', processedAt: new Date() } })
        } catch (e) {
          await prisma.mobOfflineQueue.update({ where: { id: item.id }, data: { status: 'failed', error: (e as Error).message, retries: item.retries + 1 } })
        }
      }
    })

    return reply.status(201).send(buildSuccessResponse({ queued: created.count }))
  })

  app.get('/offline-queue', async (request, reply) => {
    const { tenantId, userId } = request as any
    const items = await prisma.mobOfflineQueue.findMany({ where: { tenantId, userId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return reply.send(buildSuccessResponse(items))
  })

  // ── Biometric Auth ─────────────────────────────────────────────────────────

  // POST /mobile/biometric/register — store public key for device
  app.post('/biometric/register', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { deviceId, publicKey, keyAlgorithm } = request.body as any
    await prisma.mobBiometricKey.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { tenantId, userId, deviceId, publicKey, keyAlgorithm: keyAlgorithm ?? 'ES256' },
      update: { publicKey, keyAlgorithm: keyAlgorithm ?? 'ES256', lastUsedAt: new Date() },
    })
    return reply.status(201).send(buildSuccessResponse({ registered: true }))
  })

  // POST /mobile/biometric/verify — verify signature (stub — real impl needs crypto verify)
  app.post('/biometric/verify', async (request, reply) => {
    const { userId } = request as any
    const { deviceId, signature, challenge } = request.body as any
    const key = await prisma.mobBiometricKey.findFirst({ where: { userId, deviceId } })
    if (!key) throw new RenoError(ErrorCode.NOT_FOUND, 'Biometric key not registered for this device', 404)

    // Production: verify ECDSA/RSA signature over challenge using key.publicKey
    // Stub: accept if challenge + signature present
    const verified = Boolean(challenge && signature)
    if (verified) {
      await prisma.mobBiometricKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    }
    return reply.send(buildSuccessResponse({ verified }))
  })

  app.delete('/biometric/:deviceId', async (request, reply) => {
    const { userId } = request as any
    const { deviceId } = request.params as any
    await prisma.mobBiometricKey.deleteMany({ where: { userId, deviceId } })
    return reply.send(buildSuccessResponse({ removed: true }))
  })

  // ── App Config ─────────────────────────────────────────────────────────────

  // GET /mobile/config — returns tenant-specific mobile app config
  app.get('/config', async (request, reply) => {
    const { tenantId } = request as any
    const theme = await prisma.wlTheme.findFirst({ where: { tenantId, isActive: true } })
    return reply.send(buildSuccessResponse({
      colors: (theme?.colors as object) ?? {},
      logoUrl: theme?.logoUrl ?? null,
      faviconUrl: theme?.faviconUrl ?? null,
      features: {
        biometricAuth: true,
        offlineSync: true,
        pushNotifications: true,
      },
    }))
  })
}
