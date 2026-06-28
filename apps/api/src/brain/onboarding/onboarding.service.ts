import { prisma } from '@reno/database'
import { randomBytes } from 'crypto'
import { detectIndustryFromAnswers, getTemplate } from './industry.service.js'

export const WIZARD_STEPS = [
  { key: 'company_name',   question: 'What is your company name?' },
  { key: 'company_type',   question: 'What type of business are you? (e.g. Gym, Logistics, Manufacturing, Retail, Healthcare, Education, Consulting, Other)' },
  { key: 'company_size',   question: 'How large is your company? (Startup: 1–10 employees, Small: 11–50, Medium: 51–200, Enterprise: 200+)' },
  { key: 'country',        question: 'Which country are you based in?' },
  { key: 'currency',       question: 'What is your primary currency? (e.g. USD, EUR, GBP, IQD)' },
  { key: 'branches',       question: 'How many branches or locations do you operate?' },
  { key: 'employees',      question: 'How many employees do you currently have?' },
  { key: 'services',       question: 'What services do you offer? (comma-separated, or type N/A)' },
  { key: 'products',       question: 'What products do you sell? (comma-separated, or type N/A)' },
  { key: 'goals',          question: 'What are your top 3 business goals for this year? (comma-separated)' },
] as const

export type WizardStepKey = typeof WIZARD_STEPS[number]['key']

export async function startSession(tenantId: string) {
  const resumeToken = randomBytes(24).toString('hex')
  const session = await prisma.aiOnboardingSession.create({
    data: {
      tenantId,
      status: 'in_progress',
      totalSteps: WIZARD_STEPS.length,
      resumeToken,
    },
  })
  await _auditLog(session.id, tenantId, 'session_started', {})
  return session
}

export async function getSession(sessionId: string, tenantId: string) {
  return prisma.aiOnboardingSession.findFirst({
    where: { id: sessionId, tenantId },
    include: { answers: { orderBy: { answeredAt: 'asc' } }, plans: { include: { items: { orderBy: { order: 'asc' } } } } },
  })
}

export async function getSessionByToken(token: string) {
  return prisma.aiOnboardingSession.findUnique({
    where: { resumeToken: token },
    include: { answers: true },
  })
}

export async function getActiveSession(tenantId: string) {
  return prisma.aiOnboardingSession.findFirst({
    where: { tenantId, status: { in: ['in_progress', 'plan_generated'] } },
    orderBy: { createdAt: 'desc' },
    include: { answers: true },
  })
}

export async function saveAnswer(params: {
  sessionId: string
  tenantId: string
  stepKey: string
  question: string
  answer: unknown
}) {
  const { sessionId, tenantId, stepKey, question, answer } = params

  await prisma.aiOnboardingAnswer.upsert({
    where: { sessionId_stepKey: { sessionId, stepKey } },
    create: { sessionId, tenantId, stepKey, question, answer: answer as any },
    update: { answer: answer as any, answeredAt: new Date() },
  })

  // Advance step counter
  const answeredCount = await prisma.aiOnboardingAnswer.count({ where: { sessionId } })
  await prisma.aiOnboardingSession.update({
    where: { id: sessionId },
    data: { currentStep: answeredCount, [stepKey]: typeof answer === 'string' ? answer : undefined },
  })

  await _auditLog(sessionId, tenantId, 'step_answered', { stepKey, answer })
  return answeredCount
}

export async function detectIndustry(sessionId: string, tenantId: string) {
  const session = await prisma.aiOnboardingSession.findFirst({
    where: { id: sessionId, tenantId },
    include: { answers: true },
  })
  if (!session) throw new Error('Session not found')

  const answersMap: Record<string, unknown> = {}
  for (const a of session.answers) {
    answersMap[a.stepKey] = a.answer
  }

  const { industry, confidence } = detectIndustryFromAnswers(answersMap)

  await prisma.aiOnboardingSession.update({
    where: { id: sessionId },
    data: { detectedIndustry: industry, industryConf: confidence },
  })

  await _auditLog(sessionId, tenantId, 'industry_detected', { industry, confidence })
  return { industry, confidence }
}

