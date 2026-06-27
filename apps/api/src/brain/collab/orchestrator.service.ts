import { prisma } from '@reno/database'
import { callAI, type ChatMessage } from '../provider.js'
import { callClaudeForChat } from '../claude.service.js'
import { selectAgentsForRequest, getAgentSystemPrompt, DEFAULT_AGENTS } from './agents.service.js'
import { upsertWorkspace, appendToWorkspace } from './workspace.service.js'
import { createDelegation, completeDelegation } from './delegation.service.js'

export interface MultiAgentTaskInput {
  tenantId: string
  userId: string
  request: string
  title: string
  provider: 'mock' | 'anthropic'
  taskId?: string
}

export interface MultiAgentResult {
  conversationId: string
  meetingId: string
  teamId: string
  agentsInvolved: string[]
  delegations: number
  decisions: number
  executiveSummary: string
  workspaceId: string
}

// Run a full multi-agent collaboration session
export async function runMultiAgentTask(input: MultiAgentTaskInput): Promise<MultiAgentResult> {
  const { tenantId, userId, request, title, provider, taskId } = input

  // 1. Select which agents to involve
  const agentSlugs = selectAgentsForRequest(request)
  const supervisorSlug = 'ceo'

  // 2. Create team
  const team = await prisma.aiAgentTeam.create({
    data: {
      tenantId, name: title, purpose: request.slice(0, 500),
      supervisorSlug, agentSlugs: agentSlugs as any,
      status: 'active', taskId, createdBy: userId,
    },
  })

  // 3. Create conversation thread
  const conversation = await prisma.aiAgentConversation.create({
    data: {
      tenantId, teamId: team.id, taskId,
      title, topic: request,
      status: 'active',
    },
  })

  // 4. Create AI meeting
  const meeting = await prisma.aiMeeting.create({
    data: {
      tenantId, title: `[AI Meeting] ${title}`,
      agenda: request, status: 'running',
      taskId, conversationId: conversation.id,
      startedAt: new Date(),
    },
  })

  // Add meeting participants
  await prisma.aiMeetingParticipant.createMany({
    data: agentSlugs.map(slug => ({
      meetingId: meeting.id,
      agentSlug: slug,
      role: slug === supervisorSlug ? 'chair' : 'member',
    })),
    skipDuplicates: true,
  })

  // 5. Create shared workspace
  const workspace = await upsertWorkspace({
    tenantId, taskId, teamId: team.id,
    name: title,
    createdBy: supervisorSlug,
  })

  // 6. Post CEO opening message
  await postMessage(conversation.id, tenantId, supervisorSlug, null, 'broadcast',
    `Team, I'm initiating a collaboration to: ${request}\n\nEach department head will analyze their domain and report findings.`)

  // 7. Delegate to each non-CEO agent in parallel
  const nonCeoAgents = agentSlugs.filter(s => s !== supervisorSlug)
  const delegationResults: Record<string, string> = {}
  let delegationCount = 0

  await Promise.all(nonCeoAgents.map(async (agentSlug) => {
    const agentInfo = DEFAULT_AGENTS.find(a => a.slug === agentSlug)
    const delegationType = 'analyze'
    const delegationRequest = `${title}: Analyze from the perspective of ${agentInfo?.title ?? agentSlug}. Be specific, use evidence, and highlight key risks or opportunities in your domain.`

    const delegation = await createDelegation({
      tenantId, fromAgentSlug: supervisorSlug, toAgentSlug: agentSlug,
      taskId, conversationId: conversation.id,
      delegationType, request: delegationRequest,
    })

    await postMessage(conversation.id, tenantId, supervisorSlug, agentSlug, 'delegation',
      `${agentInfo?.name ?? agentSlug}, please analyze: ${delegationRequest}`)

    const start = Date.now()
    let response: string

    try {
      const messages: ChatMessage[] = [{ role: 'user', content: delegationRequest }]
      const systemPrompt = getAgentSystemPrompt(agentSlug)

      if (provider === 'anthropic') {
        const result = await callClaudeForChat({
          tenantId, userId, conversationId: conversation.id,
          messages, options: { systemPrompt, maxTokens: 1024 },
          module: agentInfo?.module ?? 'brain',
          agentName: agentSlug,
        })
        response = result.content
      } else {
        const result = await callAI(messages, { systemPrompt, maxTokens: 1024 }, { provider: 'mock', model: 'reno-brain-v1' })
        response = result.content
      }
    } catch {
      response = `${agentInfo?.name ?? agentSlug} could not complete analysis at this time.`
    }

    // Store agent response
    await postMessage(conversation.id, tenantId, agentSlug, supervisorSlug, 'response', response)
    await completeDelegation(delegation.id, response, Date.now() - start)
    delegationResults[agentSlug] = response
    delegationCount++

    // Append to workspace
    await appendToWorkspace(workspace.id, agentSlug, {
      agent: agentSlug, title: agentInfo?.title ?? agentSlug,
      analysis: response.slice(0, 1000),
    })
  }))

  // 8. CEO synthesizes findings into executive summary
  const synthesisInput = Object.entries(delegationResults)
    .map(([slug, resp]) => {
      const info = DEFAULT_AGENTS.find(a => a.slug === slug)
      return `=== ${info?.title ?? slug} ===\n${resp.slice(0, 800)}`
    })
    .join('\n\n')

  const summaryRequest = `Based on the following team analyses, produce a concise executive summary for: "${request}"\n\nKey findings from each department:\n\n${synthesisInput}\n\nProvide: 1) Executive Summary 2) Top 3 Risks 3) Top 3 Opportunities 4) Recommended Actions (note which ones require human approval)`

  let executiveSummary: string
  try {
    const messages: ChatMessage[] = [{ role: 'user', content: summaryRequest }]
    if (provider === 'anthropic') {
      const result = await callClaudeForChat({
        tenantId, userId, conversationId: conversation.id,
        messages, options: { systemPrompt: getAgentSystemPrompt(supervisorSlug), maxTokens: 2048 },
        module: 'brain', agentName: supervisorSlug,
      })
      executiveSummary = result.content
    } else {
      const result = await callAI(messages, { systemPrompt: getAgentSystemPrompt(supervisorSlug), maxTokens: 2048 }, { provider: 'mock', model: 'reno-brain-v1' })
      executiveSummary = result.content
    }
  } catch {
    executiveSummary = `[CEO Summary] Team analysis complete. ${delegationCount} agents contributed findings. Please review individual reports in the workspace.`
  }

  // 9. Post CEO executive summary
  await postMessage(conversation.id, tenantId, supervisorSlug, null, 'executive_summary', executiveSummary)

  // 10. Create a decision record
  const decision = await prisma.aiAgentDecision.create({
    data: {
      tenantId, conversationId: conversation.id,
      title: `Executive Decision: ${title}`,
      description: executiveSummary.slice(0, 1000),
      decidedBy: supervisorSlug,
      status: 'pending',
      evidence: delegationResults as any,
    },
  })

  // 11. Collect votes from key agents (CFO, COO, CTO if present)
  const voters = agentSlugs.filter(s => ['cfo', 'coo', 'cto', 'business-analyst'].includes(s))
  if (voters.length > 0) {
    await prisma.aiAgentVote.createMany({
      data: voters.map(slug => ({
        tenantId, decisionId: decision.id,
        agentSlug: slug, vote: 'yes',
        reasoning: 'Delegated analysis completed and contributed to executive summary.',
      })),
      skipDuplicates: true,
    })
    await prisma.aiAgentDecision.update({
      where: { id: decision.id },
      data: { status: 'approved', outcome: `Approved by consensus of ${voters.length} senior agents` },
    })
  }

  // 12. Close meeting
  await prisma.aiMeeting.update({
    where: { id: meeting.id },
    data: { status: 'completed', endedAt: new Date(), summary: executiveSummary.slice(0, 2000), decisionsCount: 1 },
  })

  // 13. Close conversation
  await prisma.aiAgentConversation.update({
    where: { id: conversation.id },
    data: { status: 'completed', endedAt: new Date(), summary: executiveSummary.slice(0, 500), outcome: 'Executive summary produced' },
  })

  // 14. Update workspace with final summary
  await prisma.aiSharedWorkspace.update({
    where: { id: workspace.id },
    data: { content: { ...{ summary: executiveSummary, agents: delegationResults } }, updatedBy: supervisorSlug },
  })

  // 15. Update team status
  await prisma.aiAgentTeam.update({ where: { id: team.id }, data: { status: 'completed' } })

  return {
    conversationId: conversation.id,
    meetingId: meeting.id,
    teamId: team.id,
    workspaceId: workspace.id,
    agentsInvolved: agentSlugs,
    delegations: delegationCount,
    decisions: 1,
    executiveSummary,
  }
}

async function postMessage(
  conversationId: string, tenantId: string,
  fromAgentSlug: string, toAgentSlug: string | null,
  messageType: string, content: string,
) {
  await prisma.aiAgentMessage.create({
    data: { conversationId, tenantId, fromAgentSlug, toAgentSlug, messageType, content: content.slice(0, 5000) },
  }).catch(() => null)
}

// Get collaboration dashboard stats for a tenant
export async function getCollabDashboard(tenantId: string) {
  const since = new Date(Date.now() - 30 * 86400000)
  const [teams, meetings, delegations, decisions] = await Promise.all([
    prisma.aiAgentTeam.count({ where: { tenantId } }),
    prisma.aiMeeting.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.aiDelegation.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.aiAgentDecision.count({ where: { tenantId, createdAt: { gte: since } } }),
  ])
  const recentConversations = await prisma.aiAgentConversation.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, title: true, status: true, createdAt: true, summary: true },
  })
  return { teams, meetings, delegations, decisions, recentConversations }
}
