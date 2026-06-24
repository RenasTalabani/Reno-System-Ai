import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktDeveloperRoutes(app: FastifyInstance) {
  // Get my developer account
  app.get('/me', async (req, reply) => {
    const { userId } = req as any
    const account = await prisma.mktDeveloperAccount.findFirst({
      where: { userId, deletedAt: null },
      include: {
        plugins: { where: { deletedAt: null }, select: { id: true, name: true, slug: true, status: true, installCount: true, rating: true } },
        themes: { where: { deletedAt: null }, select: { id: true, name: true, slug: true, status: true, installCount: true, rating: true } },
      },
    })
    return reply.send({ success: true, data: account })
  })

  // Register developer account
  app.post('/register', async (req, reply) => {
    const { userId } = req as any
    const { name, email, website, description } = req.body as any

    const existing = await prisma.mktDeveloperAccount.findFirst({ where: { userId, deletedAt: null } })
    if (existing) return reply.status(409).send({ success: false, error: 'Developer account already exists' })

    const account = await prisma.mktDeveloperAccount.create({
      data: { userId, name, email, website, description, status: 'pending', revenueSharePct: 70 },
    })

    return reply.status(201).send({ success: true, data: account })
  })

  // Update developer profile
  app.patch('/me', async (req, reply) => {
    const { userId } = req as any
    const { name, email, website, description, payoutEmail, avatarUrl } = req.body as any

    const account = await prisma.mktDeveloperAccount.findFirst({ where: { userId, deletedAt: null } })
    if (!account) return reply.status(404).send({ success: false, error: 'Developer account not found' })

    const updated = await prisma.mktDeveloperAccount.update({
      where: { id: account.id },
      data: { name, email, website, description, payoutEmail, avatarUrl },
    })

    return reply.send({ success: true, data: updated })
  })

  // List my plugins
  app.get('/plugins', async (req, reply) => {
    const { userId } = req as any
    const account = await prisma.mktDeveloperAccount.findFirst({ where: { userId, deletedAt: null } })
    if (!account) return reply.status(404).send({ success: false, error: 'Developer account not found' })

    const plugins = await prisma.mktPlugin.findMany({
      where: { developerId: account.id, deletedAt: null },
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ success: true, data: plugins })
  })

  // Create plugin listing
  app.post('/plugins', async (req, reply) => {
    const { userId } = req as any
    const account = await prisma.mktDeveloperAccount.findFirst({ where: { userId, deletedAt: null } })
    if (!account) return reply.status(404).send({ success: false, error: 'Register a developer account first' })
    if (account.status !== 'approved') return reply.status(403).send({ success: false, error: 'Developer account not yet approved' })

    const {
      slug, name, shortDescription, description, category, tags = [],
      iconUrl, screenshotUrls = [], pricingModel = 'free', price = 0, currency = 'USD',
      trialDays = 0, currentVersion = '1.0.0', minCoreVersion = '1.0.0',
      permissions = [], requiredModules = [], websiteUrl, documentationUrl, supportEmail, licenseType = 'proprietary',
    } = req.body as any

    const plugin = await prisma.mktPlugin.create({
      data: {
        developerId: account.id, slug, name, shortDescription, description, category,
        tags, iconUrl, screenshotUrls, pricingModel, price, currency, trialDays,
        currentVersion, minCoreVersion, permissions, requiredModules,
        websiteUrl, documentationUrl, supportEmail, licenseType, status: 'draft',
      },
    })

    await prisma.mktPluginVersion.create({
      data: {
        pluginId: plugin.id, version: currentVersion, changelog: 'Initial release.',
        minCoreVersion, isStable: true, publishedAt: new Date(),
      },
    })

    return reply.status(201).send({ success: true, data: plugin })
  })

  // Add plugin version
  app.post('/plugins/:id/versions', async (req, reply) => {
    const { userId } = req as any
    const { id } = req.params as any
    const { version, changelog, minCoreVersion, maxCoreVersion, isStable = true } = req.body as any

    const account = await prisma.mktDeveloperAccount.findFirst({ where: { userId, deletedAt: null } })
    if (!account) return reply.status(403).send({ success: false, error: 'Developer account required' })

    const plugin = await prisma.mktPlugin.findFirst({ where: { id, developerId: account.id } })
    if (!plugin) return reply.status(404).send({ success: false, error: 'Plugin not found' })

    const [newVersion] = await Promise.all([
      prisma.mktPluginVersion.create({
        data: { pluginId: id, version, changelog, minCoreVersion, maxCoreVersion, isStable, publishedAt: new Date() },
      }),
      prisma.mktPlugin.update({ where: { id }, data: { currentVersion: version } }),
    ])

    return reply.status(201).send({ success: true, data: newVersion })
  })

  // Earnings summary
  app.get('/earnings', async (req, reply) => {
    const { userId } = req as any
    const account = await prisma.mktDeveloperAccount.findFirst({ where: { userId, deletedAt: null } })
    if (!account) return reply.status(404).send({ success: false, error: 'Developer account not found' })

    const pluginInstalls = await prisma.mktPlugin.aggregate({
      where: { developerId: account.id },
      _sum: { installCount: true },
    })

    return reply.send({
      success: true,
      data: {
        totalEarnings: account.totalEarnings,
        revenueSharePct: account.revenueSharePct,
        totalInstalls: pluginInstalls._sum.installCount ?? 0,
        payoutEmail: account.payoutEmail,
      },
    })
  })
}