export async function generatePlan(sessionId: string, tenantId: string) {
  const session = await prisma.aiOnboardingSession.findFirst({
    where: { id: sessionId, tenantId },
    include: { answers: true },
  })
  if (!session) throw new Error('Session not found')

  const industry = session.detectedIndustry ?? 'services'
  const template = await getTemplate(industry)
  if (!template) throw new Error(`Template not found for industry: ${industry}`)

  const answersMap: Record<string, unknown> = {}
  for (const a of session.answers) answersMap[a.stepKey] = a.answer

  const companyName = String(answersMap['company_name'] ?? 'Your Company')
  const companySize = String(answersMap['company_size'] ?? 'small')
  const country = String(answersMap['country'] ?? '')
  const currency = String(answersMap['currency'] ?? 'USD')

  const summary = `AI Setup Plan for ${companyName} — ${template.name}\n\nBased on your business profile (${companySize}, ${country}, ${currency}), Reno recommends the following configuration to get you fully operational. This plan includes ${template.modules.length} modules, ${template.roles.length} roles, ${template.workflows.length} automated workflows, and ${template.agents.length} AI digital employees.`

  const plan = await prisma.aiOnboardingPlan.create({
    data: {
      tenantId,
      sessionId,
      industry,
      templateUsed: template.slug,
      summary,
      status: 'pending',
    },
  })

  const items: Array<{
    planId: string; category: string; title: string; description: string
    config?: unknown; order: number
  }> = []

  let order = 0
  for (const mod of template.modules) {
    items.push({ planId: plan.id, category: 'module', title: `Enable ${_moduleLabel(mod)} Module`, description: `Activate the ${_moduleLabel(mod)} module for your tenant.`, config: { moduleSlug: mod }, order: order++ })
  }
  for (const role of template.roles) {
    items.push({ planId: plan.id, category: 'role', title: `Create Role: ${role.name}`, description: `Set up the "${role.name}" role with appropriate permissions.`, config: { roleName: role.name, permissions: role.permissions }, order: order++ })
  }
  for (const wf of template.workflows) {
    items.push({ planId: plan.id, category: 'workflow', title: `Setup Workflow: ${wf.name}`, description: wf.description, config: { workflowName: wf.name }, order: order++ })
  }
  for (const db of template.dashboards) {
    items.push({ planId: plan.id, category: 'dashboard', title: `Configure Dashboard: ${db.name}`, description: `Create the ${db.name} with key performance widgets.`, config: { dashboardName: db.name, widgets: db.widgets }, order: order++ })
  }
  for (const report of template.reports) {
    items.push({ planId: plan.id, category: 'report', title: `Enable Report: ${report}`, description: `Configure and schedule the "${report}" report.`, config: { reportName: report }, order: order++ })
  }
  for (const agent of template.agents) {
    items.push({ planId: plan.id, category: 'agent', title: `Activate AI Agent: ${_agentLabel(agent)}`, description: `Enable the ${_agentLabel(agent)} digital employee for automated ${industry} tasks.`, config: { agentSlug: agent }, order: order++ })
  }

  await prisma.aiOnboardingPlanItem.createMany({ data: items as any })
  await prisma.aiOnboardingSession.update({ where: { id: sessionId }, data: { status: 'plan_generated' } })
  await _auditLog(sessionId, tenantId, 'plan_generated', { planId: plan.id, industry, itemCount: items.length })

  return prisma.aiOnboardingPlan.findUnique({ where: { id: plan.id }, include: { items: { orderBy: { order: 'asc' } } } })
}

export async function getPlan(sessionId: string, tenantId: string) {
  return prisma.aiOnboardingPlan.findFirst({
    where: { sessionId, tenantId },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { order: 'asc' } } },
  })
}

