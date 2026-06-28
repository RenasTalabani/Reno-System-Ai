import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import crypto from 'node:crypto'

export async function ssoRoutes(app: FastifyInstance) {

  // ── Admin: manage SSO providers ────────────────────────────────────────────

  app.get('/providers', { preHandler: requireAuth }, async (request, reply) => {
    const { tenantId } = request as any
    const providers = await prisma.ssoProvider.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, type: true, isEnabled: true, isDefault: true, domainHint: true, autoProvision: true, createdAt: true },
    })
    return reply.send(buildSuccessResponse(providers))
  })

  app.post('/providers', { preHandler: requireAuth }, async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const provider = await prisma.ssoProvider.create({
      data: {
        tenantId,
        name: body.name,
        type: body.type,
        config: body.config ?? {},
        attributeMap: body.attributeMap ?? { email: 'email', name: 'name', groups: 'groups' },
        autoProvision: body.autoProvision ?? true,
        autoAssignRoles: body.autoAssignRoles ?? [],
        domainHint: body.domainHint,
        createdBy: userId,
      },
    })
    return reply.status(201).send(buildSuccessResponse(provider))
  })

  app.put('/providers/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const existing = await prisma.ssoProvider.findFirst({ where: { id, tenantId } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'SSO provider not found', 404)
    const updated = await prisma.ssoProvider.update({ where: { id }, data: body })
    return reply.send(buildSuccessResponse(updated))
  })

  app.delete('/providers/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.ssoProvider.deleteMany({ where: { id, tenantId } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // PATCH /sso/providers/:id/enable
  app.patch('/providers/:id/enable', { preHandler: requireAuth }, async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const { enabled } = request.body as any
    await prisma.ssoProvider.updateMany({ where: { id, tenantId }, data: { isEnabled: enabled } })
    return reply.send(buildSuccessResponse({ enabled }))
  })

  // GET /sso/providers/:id/metadata — SAML SP metadata XML
  app.get('/providers/:id/metadata', async (request, reply) => {
    const { id } = request.params as any
    const provider = await prisma.ssoProvider.findFirst({ where: { id } })
    if (!provider || provider.type !== 'saml') throw new RenoError(ErrorCode.NOT_FOUND, 'SAML provider not found', 404)

    const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000'
    const xml = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${baseUrl}/v1/sso/acs/${id}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
    AuthnRequestsSigned="false" WantAssertionsSigned="true">
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${baseUrl}/v1/sso/acs/${id}"
      index="0" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`
    reply.header('Content-Type', 'application/xml')
    return reply.send(xml)
  })

  // POST /sso/acs/:providerId — SAML Assertion Consumer Service
  app.post('/acs/:providerId', async (request, reply) => {
    const { providerId } = request.params as any
    const provider = await prisma.ssoProvider.findFirst({ where: { id: providerId, type: 'saml', isEnabled: true } })
    if (!provider) return reply.status(400).send({ error: 'SSO provider not found or disabled' })

    // In production: parse SAMLResponse with samlify/node-saml
    // Here we simulate successful assertion extraction
    const body = request.body as any
    const attrs = body.attributes ?? {}
    const email = attrs.email ?? attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? ''
    const name = attrs.name ?? attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? ''
    const externalId = attrs.nameId ?? email

    if (!email) return reply.status(400).send({ error: 'Email attribute missing in SAML assertion' })

    await handleSsoLogin(provider, externalId, email, name, request.ip, reply)
  })

  // POST /sso/oidc/callback — OIDC callback
  app.get('/oidc/callback', async (request, reply) => {
    const q = request.query as any
    const { state, code } = q
    if (!state || !code) return reply.status(400).send({ error: 'Missing state or code' })

    // Decode state to get providerId
    let providerId: string
    try {
      const decoded = Buffer.from(state, 'base64').toString()
      providerId = JSON.parse(decoded).providerId
    } catch {
      return reply.status(400).send({ error: 'Invalid state' })
    }

    const provider = await prisma.ssoProvider.findFirst({ where: { id: providerId, type: { in: ['oidc', 'azure_ad', 'google'] }, isEnabled: true } })
    if (!provider) return reply.status(400).send({ error: 'Provider not found' })

    const config = provider.config as any
    // Exchange code for token (simplified — real impl uses node-openid-client)
    const tokenRes = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.API_BASE_URL}/v1/sso/oidc/callback`,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    }).then(r => r.json()).catch(() => null)

    if (!tokenRes?.access_token) return reply.status(400).send({ error: 'Token exchange failed' })

    // Get userinfo
    const userInfo = await fetch(config.userinfoEndpoint, {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` },
    }).then(r => r.json()).catch(() => null)

    if (!userInfo?.email) return reply.status(400).send({ error: 'No email in userinfo' })

    await handleSsoLogin(provider, userInfo.sub ?? userInfo.email, userInfo.email, userInfo.name ?? '', request.ip, reply)
  })

  // GET /sso/oidc/authorize/:providerId — initiate OIDC flow
  app.get('/oidc/authorize/:providerId', async (request, reply) => {
    const { providerId } = request.params as any
    const provider = await prisma.ssoProvider.findFirst({ where: { id: providerId, isEnabled: true } })
    if (!provider) return reply.status(404).send({ error: 'Provider not found' })
    const config = provider.config as any
    const state = Buffer.from(JSON.stringify({ providerId, nonce: crypto.randomUUID() })).toString('base64')
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: `${process.env.API_BASE_URL}/v1/sso/oidc/callback`,
      scope: 'openid email profile',
      state,
    })
    return reply.redirect(`${config.authorizationEndpoint}?${params}`)
  })

  // GET /sso/audit — SSO audit log
  app.get('/audit', { preHandler: requireAuth }, async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const logs = await prisma.ssoAuditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, parseInt(q.limit ?? '50')),
      skip: (parseInt(q.page ?? '1') - 1) * parseInt(q.limit ?? '50'),
    })
    return reply.send(buildSuccessResponse(logs))
  })
}

async function handleSsoLogin(
  provider: any,
  externalId: string,
  email: string,
  name: string,
  ip: string,
  reply: any,
) {
  try {
    // Upsert SSO session
    const [firstName, ...rest] = (name ?? '').split(' ')
    const lastName = rest.join(' ')

    let session = await prisma.ssoSession.findFirst({ where: { providerId: provider.id, externalId } })
    if (session) {
      session = await prisma.ssoSession.update({ where: { id: session.id }, data: { lastLoginAt: new Date(), name } })
    } else {
      session = await prisma.ssoSession.create({
        data: { tenantId: provider.tenantId, providerId: provider.id, externalId, email, name },
      })
    }

    // Auto-provision user if needed
    let userId = session.userId
    if (!userId && provider.autoProvision) {
      // Find or create user
      let user = await prisma.coreUser.findFirst({ where: { tenantId: provider.tenantId, email } })
      if (!user) {
        user = await prisma.coreUser.create({
          data: {
            tenantId: provider.tenantId,
            email,
            firstName: firstName || email.split('@')[0],
            lastName: lastName || '',
            isActive: true,
            emailVerifiedAt: new Date(),
          },
        })
      }
      userId = user.id
      await prisma.ssoSession.update({ where: { id: session.id }, data: { userId, provisioned: !session.userId } })
    }

    // Log success
    await prisma.ssoAuditLog.create({
      data: { tenantId: provider.tenantId, providerId: provider.id, userId, event: 'sso_login', email, ipAddress: ip, success: true },
    })

    // Issue JWT (simplified — in production reuse auth service)
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000'
    return reply.redirect(`${webUrl}/auth/sso-callback?userId=${userId}&tenantId=${provider.tenantId}`)
  } catch (err: any) {
    await prisma.ssoAuditLog.create({
      data: { tenantId: provider.tenantId, providerId: provider.id, event: 'sso_login_failed', email, ipAddress: ip, success: false, error: err.message },
    })
    return reply.status(500).send({ error: 'SSO login failed' })
  }
}
