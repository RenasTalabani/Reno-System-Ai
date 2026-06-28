import type { FastifyInstance } from 'fastify'
import {
  startSession,
  getSession,
  getActiveSession,
  getSessionByToken,
  saveAnswer,
  detectIndustry,
  generatePlan,
  getPlan,
  approvePlan,
  applyPlan,
  getProgress,
  getAuditLogs,
  WIZARD_STEPS,
} from '../../../brain/onboarding/onboarding.service.js'
import { listTemplates, getTemplate } from '../../../brain/onboarding/industry.service.js'

export async function onboardingRoutes(app: FastifyInstance) {
  // GET /templates — list all industry templates
  app.get('/templates', async (req, reply) => {
    const templates = await listTemplates()
    return reply.send({ templates })
  })

  // GET /templates/:slug — get single template
  app.get<{ Params: { slug: string } }>('/templates/:slug', async (req, reply) => {
    const t = await getTemplate(req.params.slug)
    if (!t) return reply.status(404).send({ error: 'Template not found' })
    return reply.send({ template: t })
  })

  // GET /wizard/steps — list all wizard steps
  app.get('/wizard/steps', async (_req, reply) => {
    return reply.send({ steps: WIZARD_STEPS })
  })

  // POST /sessions/start — start new onboarding session
  app.post<{ Body: { tenantId: string } }>('/sessions/start', async (req, reply) => {
    const { tenantId } = req.body
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const session = await startSession(tenantId)
    return reply.send({ session })
  })

  // GET /sessions/active?tenantId= — get active session for tenant
  app.get<{ Querystring: { tenantId: string } }>('/sessions/active', async (req, reply) => {
    const { tenantId } = req.query
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const session = await getActiveSession(tenantId)
    return reply.send({ session: session ?? null })
  })

  // GET /sessions/resume/:token — resume session by token
  app.get<{ Params: { token: string } }>('/sessions/resume/:token', async (req, reply) => {
    const session = await getSessionByToken(req.params.token)
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    return reply.send({ session })
  })

  // GET /sessions/:id?tenantId= — get session with answers + plan
  app.get<{ Params: { id: string }; Querystring: { tenantId: string } }>('/sessions/:id', async (req, reply) => {
    const { tenantId } = req.query
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const session = await getSession(req.params.id, tenantId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    return reply.send({ session })
  })

  // POST /sessions/:id/answer — save a wizard step answer
  app.post<{
    Params: { id: string }
    Body: { tenantId: string; stepKey: string; question: string; answer: unknown }
  }>('/sessions/:id/answer', async (req, reply) => {
    const { tenantId, stepKey, question, answer } = req.body
    if (!tenantId || !stepKey || answer === undefined) {
      return reply.status(400).send({ error: 'tenantId, stepKey, answer required' })
    }
    const answeredCount = await saveAnswer({ sessionId: req.params.id, tenantId, stepKey, question, answer })
    return reply.send({ answeredCount, totalSteps: WIZARD_STEPS.length })
  })

  // POST /sessions/:id/detect-industry — run industry detection
  app.post<{ Params: { id: string }; Body: { tenantId: string } }>('/sessions/:id/detect-industry', async (req, reply) => {
    const { tenantId } = req.body
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const result = await detectIndustry(req.params.id, tenantId)
    return reply.send(result)
  })

  // POST /sessions/:id/generate-plan — AI generates setup plan
  app.post<{ Params: { id: string }; Body: { tenantId: string } }>('/sessions/:id/generate-plan', async (req, reply) => {
    const { tenantId } = req.body
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const plan = await generatePlan(req.params.id, tenantId)
    return reply.send({ plan })
  })

  // GET /sessions/:id/plan?tenantId= — get plan for session
  app.get<{ Params: { id: string }; Querystring: { tenantId: string } }>('/sessions/:id/plan', async (req, reply) => {
    const { tenantId } = req.query
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const plan = await getPlan(req.params.id, tenantId)
    if (!plan) return reply.status(404).send({ error: 'Plan not found' })
    return reply.send({ plan })
  })

  // POST /plans/:planId/approve — admin approves the plan
  app.post<{ Params: { planId: string }; Body: { tenantId: string; userId: string } }>('/plans/:planId/approve', async (req, reply) => {
    const { tenantId, userId } = req.body
    if (!tenantId || !userId) return reply.status(400).send({ error: 'tenantId, userId required' })
    const plan = await approvePlan(req.params.planId, tenantId, userId)
    return reply.send({ plan })
  })

  // POST /plans/:planId/apply — apply approved plan
  app.post<{ Params: { planId: string }; Body: { tenantId: string } }>('/plans/:planId/apply', async (req, reply) => {
    const { tenantId } = req.body
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const results = await applyPlan(req.params.planId, tenantId)
    return reply.send({ results })
  })

  // GET /progress?tenantId= — onboarding progress for tenant
  app.get<{ Querystring: { tenantId: string } }>('/progress', async (req, reply) => {
    const { tenantId } = req.query
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const sessions = await getProgress(tenantId)
    return reply.send({ sessions })
  })

  // GET /audit?tenantId=&sessionId= — audit logs
  app.get<{ Querystring: { tenantId: string; sessionId?: string } }>('/audit', async (req, reply) => {
    const { tenantId, sessionId } = req.query
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const logs = await getAuditLogs(tenantId, sessionId)
    return reply.send({ logs })
  })
}
