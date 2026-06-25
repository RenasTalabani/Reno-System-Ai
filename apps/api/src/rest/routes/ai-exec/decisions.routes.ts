import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

export async function aiExecDecisionsRoutes(app: FastifyInstance) {
  // Decision history
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { executiveRole, limit = 20, offset = 0 } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (executiveRole) where.executiveRole = executiveRole
    const [items, total] = await Promise.all([
      prisma.aiExecDecision.findMany({ where, orderBy: { decisionDate: 'desc' }, take: Number(limit), skip: Number(offset) }),
      prisma.aiExecDecision.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.aiExecDecision.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { executiveRole = 'ceo', title, context, decision, factors = [], alternatives = [], confidenceAtTime = 0.8 } = req.body as any

    if (!title?.trim()) return reply.status(400).send({ success: false, error: 'Title required' })
    if (!decision?.trim()) return reply.status(400).send({ success: false, error: 'Decision content required' })

    const record = await prisma.aiExecDecision.create({
      data: { tenantId, executiveRole, decidedBy: userId, title, context: context ?? '', decision, factors: factors as any, alternatives: alternatives as any, confidenceAtTime, decisionDate: new Date() },
    })

    return reply.status(201).send({ success: true, data: record })
  })

  app.patch('/:id/outcome', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { outcome, actualScore } = req.body as any

    const updated = await prisma.aiExecDecision.update({
      where: { id },
      data: { outcome, actualScore },
    })
    return reply.send({ success: true, data: updated })
  })

  // Lessons learned
  app.get('/lessons', async (req, reply) => {
    const { tenantId } = req as any
    const { category, limit = 30, offset = 0 } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (category) where.category = category
    const [items, total] = await Promise.all([
      prisma.aiLessonLearned.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip: Number(offset) }),
      prisma.aiLessonLearned.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.post('/lessons', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { title, category = 'general', context = '', outcome = '', lesson, tags = [], relatedDecisions = [], confidence = 0.8 } = req.body as any

    if (!lesson?.trim()) return reply.status(400).send({ success: false, error: 'Lesson content required' })

    const item = await prisma.aiLessonLearned.create({
      data: { tenantId, createdBy: userId, title: title ?? 'Lesson Learned', category, context, outcome, lesson, tags, relatedDecisions: relatedDecisions as any, confidence },
    })
    return reply.status(201).send({ success: true, data: item })
  })

  // AI-generate lesson from a decision
  app.post('/:id/generate-lesson', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const decision = await prisma.aiExecDecision.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!decision) return reply.status(404).send({ success: false, error: 'Decision not found' })
    if (!decision.outcome) return reply.status(400).send({ success: false, error: 'Set the actual outcome first before generating a lesson' })

    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const aiConfig = { provider: (providerCfg?.provider as any) ?? 'mock', apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    const prompt = `Analyze this business decision and generate a structured lesson learned.

Decision: "${decision.title}"
Executive Role: ${decision.executiveRole}
Context: ${decision.context}
Decision Made: ${decision.decision}
Actual Outcome: ${decision.outcome}
Confidence At Time: ${decision.confidenceAtTime}

Respond in JSON:
{
  "title": "brief lesson title",
  "lesson": "core lesson in 2-3 sentences",
  "context": "relevant context for future reference",
  "outcome": "what actually happened",
  "tags": ["tag1", "tag2"]
}`

    let lessonData: any = { title: 'Lesson from decision', lesson: 'Analysis unavailable.', context: decision.context, outcome: decision.outcome ?? '', tags: [] }

    try {
      const res = await callAI([{ role: 'user', content: prompt }], { systemPrompt: EXECUTIVE_PERSONAS['analyst']!.systemPromptPrefix, maxTokens: 600, temperature: 0.2 }, aiConfig)
      lessonData = JSON.parse(res.content.replace(/```json\n?|\n?```/g, '').trim())
    } catch {}

    const lesson = await prisma.aiLessonLearned.create({
      data: {
        tenantId, createdBy: userId,
        category: decision.executiveRole ?? 'general',
        title: lessonData.title ?? 'Lesson from decision',
        context: lessonData.context ?? decision.context,
        outcome: lessonData.outcome ?? decision.outcome ?? '',
        lesson: lessonData.lesson,
        tags: lessonData.tags ?? [],
        relatedDecisions: [id] as any,
        confidence: decision.confidenceAtTime,
      },
    })

    // Update decision with lesson reference
    const currentLessons = decision.lessons ?? ''
    await prisma.aiExecDecision.update({ where: { id }, data: { lessons: currentLessons ? `${currentLessons}\n\nLesson ID: ${lesson.id}` : `Lesson ID: ${lesson.id}` } })

    return reply.status(201).send({ success: true, data: lesson })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    await prisma.aiExecDecision.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send({ success: true })
  })
}
