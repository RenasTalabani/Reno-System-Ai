import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function docsHubRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    audiences: ['all', 'admins', 'developers', 'end-users'],
    articleStatuses: ['draft', 'review', 'published', 'archived'],
    categories: ['getting-started', 'platform', 'api', 'security', 'billing', 'troubleshooting'],
  }))

  // T2: create space
  app.post('/spaces', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, slug, description, audience = 'all' } = req.body as any
    const space = await prisma.dhSpace.create({
      data: { tenantId: r.tenantId, name, slug, description, audience },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'docs-hub', entityType: 'DhSpace', entityId: space.id, newValues: { name, slug } as never } as never }).catch(() => null)
    return space
  })

  // T3: list spaces
  app.get('/spaces', async (req) => {
    const r = req as unknown as { tenantId: string }
    const spaces = await prisma.dhSpace.findMany({ where: { tenantId: r.tenantId }, orderBy: { position: 'asc' }, include: { _count: { select: { articles: true } } } })
    return { spaces, total: spaces.length }
  })

  // T4: update space
  app.patch('/spaces/:sid', async (req) => {
    const { sid } = req.params as any
    const data = req.body as any
    return prisma.dhSpace.update({ where: { id: sid }, data })
  })

  // T5: create article (v1 snapshot recorded)
  app.post('/spaces/:sid/articles', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const { title, slug, content, tags = [] } = req.body as any
    const article = await prisma.dhArticle.create({
      data: { tenantId: r.tenantId, spaceId: sid, title, slug, content, status: 'draft', tags: tags as never },
    })
    await prisma.dhArticleVersion.create({
      data: { tenantId: r.tenantId, articleId: article.id, version: 1, title, content, editedBy: r.userId },
    })
    return article
  })

  // T6: list articles in space
  app.get('/spaces/:sid/articles', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const articles = await prisma.dhArticle.findMany({
      where: { spaceId: sid, tenantId: r.tenantId },
      select: { id: true, title: true, slug: true, status: true, currentVersion: true, viewCount: true, helpfulYes: true, helpfulNo: true, publishedAt: true },
    })
    return { articles, total: articles.length }
  })

  // T7: get article by slug within space (increments view count)
  app.get('/spaces/:sid/articles/:slug', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid, slug } = req.params as any
    const article = await prisma.dhArticle.update({
      where: { tenantId_spaceId_slug: { tenantId: r.tenantId, spaceId: sid, slug } },
      data: { viewCount: { increment: 1 } },
    })
    return article
  })

  // T8: update article content (creates a new version)
  app.patch('/articles/:aid', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { title, content, tags } = req.body as any
    const article = await prisma.dhArticle.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId } })
    const nextVersion = article.currentVersion + 1
    await prisma.dhArticleVersion.create({
      data: { tenantId: r.tenantId, articleId: aid, version: nextVersion, title: title ?? article.title, content: content ?? article.content, editedBy: r.userId },
    })
    return prisma.dhArticle.update({
      where: { id: aid },
      data: { title: title ?? undefined, content: content ?? undefined, tags: tags as never, currentVersion: nextVersion },
    })
  })

  // T9: list article versions
  app.get('/articles/:aid/versions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const versions = await prisma.dhArticleVersion.findMany({ where: { articleId: aid, tenantId: r.tenantId }, orderBy: { version: 'desc' } })
    return { versions, total: versions.length }
  })

  // T10: rollback article to a prior version (creates a new version copying old content)
  app.post('/articles/:aid/rollback', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { toVersion } = req.body as any
    const target = await prisma.dhArticleVersion.findFirstOrThrow({ where: { articleId: aid, version: toVersion, tenantId: r.tenantId } })
    const article = await prisma.dhArticle.findFirstOrThrow({ where: { id: aid, tenantId: r.tenantId } })
    const nextVersion = article.currentVersion + 1
    await prisma.dhArticleVersion.create({
      data: { tenantId: r.tenantId, articleId: aid, version: nextVersion, title: target.title, content: target.content, editedBy: r.userId },
    })
    return prisma.dhArticle.update({ where: { id: aid }, data: { title: target.title, content: target.content, currentVersion: nextVersion } })
  })

  // T11: submit for review
  app.post('/articles/:aid/submit-review', async (req) => {
    const { aid } = req.params as any
    return prisma.dhArticle.update({ where: { id: aid }, data: { status: 'review' } })
  })

  // T12: publish article
  app.post('/articles/:aid/publish', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const updated = await prisma.dhArticle.update({ where: { id: aid }, data: { status: 'published', publishedAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'PUBLISH', module: 'docs-hub', entityType: 'DhArticle', entityId: aid, newValues: { title: updated.title } as never } as never }).catch(() => null)
    return updated
  })

  // T13: archive article
  app.post('/articles/:aid/archive', async (req) => {
    const { aid } = req.params as any
    return prisma.dhArticle.update({ where: { id: aid }, data: { status: 'archived' } })
  })

  // T14: submit feedback (updates helpful counters)
  app.post('/articles/:aid/feedback', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { helpful, comment } = req.body as any
    const fb = await prisma.dhFeedback.create({ data: { tenantId: r.tenantId, articleId: aid, helpful, comment } })
    await prisma.dhArticle.update({ where: { id: aid }, data: helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } } })
    return fb
  })

  // T15: list feedback
  app.get('/articles/:aid/feedback', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const feedback = await prisma.dhFeedback.findMany({ where: { articleId: aid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { feedback, total: feedback.length }
  })

  // T16: search articles (published only, records search log)
  app.get('/search', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { q } = req.query as any
    const results = await prisma.dhArticle.findMany({
      where: { tenantId: r.tenantId, status: 'published', OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }] },
      select: { id: true, title: true, slug: true, spaceId: true },
      take: 50,
    })
    await prisma.dhSearchLog.create({ data: { tenantId: r.tenantId, query: q ?? '', resultCount: results.length } })
    return { results, total: results.length }
  })

  // T17: top search queries
  app.get('/search/top', async (req) => {
    const r = req as unknown as { tenantId: string }
    const logs = await prisma.dhSearchLog.findMany({ where: { tenantId: r.tenantId }, take: 500, orderBy: { createdAt: 'desc' } })
    const counts: Record<string, number> = {}
    for (const l of logs) counts[l.query] = (counts[l.query] ?? 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }))
    return { top }
  })

  // T18: zero-result searches (content gap report)
  app.get('/search/gaps', async (req) => {
    const r = req as unknown as { tenantId: string }
    const gaps = await prisma.dhSearchLog.findMany({ where: { tenantId: r.tenantId, resultCount: 0 }, take: 50, orderBy: { createdAt: 'desc' } })
    return { gaps, total: gaps.length }
  })

  // T19: add glossary term
  app.post('/glossary', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { term, definition, category } = req.body as any
    return prisma.dhGlossaryTerm.create({ data: { tenantId: r.tenantId, term, definition, category } })
  })

  // T20: list glossary
  app.get('/glossary', async (req) => {
    const r = req as unknown as { tenantId: string }
    const terms = await prisma.dhGlossaryTerm.findMany({ where: { tenantId: r.tenantId }, orderBy: { term: 'asc' } })
    return { terms, total: terms.length }
  })

  // T21: update glossary term
  app.patch('/glossary/:tid', async (req) => {
    const { tid } = req.params as any
    const data = req.body as any
    return prisma.dhGlossaryTerm.update({ where: { id: tid }, data })
  })

  // T22: most/least helpful articles report
  app.get('/analytics/helpfulness', async (req) => {
    const r = req as unknown as { tenantId: string }
    const articles = await prisma.dhArticle.findMany({
      where: { tenantId: r.tenantId, status: 'published' },
      select: { id: true, title: true, helpfulYes: true, helpfulNo: true, viewCount: true },
    })
    const scored = articles.map(a => ({ ...a, helpfulRatio: a.helpfulYes + a.helpfulNo > 0 ? Number((a.helpfulYes / (a.helpfulYes + a.helpfulNo)).toFixed(2)) : null }))
    return { articles: scored.sort((a, b) => (b.helpfulRatio ?? 0) - (a.helpfulRatio ?? 0)) }
  })

  // T23: dashboard
  app.get('/dashboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [spaces, articles, published, totalViews] = await Promise.all([
      prisma.dhSpace.count({ where: { tenantId: r.tenantId } }),
      prisma.dhArticle.count({ where: { tenantId: r.tenantId } }),
      prisma.dhArticle.count({ where: { tenantId: r.tenantId, status: 'published' } }),
      prisma.dhArticle.aggregate({ where: { tenantId: r.tenantId }, _sum: { viewCount: true } }),
    ])
    return { spaces, articles, published, drafts: articles - published, totalViews: totalViews._sum.viewCount ?? 0 }
  })

  // T24: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [spaces, articles, versions, feedback, glossary, searches] = await Promise.all([
      prisma.dhSpace.count({ where: { tenantId: r.tenantId } }),
      prisma.dhArticle.count({ where: { tenantId: r.tenantId } }),
      prisma.dhArticleVersion.count({ where: { tenantId: r.tenantId } }),
      prisma.dhFeedback.count({ where: { tenantId: r.tenantId } }),
      prisma.dhGlossaryTerm.count({ where: { tenantId: r.tenantId } }),
      prisma.dhSearchLog.count({ where: { tenantId: r.tenantId } }),
    ])
    return { spaces, articles, versions, feedback, glossaryTerms: glossary, searches }
  })

  // T25: delete glossary term
  app.delete('/glossary/:tid', async (req) => {
    const { tid } = req.params as any
    await prisma.dhGlossaryTerm.delete({ where: { id: tid } })
    return { success: true }
  })

  // T26: delete feedback
  app.delete('/feedback/:fid', async (req) => {
    const { fid } = req.params as any
    await prisma.dhFeedback.delete({ where: { id: fid } })
    return { success: true }
  })

  // T27: delete article
  app.delete('/articles/:aid', async (req) => {
    const { aid } = req.params as any
    await prisma.dhArticle.delete({ where: { id: aid } })
    return { success: true }
  })

  // T28: delete space
  app.delete('/spaces/:sid', async (req) => {
    const { sid } = req.params as any
    await prisma.dhSpace.delete({ where: { id: sid } })
    return { success: true }
  })
}
