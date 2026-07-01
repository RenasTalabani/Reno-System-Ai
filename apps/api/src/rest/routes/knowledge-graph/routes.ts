import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  inferRelationType, extractEntitiesFromText, traverseGraph, findShortestPath,
  computeImportanceScores, answerGraphQuery, detectCommunities, buildTimeline,
  buildEntitiesFromData,
} from './ai-engine.js'
import type { GraphEntity, GraphRelation } from './ai-engine.js'

export async function knowledgeGraphRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [totalEntities, totalRelations, totalFacts, totalQueries, byTypeRaw, recentEntities, recentFacts] = await Promise.all([
      prisma.kgEntity.count({ where: { tenantId, isDeleted: false } }),
      prisma.kgRelation.count({ where: { tenantId } }),
      prisma.kgFact.count({ where: { tenantId } }),
      prisma.kgQuery.count({ where: { tenantId } }),
      prisma.kgEntity.groupBy({ by: ['type'], where: { tenantId, isDeleted: false }, _count: true }),
      prisma.kgEntity.findMany({ where: { tenantId, isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, type: true, name: true, importance: true } }),
      prisma.kgFact.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, content: true, importance: true, createdAt: true } }),
    ])
    const byType = Object.fromEntries(byTypeRaw.map(r => [r.type, r._count]))
    return { success: true, data: { totalEntities, totalRelations, totalFacts, totalQueries, byType, recentEntities, recentFacts } }
  })

  // ── Entities CRUD ──────────────────────────────────────────────────────────

  app.get('/entities', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const entities = await prisma.kgEntity.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(q.type ? { type: q.type } : {}),
        ...(q.search ? { name: { contains: q.search, mode: 'insensitive' } } : {}),
        ...(q.tag ? { tags: { has: q.tag } } : {}),
      },
      include: {
        _count: { select: { outgoing: true, incoming: true } },
      },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    })
    return { success: true, data: entities }
  })

  app.get('/entities/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const entity = await prisma.kgEntity.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        outgoing: { include: { to: { select: { id: true, type: true, name: true, importance: true } } }, take: 20 },
        incoming: { include: { from: { select: { id: true, type: true, name: true, importance: true } } }, take: 20 },
      },
    })
    if (!entity) return reply.code(404).send({ success: false, error: 'Entity not found' })
    const facts = await prisma.kgFact.findMany({ where: { tenantId, entityIds: { has: id } }, orderBy: { createdAt: 'desc' }, take: 20 })
    return { success: true, data: { ...entity, facts } }
  })

  app.post('/entities', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      type: string; name: string; externalId?: string; externalType?: string
      summary?: string; importance?: number; properties?: Record<string, unknown>; tags?: string[]
    }

    const entity = await prisma.kgEntity.create({
      data: {
        tenantId,
        type: body.type,
        name: body.name,
        externalId: body.externalId ?? null,
        externalType: body.externalType ?? null,
        summary: body.summary ?? null,
        importance: body.importance ?? 50,
        properties: (body.properties ?? {}) as never,
        tags: body.tags ?? [],
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_ENTITY_CREATED', module: 'knowledge-graph', entityType: 'KgEntity', entityId: entity.id, newValues: { type: body.type, name: body.name } as never },
    }).catch(() => null)

    return { success: true, data: entity }
  })

  app.put('/entities/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const existing = await prisma.kgEntity.findFirst({ where: { id, tenantId, isDeleted: false } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Entity not found' })

    const allowed = ['name', 'summary', 'importance', 'properties', 'tags']
    const data: Record<string, unknown> = {}
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key]

    const updated = await prisma.kgEntity.update({ where: { id }, data: data as never })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_ENTITY_UPDATED', module: 'knowledge-graph', entityType: 'KgEntity', entityId: id, newValues: data as never },
    }).catch(() => null)
    return { success: true, data: updated }
  })

  app.delete('/entities/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.kgEntity.findFirst({ where: { id, tenantId, isDeleted: false } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Entity not found' })
    await prisma.kgEntity.update({ where: { id }, data: { isDeleted: true } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_ENTITY_DELETED', module: 'knowledge-graph', entityType: 'KgEntity', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return { success: true, data: { deleted: true } }
  })

  // ── Graph Operations ───────────────────────────────────────────────────────

  app.get('/entities/:id/relations', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const entity = await prisma.kgEntity.findFirst({ where: { id, tenantId } })
    if (!entity) return reply.code(404).send({ success: false, error: 'Entity not found' })

    const [outgoing, incoming] = await Promise.all([
      prisma.kgRelation.findMany({ where: { fromId: id, tenantId }, include: { to: { select: { id: true, type: true, name: true, importance: true } } } }),
      prisma.kgRelation.findMany({ where: { toId: id, tenantId }, include: { from: { select: { id: true, type: true, name: true, importance: true } } } }),
    ])
    return { success: true, data: { outgoing, incoming } }
  })

  app.get('/entities/:id/traverse', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const q = req.query as Record<string, string>
    const maxDepth = Math.min(parseInt(q.depth ?? '2', 10), 3)
    const entity = await prisma.kgEntity.findFirst({ where: { id, tenantId } })
    if (!entity) return reply.code(404).send({ success: false, error: 'Entity not found' })

    const allEntities = await prisma.kgEntity.findMany({ where: { tenantId, isDeleted: false } })
    const allRelations = await prisma.kgRelation.findMany({ where: { tenantId } })

    const entityMap = new Map<string, GraphEntity>(allEntities.map(e => [e.id, e as unknown as GraphEntity]))
    const graphRels = allRelations as unknown as GraphRelation[]
    const result = traverseGraph(id, graphRels, entityMap, maxDepth, q.relType)

    return { success: true, data: result }
  })

  app.get('/entities/:id/path/:targetId', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id, targetId } = req.params as { id: string; targetId: string }
    const [from, to] = await Promise.all([
      prisma.kgEntity.findFirst({ where: { id, tenantId } }),
      prisma.kgEntity.findFirst({ where: { id: targetId, tenantId } }),
    ])
    if (!from || !to) return reply.code(404).send({ success: false, error: 'Entity not found' })

    const allRelations = await prisma.kgRelation.findMany({ where: { tenantId } })
    const graphRels = allRelations as unknown as GraphRelation[]
    const pathResult = findShortestPath(id, targetId, graphRels)

    if (!pathResult) return { success: true, data: { found: false, message: 'No path between these entities' } }

    const pathEntities = await prisma.kgEntity.findMany({ where: { id: { in: pathResult.path } } })
    const pathMap = new Map(pathEntities.map(e => [e.id, e]))
    const enrichedPath = pathResult.path.map(entityId => pathMap.get(entityId) ?? { id: entityId })

    return { success: true, data: { found: true, hops: pathResult.hops, path: enrichedPath } }
  })

  app.get('/entities/:id/timeline', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const entity = await prisma.kgEntity.findFirst({ where: { id, tenantId } })
    if (!entity) return reply.code(404).send({ success: false, error: 'Entity not found' })

    const [facts, outgoing, incoming] = await Promise.all([
      prisma.kgFact.findMany({ where: { tenantId, entityIds: { has: id } }, orderBy: { createdAt: 'desc' } }),
      prisma.kgRelation.findMany({ where: { fromId: id, tenantId }, include: { to: { select: { name: true, type: true } } } }),
      prisma.kgRelation.findMany({ where: { toId: id, tenantId }, include: { from: { select: { name: true, type: true } } } }),
    ])

    const allRels = [
      ...outgoing.map(r => ({ type: r.type, label: r.label, createdAt: r.createdAt, other: r.to })),
      ...incoming.map(r => ({ type: r.type, label: r.label, createdAt: r.createdAt, other: r.from })),
    ]
    const timeline = buildTimeline(
      facts.map(f => ({ content: f.content, createdAt: f.createdAt, importance: f.importance, source: f.source })),
      allRels,
    )

    return { success: true, data: { entity, timeline } }
  })

  // ── Relations CRUD ─────────────────────────────────────────────────────────

  app.post('/relations', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { fromId: string; toId: string; type: string; label?: string; weight?: number; properties?: Record<string, unknown> }

    const relation = await prisma.kgRelation.create({
      data: {
        tenantId,
        fromId: body.fromId,
        toId: body.toId,
        type: body.type,
        label: body.label ?? null,
        weight: body.weight ?? 1.0,
        properties: (body.properties ?? {}) as never,
      },
      include: {
        from: { select: { name: true, type: true } },
        to: { select: { name: true, type: true } },
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_RELATION_CREATED', module: 'knowledge-graph', entityType: 'KgRelation', entityId: relation.id, newValues: { type: body.type, fromId: body.fromId, toId: body.toId } as never },
    }).catch(() => null)

    return { success: true, data: relation }
  })

  app.delete('/relations/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const rel = await prisma.kgRelation.findFirst({ where: { id, tenantId } })
    if (!rel) return reply.code(404).send({ success: false, error: 'Relation not found' })
    await prisma.kgRelation.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_RELATION_DELETED', module: 'knowledge-graph', entityType: 'KgRelation', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return { success: true, data: { deleted: true } }
  })

  app.post('/relations/infer', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { entityAId: string; entityBId: string }
    const [a, b] = await Promise.all([
      prisma.kgEntity.findFirst({ where: { id: body.entityAId, tenantId } }),
      prisma.kgEntity.findFirst({ where: { id: body.entityBId, tenantId } }),
    ])
    if (!a || !b) return reply.code(404).send({ success: false, error: 'Entity not found' })
    const suggestion = inferRelationType(a.type, b.type)
    return { success: true, data: { entityA: { id: a.id, name: a.name, type: a.type }, entityB: { id: b.id, name: b.name, type: b.type }, suggestion } }
  })

  // ── Facts CRUD ─────────────────────────────────────────────────────────────

  app.get('/facts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const facts = await prisma.kgFact.findMany({
      where: {
        tenantId,
        ...(q.entityId ? { entityIds: { has: q.entityId } } : {}),
        ...(q.importance ? { importance: q.importance } : {}),
        ...(q.source ? { source: q.source } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: facts }
  })

  app.post('/facts', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { content: string; importance?: string; source?: string; sourceModule?: string; entityIds?: string[] }

    const fact = await prisma.kgFact.create({
      data: {
        tenantId,
        content: body.content,
        importance: body.importance ?? 'medium',
        source: body.source ?? 'user',
        sourceModule: body.sourceModule ?? null,
        entityIds: body.entityIds ?? [],
        verifiedAt: new Date(),
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_FACT_CREATED', module: 'knowledge-graph', entityType: 'KgFact', entityId: fact.id, newValues: { importance: fact.importance } as never },
    }).catch(() => null)

    return { success: true, data: fact }
  })

  app.delete('/facts/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const fact = await prisma.kgFact.findFirst({ where: { id, tenantId } })
    if (!fact) return reply.code(404).send({ success: false, error: 'Fact not found' })
    await prisma.kgFact.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_FACT_DELETED', module: 'knowledge-graph', entityType: 'KgFact', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return { success: true, data: { deleted: true } }
  })

  // ── Intelligence ───────────────────────────────────────────────────────────

  app.post('/query', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { question: string }
    const start = Date.now()

    const [entities, relations, facts] = await Promise.all([
      prisma.kgEntity.findMany({ where: { tenantId, isDeleted: false }, take: 200 }),
      prisma.kgRelation.findMany({ where: { tenantId }, take: 500 }),
      prisma.kgFact.findMany({ where: { tenantId }, take: 100 }),
    ])

    const graphEntities = entities as unknown as GraphEntity[]
    const graphRels = relations as unknown as GraphRelation[]
    const factTexts = facts.map(f => f.content)

    const result = answerGraphQuery(body.question, graphEntities, graphRels, factTexts)
    const durationMs = Date.now() - start

    await prisma.kgQuery.create({
      data: {
        tenantId, userId,
        question: body.question,
        answer: result.answer,
        entitiesFound: result.relevantEntities.length,
        relationsTraversed: relations.length,
        durationMs,
      },
    })

    return { success: true, data: { ...result, durationMs } }
  })

  app.post('/extract', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { text: string }
    const extracted = extractEntitiesFromText(body.text)
    return { success: true, data: { extracted, count: extracted.length } }
  })

  app.post('/auto-index', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }

    const [contacts, employees, projects, goals, initiatives] = await Promise.all([
      prisma.crmContact.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, email: true }, take: 30 }).catch(() => []),
      prisma.hrEmployee.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, firstName: true, lastName: true }, take: 30 }).catch(() => []),
      prisma.pmProject.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, name: true, status: true }, take: 30 }).catch(() => []),
      prisma.ageGoal.findMany({ where: { tenantId }, select: { id: true, title: true }, take: 20 }).catch(() => []),
      prisma.asoInitiative.findMany({ where: { tenantId }, select: { id: true, title: true, type: true }, take: 20 }).catch(() => []),
    ])

    const toCreate = buildEntitiesFromData({
      contacts: contacts as Array<{ id: string; firstName?: string | null; lastName?: string | null; email: string }>,
      employees: employees as Array<{ id: string; firstName: string; lastName: string }>,
      projects: projects as Array<{ id: string; name: string; status?: string | null }>,
      goals: goals.map(g => ({ id: g.id, title: g.title })),
      initiatives: initiatives.map(i => ({ id: i.id, title: i.title, type: i.type })),
    })

    const existingExternalIds = (await prisma.kgEntity.findMany({
      where: { tenantId, externalId: { in: toCreate.map(e => e.externalId).filter(Boolean) } },
      select: { externalId: true },
    })).map(e => e.externalId)

    const newEntities = toCreate.filter(e => !existingExternalIds.includes(e.externalId))

    let created = 0
    for (const e of newEntities) {
      await prisma.kgEntity.create({
        data: { tenantId, type: e.type, name: e.name, externalId: e.externalId, externalType: e.externalType, importance: e.importance, tags: e.tags, properties: e.properties as never },
      })
      created++
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'KG_AUTO_INDEX', module: 'knowledge-graph', entityType: 'KgEntity', entityId: tenantId, newValues: { created, skipped: toCreate.length - created } as never },
    }).catch(() => null)

    return { success: true, data: { created, skipped: toCreate.length - created, total: toCreate.length } }
  })

  app.get('/communities', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [entities, relations] = await Promise.all([
      prisma.kgEntity.findMany({ where: { tenantId, isDeleted: false } }),
      prisma.kgRelation.findMany({ where: { tenantId } }),
    ])
    const graphRels = relations as unknown as GraphRelation[]
    const communities = detectCommunities(
      entities.map(e => ({ id: e.id, type: e.type, name: e.name, importance: e.importance })),
      graphRels,
    )

    // Recompute importance scores
    const scores = computeImportanceScores(entities.map(e => ({ id: e.id, type: e.type })), graphRels)
    const topByImportance = entities
      .map(e => ({ ...e, computedImportance: scores.get(e.id) ?? e.importance }))
      .sort((a, b) => b.computedImportance - a.computedImportance)
      .slice(0, 10)

    return { success: true, data: { communities, topEntitiesByImportance: topByImportance } }
  })

  app.get('/queries', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const queries = await prisma.kgQuery.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, data: queries }
  })
}
