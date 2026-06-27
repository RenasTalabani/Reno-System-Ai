import { prisma, type AiExecRecommendation, type AiBizPrediction } from '@reno/database'

export interface BoardMember {
  role: string
  persona: string
  focusArea: string
  riskAppetite: 'conservative' | 'moderate' | 'aggressive'
}

export interface BoardMessage {
  role: string
  message: string
  timestamp: string
  sentiment: 'positive' | 'neutral' | 'concerned' | 'opposing'
}

export interface BoardDecision {
  topic: string
  decision: string
  votes: Record<string, 'for' | 'against' | 'abstain'>
  rationale: string
}

const DEFAULT_BOARD: BoardMember[] = [
  { role: 'CEO', persona: 'Growth-focused, strategic', focusArea: 'vision & market', riskAppetite: 'moderate' },
  { role: 'CFO', persona: 'Data-driven, conservative', focusArea: 'financials & risk', riskAppetite: 'conservative' },
  { role: 'COO', persona: 'Execution-focused', focusArea: 'operations & efficiency', riskAppetite: 'moderate' },
  { role: 'CMO', persona: 'Customer-centric, creative', focusArea: 'growth & brand', riskAppetite: 'aggressive' },
  { role: 'CTO', persona: 'Innovation-driven', focusArea: 'technology & scale', riskAppetite: 'moderate' },
]

export const boardSimulationService = {
  async create(tenantId: string, userId: string, sessionName: string, agenda: string[]) {
    return prisma.aiBoardSimulation.create({
      data: {
        tenantId,
        sessionName,
        agenda: agenda as never,
        boardMembers: DEFAULT_BOARD as never,
        discussion: [] as never,
        decisions: [] as never,
        actionItems: [] as never,
        keyConflicts: [] as never,
        status: 'draft',
        createdBy: userId,
      },
    })
  },

  async simulate(id: string, tenantId: string) {
    const session = await prisma.aiBoardSimulation.findFirst({
      where: { id, tenantId },
    })
    if (!session) throw new Error('Board session not found')

    const agenda = session.agenda as string[]
    const storedMembers = session.boardMembers as unknown as BoardMember[]
    const members: BoardMember[] = storedMembers.length > 0 ? storedMembers : DEFAULT_BOARD

    const [recentRecs, recentPredictions, openOpps, pendingActions] = await Promise.all([
      prisma.aiExecRecommendation.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' }, take: 5 }).catch((): AiExecRecommendation[] => []),
      prisma.aiBizPrediction.findMany({ where: { tenantId }, orderBy: { computedAt: 'desc' }, take: 3 }).catch((): AiBizPrediction[] => []),
      prisma.crmOpportunity.count({ where: { tenantId, isActive: true, deletedAt: null } }).catch(() => 0),
      prisma.brainAction.count({ where: { tenantId, status: 'pending' } }).catch(() => 0),
    ])

    void members

    const discussion: BoardMessage[] = []
    const decisions: BoardDecision[] = []
    const actionItems: string[] = []
    const conflicts: string[] = []

    for (const agendaItem of agenda.slice(0, 5)) {
      discussion.push({
        role: 'CEO',
        message: `Let's address: ${agendaItem}. Given our ${openOpps} active opportunities and ${pendingActions} pending AI actions, what's your view?`,
        timestamp: new Date().toISOString(),
        sentiment: 'neutral',
      })

      const cfoPerspective = recentPredictions[0]
        ? `Based on AI predictions: ${recentPredictions[0].narrative.slice(0, 150)}`
        : 'We need to ensure this aligns with our budget constraints and risk thresholds.'

      discussion.push({
        role: 'CFO',
        message: cfoPerspective,
        timestamp: new Date().toISOString(),
        sentiment: 'concerned',
      })

      discussion.push({
        role: 'COO',
        message: `From an operations perspective, this requires ${pendingActions > 5 ? 'clearing the current AI action backlog first' : 'a phased rollout with clear milestones'}.`,
        timestamp: new Date().toISOString(),
        sentiment: 'neutral',
      })

      discussion.push({
        role: 'CMO',
        message: `Market opportunity here is significant. ${openOpps} active CRM opportunities suggest strong demand alignment.`,
        timestamp: new Date().toISOString(),
        sentiment: 'positive',
      })

      const techRec = recentRecs.find((r) => r.category === 'technology')
      const ctoPerspective = techRec
        ? `AI analysis suggests: ${techRec.title}`
        : 'Our technology stack can support this with appropriate planning.'

      discussion.push({
        role: 'CTO',
        message: ctoPerspective,
        timestamp: new Date().toISOString(),
        sentiment: 'positive',
      })

      const positiveVotes = discussion.filter((d) => d.sentiment === 'positive').length
      const concerned = discussion.filter((d) => d.sentiment === 'concerned').length

      decisions.push({
        topic: agendaItem,
        decision: positiveVotes > concerned ? 'Approved to proceed with conditions' : 'Deferred pending further analysis',
        votes: {
          CEO: 'for',
          CFO: concerned > 0 ? 'abstain' : 'for',
          COO: 'for',
          CMO: 'for',
          CTO: 'for',
        },
        rationale: `Based on ${positiveVotes} positive assessments vs ${concerned} concerns from board members.`,
      })

      actionItems.push(`Follow-up on "${agendaItem}" — assign owner by next board meeting`)

      if (concerned > 0) {
        conflicts.push(`CFO raised risk concerns about: ${agendaItem}`)
      }
    }

    const consensus = decisions.every((d) => d.decision.startsWith('Approved'))
      ? 'Board reached consensus on all agenda items with conditions.'
      : `Board reached partial consensus. ${decisions.filter((d) => d.decision.startsWith('Deferred')).length} items deferred for further analysis.`

    return prisma.aiBoardSimulation.update({
      where: { id },
      data: {
        discussion: discussion as never,
        decisions: decisions as never,
        actionItems: actionItems as never,
        keyConflicts: conflicts as never,
        consensus,
        status: 'completed',
        conductedAt: new Date(),
      },
    })
  },

  async list(tenantId: string, limit = 20) {
    return prisma.aiBoardSimulation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  async get(id: string, tenantId: string) {
    return prisma.aiBoardSimulation.findFirst({ where: { id, tenantId } })
  },
}