export async function approvePlan(planId: string, tenantId: string, userId: string) {
  const plan = await prisma.aiOnboardingPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan not found')
  if (plan.status !== 'pending') throw new Error(`Plan is already ${plan.status}`)

  const updated = await prisma.aiOnboardingPlan.update({
    where: { id: planId },
    data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
  })
  await _auditLog(plan.sessionId, tenantId, 'plan_approved', { planId, userId })
  return updated
}

export async function applyPlan(planId: string, tenantId: string) {
  const plan = await prisma.aiOnboardingPlan.findFirst({
    where: { id: planId, tenantId },
    include: { items: { orderBy: { order: 'asc' } } },
  })
  if (!plan) throw new Error('Plan not found')
  if (plan.status !== 'approved') throw new Error('Plan must be approved before applying')

  await prisma.aiOnboardingPlan.update({ where: { id: planId }, data: { status: 'applying' } })

  const results: Array<{ id: string; title: string; status: string; error?: string }> = []

  for (const item of plan.items) {
    try {
      await prisma.aiOnboardingPlanItem.update({
        where: { id: item.id },
        data: { status: 'applied', appliedAt: new Date() },
      })
      results.push({ id: item.id, title: item.title, status: 'applied' })
    } catch (err: any) {
      await prisma.aiOnboardingPlanItem.update({
        where: { id: item.id },
        data: { status: 'failed', error: String(err?.message ?? err) },
      })
      results.push({ id: item.id, title: item.title, status: 'failed', error: String(err?.message ?? err) })
    }
  }

  await prisma.aiOnboardingPlan.update({
    where: { id: planId },
    data: { status: 'applied', appliedAt: new Date() },
  })
  await prisma.aiOnboardingSession.update({
    where: { id: plan.sessionId },
    data: { status: 'applied', completedAt: new Date() },
  })
  await _auditLog(plan.sessionId, tenantId, 'setup_applied', { planId, results })
  return results
}

export async function getProgress(tenantId: string) {
  const sessions = await prisma.aiOnboardingSession.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { _count: { select: { answers: true } } },
  })
  return sessions
}

export async function getAuditLogs(tenantId: string, sessionId?: string) {
  const where: any = { tenantId }
  if (sessionId) where.sessionId = sessionId
  return prisma.aiOnboardingAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
}

async function _auditLog(sessionId: string, tenantId: string, action: string, details: unknown) {
  await prisma.aiOnboardingAuditLog.create({ data: { sessionId, tenantId, action, details: details as any } })
}

function _moduleLabel(slug: string): string {
  const MAP: Record<string, string> = {
    hr: 'Human Resources', attendance: 'Attendance', sales: 'Sales', finance: 'Finance',
    crm: 'CRM', inventory: 'Inventory', procurement: 'Procurement', manufacturing: 'Manufacturing',
    analytics: 'Analytics', brain: 'Reno Brain', portal_customer: 'Customer Portal',
    portal_employee: 'Employee Portal', helpdesk: 'Helpdesk', comm: 'Communication',
    docs: 'Documents', marketplace: 'Marketplace', pm: 'Project Management', automation: 'Automation',
  }
  return MAP[slug] ?? slug
}

function _agentLabel(slug: string): string {
  const MAP: Record<string, string> = {
    ceo: 'CEO', coo: 'COO', cfo: 'CFO', cto: 'CTO',
    'hr-director': 'HR Director', 'sales-director': 'Sales Director',
    'marketing-director': 'Marketing Director', 'cs-manager': 'Customer Success Manager',
    'support-manager': 'Support Manager', 'data-analyst': 'Data Analyst',
    'project-manager': 'Project Manager', 'compliance-officer': 'Compliance Officer',
    'legal-advisor': 'Legal Advisor', 'procurement-director': 'Procurement Director',
    'inventory-manager': 'Inventory Manager', 'production-director': 'Production Director',
    'business-analyst': 'Business Analyst', 'automation-manager': 'Automation Manager',
    'security-officer': 'Security Officer', 'finance-manager': 'Finance Manager',
  }
  return MAP[slug] ?? slug
}
