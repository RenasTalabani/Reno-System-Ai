import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function whitelabelRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Themes ─────────────────────────────────────────────────────────────────

  app.get('/themes', async (request, reply) => {
    const { tenantId } = request as any
    const themes = await prisma.wlTheme.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
    return reply.send(buildSuccessResponse(themes))
  })

  app.get('/themes/active', async (request, reply) => {
    const { tenantId } = request as any
    const theme = await prisma.wlTheme.findFirst({ where: { tenantId, isActive: true } })
    return reply.send(buildSuccessResponse(theme))
  })

  app.post('/themes', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const theme = await prisma.wlTheme.create({
      data: { tenantId, createdBy: userId, name: body.name, colors: body.colors ?? {}, typography: body.typography ?? {}, radius: body.radius ?? {}, customCss: body.customCss, logoUrl: body.logoUrl, faviconUrl: body.faviconUrl },
    })
    return reply.status(201).send(buildSuccessResponse(theme))
  })

  app.put('/themes/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const existing = await prisma.wlTheme.findFirst({ where: { id, tenantId } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Theme not found', 404)
    const updated = await prisma.wlTheme.update({ where: { id }, data: body })
    return reply.send(buildSuccessResponse(updated))
  })

  app.patch('/themes/:id/activate', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.$transaction([
      prisma.wlTheme.updateMany({ where: { tenantId }, data: { isActive: false } }),
      prisma.wlTheme.update({ where: { id }, data: { isActive: true } }),
    ])
    return reply.send(buildSuccessResponse({ activated: id }))
  })

  app.delete('/themes/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const theme = await prisma.wlTheme.findFirst({ where: { id, tenantId } })
    if (!theme) throw new RenoError(ErrorCode.NOT_FOUND, 'Theme not found', 404)
    if (theme.isActive) throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Cannot delete active theme', 400)
    await prisma.wlTheme.delete({ where: { id } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // ── Custom Domains ─────────────────────────────────────────────────────────

  app.get('/domains', async (request, reply) => {
    const { tenantId } = request as any
    const domains = await prisma.wlDomainMapping.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
    return reply.send(buildSuccessResponse(domains))
  })

  app.post('/domains', async (request, reply) => {
    const { tenantId } = request as any
    const { domain } = request.body as any
    const existing = await prisma.wlDomainMapping.findFirst({ where: { domain } })
    if (existing) throw new RenoError(ErrorCode.CONFLICT, 'Domain already mapped', 409)
    const mapping = await prisma.wlDomainMapping.create({ data: { tenantId, domain, isPrimary: false } })
    return reply.status(201).send(buildSuccessResponse(mapping))
  })

  app.patch('/domains/:id/verify', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    // In production: DNS TXT record verification
    const updated = await prisma.wlDomainMapping.updateMany({
      where: { id, tenantId },
      data: { sslStatus: 'active', verifiedAt: new Date() },
    })
    return reply.send(buildSuccessResponse({ verified: updated.count > 0 }))
  })

  app.delete('/domains/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.wlDomainMapping.deleteMany({ where: { id, tenantId } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // GET /v1/white-label/theme.css — serve active theme as CSS variables
  app.get('/theme.css', async (request, reply) => {
    const { tenantId } = request as any
    const theme = await prisma.wlTheme.findFirst({ where: { tenantId, isActive: true } })
    const colors = (theme?.colors as Record<string, string>) ?? {}
    const radius = (theme?.radius as Record<string, string>) ?? {}
    const typography = (theme?.typography as Record<string, string>) ?? {}

    const css = `:root {
${Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`).join('\n')}
${Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v};`).join('\n')}
${Object.entries(typography).map(([k, v]) => `  --${k}: ${v};`).join('\n')}
}
${theme?.customCss ?? ''}`

    reply.header('Content-Type', 'text/css')
    return reply.send(css)
  })
}
