import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktSearchRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { q = '', type, limit = 10 } = req.query as any

    const baseWhere = { isActive: true, status: 'approved', deletedAt: null }
    const textWhere = { OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { description: { contains: q, mode: 'insensitive' as const } },
    ]}
    const merged = { ...baseWhere, ...textWhere }
    const n = Number(limit)

    const results: Record<string, any[]> = {}

    if (!type || type === 'plugins') {
      results.plugins = await prisma.mktPlugin.findMany({
        where: { ...baseWhere, OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
        ]},
        select: { id: true, name: true, slug: true, shortDescription: true, category: true, iconUrl: true, rating: true, pricingModel: true },
        take: n,
      })
    }

    if (!type || type === 'themes') {
      results.themes = await prisma.mktTheme.findMany({
        where: merged,
        select: { id: true, name: true, slug: true, thumbnailUrl: true, category: true, rating: true, primaryColor: true },
        take: n,
      })
    }

    if (!type || type === 'workflow_templates') {
      results.workflowTemplates = await prisma.mktWorkflowTemplate.findMany({
        where: merged,
        select: { id: true, name: true, slug: true, description: true, category: true, triggerType: true },
        take: n,
      })
    }

    if (!type || type === 'ai_agents') {
      results.aiAgents = await prisma.mktAiAgentTemplate.findMany({
        where: merged,
        select: { id: true, name: true, slug: true, description: true, category: true, capabilities: true },
        take: n,
      })
    }

    if (!type || type === 'industry_packs') {
      results.industryPacks = await prisma.mktIndustryPack.findMany({
        where: { ...baseWhere, OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { industry: { contains: q, mode: 'insensitive' } },
        ]},
        select: { id: true, name: true, slug: true, description: true, industry: true, iconUrl: true },
        take: n,
      })
    }

    const total = Object.values(results).reduce((s, arr) => s + arr.length, 0)
    return reply.send({ success: true, data: results, meta: { query: q, total } })
  })

  // Categories
  app.get('/categories', async (req, reply) => {
    const [pluginCats, themeCats, wfCats, agentCats, industries] = await Promise.all([
      prisma.mktPlugin.groupBy({ by: ['category'], where: { status: 'approved', isActive: true }, _count: true, orderBy: { _count: { category: 'desc' } } }),
      prisma.mktTheme.groupBy({ by: ['category'], where: { status: 'approved', isActive: true }, _count: true }),
      prisma.mktWorkflowTemplate.groupBy({ by: ['category'], where: { status: 'approved', isActive: true }, _count: true }),
      prisma.mktAiAgentTemplate.groupBy({ by: ['category'], where: { status: 'approved', isActive: true }, _count: true }),
      prisma.mktIndustryPack.groupBy({ by: ['industry'], where: { status: 'approved', isActive: true }, _count: true }),
    ])

    return reply.send({
      success: true,
      data: {
        plugins: pluginCats.map((c) => ({ name: c.category, count: c._count })),
        themes: themeCats.map((c) => ({ name: c.category, count: c._count })),
        workflowTemplates: wfCats.map((c) => ({ name: c.category, count: c._count })),
        aiAgents: agentCats.map((c) => ({ name: c.category, count: c._count })),
        industryPacks: industries.map((i) => ({ name: i.industry, count: i._count })),
      },
    })
  })

  // Featured / homepage listings
  app.get('/featured', async (req, reply) => {
    const base = { isActive: true, status: 'approved', deletedAt: null, isFeatured: true }
    const [plugins, themes, packs] = await Promise.all([
      prisma.mktPlugin.findMany({ where: base, take: 6, orderBy: { installCount: 'desc' }, select: { id: true, name: true, slug: true, shortDescription: true, iconUrl: true, rating: true, pricingModel: true, category: true } }),
      prisma.mktTheme.findMany({ where: base, take: 4, orderBy: { installCount: 'desc' }, select: { id: true, name: true, slug: true, thumbnailUrl: true, primaryColor: true, secondaryColor: true, rating: true } }),
      prisma.mktIndustryPack.findMany({ where: base, take: 3, orderBy: { installCount: 'desc' }, select: { id: true, name: true, slug: true, industry: true, iconUrl: true, rating: true } }),
    ])

    return reply.send({ success: true, data: { plugins, themes, industryPacks: packs } })
  })
}
