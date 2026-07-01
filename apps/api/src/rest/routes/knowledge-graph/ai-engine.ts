export type EntityType =
  | 'customer' | 'employee' | 'project' | 'product' | 'meeting'
  | 'goal' | 'decision' | 'event' | 'contract' | 'supplier'
  | 'order' | 'document' | 'initiative' | 'signal' | 'integration' | 'department'

export type RelationType =
  | 'participates_in' | 'owns' | 'involves' | 'causes' | 'impacts'
  | 'references' | 'generates' | 'affects' | 'related_to' | 'belongs_to'
  | 'depends_on' | 'works_with' | 'created_by' | 'resolved_by'

export interface GraphEntity {
  id: string
  type: EntityType
  name: string
  externalId?: string | null
  summary?: string | null
  importance: number
  tags: string[]
}

export interface GraphRelation {
  id: string
  fromId: string
  toId: string
  type: string
  label?: string | null
  weight: number
  createdAt: Date
}

// ── Inference Map ──────────────────────────────────────────────────────────────

const INFERENCE_MAP: Record<string, { type: RelationType; label: string; weight: number }> = {
  'employee:project':    { type: 'participates_in', label: 'works on',         weight: 0.8 },
  'employee:goal':       { type: 'owns',            label: 'owns',             weight: 0.9 },
  'employee:meeting':    { type: 'participates_in', label: 'attended',         weight: 0.7 },
  'employee:decision':   { type: 'generates',       label: 'made',             weight: 0.9 },
  'employee:department': { type: 'belongs_to',      label: 'belongs to',       weight: 1.0 },
  'project:customer':    { type: 'involves',        label: 'serves',           weight: 0.8 },
  'project:goal':        { type: 'affects',         label: 'advances',         weight: 0.7 },
  'project:project':     { type: 'depends_on',      label: 'depends on',       weight: 0.6 },
  'meeting:decision':    { type: 'generates',       label: 'produced',         weight: 0.9 },
  'meeting:project':     { type: 'involves',        label: 'discussed',        weight: 0.7 },
  'decision:project':    { type: 'affects',         label: 'affects',          weight: 0.8 },
  'decision:goal':       { type: 'affects',         label: 'impacts',          weight: 0.7 },
  'signal:goal':         { type: 'impacts',         label: 'threatens/supports', weight: 0.7 },
  'initiative:goal':     { type: 'affects',         label: 'advances',         weight: 0.8 },
  'order:customer':      { type: 'involves',        label: 'placed by',        weight: 1.0 },
  'contract:customer':   { type: 'involves',        label: 'signed with',      weight: 1.0 },
  'contract:project':    { type: 'references',      label: 'covers',           weight: 0.8 },
  'supplier:product':    { type: 'involves',        label: 'supplies',         weight: 0.9 },
  'integration:supplier':{ type: 'related_to',      label: 'connects to',      weight: 0.6 },
  'document:project':    { type: 'references',      label: 'documents',        weight: 0.7 },
  'document:decision':   { type: 'references',      label: 'records',          weight: 0.8 },
  'event:decision':      { type: 'causes',          label: 'triggered',        weight: 0.8 },
  'event:project':       { type: 'affects',         label: 'impacted',         weight: 0.6 },
}

export function inferRelationType(
  typeA: string,
  typeB: string,
): { type: RelationType; label: string; weight: number } | null {
  return INFERENCE_MAP[`${typeA}:${typeB}`] ?? INFERENCE_MAP[`${typeB}:${typeA}`] ?? null
}

// ── Entity Extraction from Text ────────────────────────────────────────────────

export function extractEntitiesFromText(
  text: string,
): Array<{ name: string; type: EntityType; confidence: number }> {
  const results: Array<{ name: string; type: EntityType; confidence: number }> = []
  const seen = new Set<string>()

  const add = (name: string, type: EntityType, confidence: number) => {
    const key = `${type}:${name}`
    if (!seen.has(key) && name.length > 2) { seen.add(key); results.push({ name, type, confidence }) }
  }

  // Person names (Two Capitalized Words)
  const nameRx = /\b([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})\b/g
  const STOP_WORDS = new Set(['The Project', 'The Team', 'The Company', 'We Will', 'This Is'])
  let m: RegExpExecArray | null
  while ((m = nameRx.exec(text)) !== null) {
    const full = `${m[1]} ${m[2]}`
    if (!STOP_WORDS.has(full)) add(full, 'employee', 70)
  }

  // Projects
  const projRx = /\bProject\s+([\w\s]{2,30}?)(?=\s|,|\.|$)/gi
  while ((m = projRx.exec(text)) !== null) add(`Project ${m[1].trim()}`, 'project', 85)

  // Meetings
  const meetRx = /\b(meeting|call|sync|standup|review|session)\s+(?:on\s+)?(?:about\s+)?([\w\s]{2,30}?)(?=\s|,|\.|$)/gi
  while ((m = meetRx.exec(text)) !== null) add(`${m[1]} (${m[2].trim()})`, 'meeting', 65)

  // Decisions
  const decRx = /\b(?:decided|approved|rejected|resolved|agreed)\s+(?:to\s+)?(.{5,60}?)(?=\.|,|$)/gi
  while ((m = decRx.exec(text)) !== null) add(m[1].trim(), 'decision', 75)

  // Goals
  const goalRx = /\b(?:goal|objective|target|aim)\s*(?:is\s+)?(?:to\s+)?(.{5,50}?)(?=\.|,|$)/gi
  while ((m = goalRx.exec(text)) !== null) add(m[1].trim(), 'goal', 70)

  // Contracts
  const contractRx = /\bcontract\s+(?:with\s+)?([\w\s]{2,30}?)\b/gi
  while ((m = contractRx.exec(text)) !== null) add(`Contract: ${m[1].trim()}`, 'contract', 60)

  return results.slice(0, 20)
}

// ── BFS Graph Traversal ────────────────────────────────────────────────────────

export function traverseGraph(
  startId: string,
  allRelations: GraphRelation[],
  entityMap: Map<string, GraphEntity>,
  maxDepth = 2,
  relationTypeFilter?: string,
): { nodes: GraphEntity[]; edges: GraphRelation[]; visitedCount: number } {
  const visited = new Set<string>()
  const resultNodes: GraphEntity[] = []
  const resultEdges: GraphRelation[] = []
  const edgeIds = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }]

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (visited.has(id) || depth > maxDepth) continue
    visited.add(id)

    const entity = entityMap.get(id)
    if (entity) resultNodes.push(entity)

    if (depth < maxDepth) {
      const edges = allRelations.filter(r => {
        if (r.fromId !== id && r.toId !== id) return false
        if (relationTypeFilter && r.type !== relationTypeFilter) return false
        return true
      })
      for (const edge of edges) {
        if (!edgeIds.has(edge.id)) { edgeIds.add(edge.id); resultEdges.push(edge) }
        const nextId = edge.fromId === id ? edge.toId : edge.fromId
        if (!visited.has(nextId)) queue.push({ id: nextId, depth: depth + 1 })
      }
    }
  }

  return { nodes: resultNodes, edges: resultEdges, visitedCount: visited.size }
}

// ── Shortest Path (BFS) ────────────────────────────────────────────────────────

export function findShortestPath(
  fromId: string,
  toId: string,
  allRelations: GraphRelation[],
): { path: string[]; hops: number } | null {
  if (fromId === toId) return { path: [fromId], hops: 0 }
  const visited = new Set<string>([fromId])
  const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!
    const neighbors = allRelations
      .filter(r => r.fromId === id || r.toId === id)
      .map(r => r.fromId === id ? r.toId : r.fromId)
      .filter(n => !visited.has(n))

    for (const n of neighbors) {
      const newPath = [...path, n]
      if (n === toId) return { path: newPath, hops: newPath.length - 1 }
      visited.add(n)
      queue.push({ id: n, path: newPath })
    }
  }
  return null
}

// ── Importance Scoring (simplified PageRank) ───────────────────────────────────

const TYPE_BASE_IMPORTANCE: Record<string, number> = {
  decision: 90, goal: 85, project: 80, initiative: 75,
  employee: 70, customer: 65, contract: 60, meeting: 55,
  product: 50, order: 45, signal: 40, document: 35,
  integration: 30, department: 50, supplier: 45, event: 40,
}

export function computeImportanceScores(
  entities: Array<{ id: string; type: string }>,
  relations: GraphRelation[],
): Map<string, number> {
  const scores = new Map<string, number>()
  for (const e of entities) scores.set(e.id, TYPE_BASE_IMPORTANCE[e.type] ?? 40)

  for (const r of relations) {
    scores.set(r.fromId, (scores.get(r.fromId) ?? 40) + r.weight * 2)
    scores.set(r.toId, (scores.get(r.toId) ?? 40) + r.weight * 1.5)
  }

  const max = Math.max(...[...scores.values()], 100)
  for (const [id, score] of scores) scores.set(id, Math.min(100, Math.round((score / max) * 100)))
  return scores
}

// ── Natural Language Graph Query ───────────────────────────────────────────────

export interface QueryResult {
  answer: string
  relevantEntities: GraphEntity[]
  relevantFacts: string[]
  confidence: number
  reasoning: string
}

export function answerGraphQuery(
  question: string,
  entities: GraphEntity[],
  relations: GraphRelation[],
  facts: string[],
): QueryResult {
  const q = question.toLowerCase()
  let relevantEntities: GraphEntity[] = []
  let answer = ''
  let reasoning = ''
  let confidence = 50

  const byType = (type: string) => entities.filter(e => e.type === type)

  if (q.includes('decision') || q.includes('decided') || q.includes('approved')) {
    relevantEntities = byType('decision')
    const linked = relations.filter(r => r.type === 'generates' || r.type === 'causes')
    answer = relevantEntities.length > 0
      ? `Found ${relevantEntities.length} decision entities: ${relevantEntities.slice(0, 3).map(e => e.name).join('; ')}. ${linked.length} causal links exist in the graph.`
      : 'No decision entities in the graph yet. Create entities of type "decision" or run auto-index.'
    reasoning = 'Filtered by type=decision + generates/causes relations'
    confidence = relevantEntities.length > 0 ? 80 : 45

  } else if ((q.includes('who') || q.includes('employee') || q.includes('team')) && (q.includes('project') || q.includes('work'))) {
    const employees = byType('employee')
    const projects = byType('project')
    const links = relations.filter(r => r.type === 'participates_in')
    relevantEntities = [...employees.slice(0, 5), ...projects.slice(0, 3)]
    answer = `${employees.length} employees and ${projects.length} projects in the graph. ${links.length} participates_in relationships found. Top employees: ${employees.slice(0, 3).map(e => e.name).join(', ')}.`
    reasoning = 'Traversed employee→project participates_in relations'
    confidence = 70

  } else if (q.includes('goal') || q.includes('objective') || q.includes('kpi')) {
    const goals = byType('goal')
    const initiatives = byType('initiative')
    const signals = byType('signal')
    relevantEntities = [...goals, ...initiatives.slice(0, 2)]
    answer = `${goals.length} goals tracked in graph. ${initiatives.length} strategic initiatives and ${signals.length} external signals may impact them. ${relations.filter(r => r.type === 'affects' || r.type === 'impacts').length} impact links exist.`
    reasoning = 'Searched goal, initiative, signal entities + affects/impacts relations'
    confidence = 75

  } else if (q.includes('customer') || q.includes('client') || q.includes('contract')) {
    const customers = byType('customer')
    const contracts = byType('contract')
    relevantEntities = [...customers.slice(0, 5), ...contracts.slice(0, 3)]
    answer = `${customers.length} customer entities and ${contracts.length} contract entities in the graph. ${relations.filter(r => r.type === 'involves').length} involves relationships found.`
    reasoning = 'Filtered customer and contract entities'
    confidence = 72

  } else if (q.includes('relationship') || q.includes('connection') || q.includes('linked') || q.includes('how') || q.includes('path')) {
    relevantEntities = [...entities].sort((a, b) => b.importance - a.importance).slice(0, 5)
    answer = `The knowledge graph has ${entities.length} entities and ${relations.length} relationships. Most important: ${relevantEntities.map(e => `${e.name} (${e.type})`).join(', ')}.`
    reasoning = 'Summarized graph topology'
    confidence = 60

  } else {
    const words = q.split(/\s+/).filter(w => w.length > 3)
    relevantEntities = entities
      .filter(e => words.some(w => e.name.toLowerCase().includes(w) || e.tags.some(t => t.includes(w))))
      .slice(0, 5)

    if (relevantEntities.length > 0) {
      const rels = relations.filter(r => relevantEntities.some(e => e.id === r.fromId || e.id === r.toId))
      answer = `Found ${relevantEntities.length} matching entities: ${relevantEntities.map(e => `${e.name} (${e.type})`).join(', ')}. They have ${rels.length} relationships in the graph.`
      confidence = 65
    } else {
      answer = `No matching entities for "${question}". The graph has ${entities.length} entities across ${[...new Set(entities.map(e => e.type))].length} types. Try auto-indexing or be more specific.`
      confidence = 35
    }
    reasoning = 'Keyword search across entity names and tags'
  }

  const words = q.split(/\s+/).filter(w => w.length > 3)
  const relevantFacts = facts.filter(f => words.some(w => f.toLowerCase().includes(w)))
  if (relevantFacts.length > 0) {
    answer += ` Relevant facts: "${relevantFacts.slice(0, 2).join('" | "')}"`
    confidence = Math.min(95, confidence + 10)
  }

  return { answer, relevantEntities, relevantFacts: facts.slice(0, 5), confidence, reasoning }
}

// ── Community Detection ────────────────────────────────────────────────────────

export function detectCommunities(
  entities: Array<{ id: string; type: string; name: string; importance: number }>,
  relations: GraphRelation[],
): Array<{ name: string; type: string; entityCount: number; centralEntity: string; avgImportance: number }> {
  const byType = new Map<string, typeof entities>()
  for (const e of entities) {
    const group = byType.get(e.type) ?? []
    group.push(e)
    byType.set(e.type, group)
  }

  const communities: Array<{ name: string; type: string; entityCount: number; centralEntity: string; avgImportance: number }> = []
  for (const [type, members] of byType) {
    if (members.length === 0) continue
    const byConnections = members
      .map(e => ({ ...e, connCount: relations.filter(r => r.fromId === e.id || r.toId === e.id).length }))
      .sort((a, b) => b.connCount - a.connCount)
    const avgImportance = Math.round(members.reduce((s, e) => s + e.importance, 0) / members.length)
    communities.push({
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Community`,
      type,
      entityCount: members.length,
      centralEntity: byConnections[0]?.name ?? members[0].name,
      avgImportance,
    })
  }
  return communities.sort((a, b) => b.entityCount - a.entityCount)
}

// ── Timeline Builder ───────────────────────────────────────────────────────────

export function buildTimeline(
  facts: Array<{ content: string; createdAt: Date; importance: string; source?: string | null }>,
  relations: Array<{ type: string; label?: string | null; createdAt: Date; other?: { name: string; type: string } | null }>,
): Array<{ date: Date; kind: 'fact' | 'relation'; description: string; importance: string }> {
  const timeline: Array<{ date: Date; kind: 'fact' | 'relation'; description: string; importance: string }> = []

  for (const f of facts) {
    timeline.push({ date: f.createdAt, kind: 'fact', description: f.content, importance: f.importance })
  }
  for (const r of relations) {
    const desc = r.label
      ? `${r.label}${r.other ? ` ${r.other.name} (${r.other.type})` : ''}`
      : `${r.type.replace(/_/g, ' ')}${r.other ? ` → ${r.other.name}` : ''}`
    timeline.push({ date: r.createdAt, kind: 'relation', description: desc, importance: 'low' })
  }

  return timeline.sort((a, b) => b.date.getTime() - a.date.getTime())
}

// ── Auto-index helpers ─────────────────────────────────────────────────────────

export function buildEntitiesFromData(rawData: {
  contacts: Array<{ id: string; firstName?: string | null; lastName?: string | null; email: string }>
  employees: Array<{ id: string; firstName: string; lastName: string }>
  projects: Array<{ id: string; name: string; status?: string | null }>
  goals: Array<{ id: string; title: string }>
  initiatives: Array<{ id: string; title: string; type: string }>
}): Array<{ type: EntityType; name: string; externalId: string; externalType: string; importance: number; tags: string[]; properties: Record<string, unknown> }> {
  const entities = []

  for (const c of rawData.contacts) {
    const name = [`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(), c.email].filter(Boolean)[0]!
    entities.push({ type: 'customer' as EntityType, name, externalId: c.id, externalType: 'CrmContact', importance: 50, tags: ['crm', 'auto-indexed'], properties: { email: c.email } })
  }
  for (const e of rawData.employees) {
    const name = `${e.firstName} ${e.lastName}`.trim()
    entities.push({ type: 'employee' as EntityType, name, externalId: e.id, externalType: 'HrEmployee', importance: 60, tags: ['hr', 'auto-indexed'], properties: {} })
  }
  for (const p of rawData.projects) {
    entities.push({ type: 'project' as EntityType, name: p.name, externalId: p.id, externalType: 'PmProject', importance: 70, tags: ['pm', 'auto-indexed'], properties: { status: p.status } })
  }
  for (const g of rawData.goals) {
    entities.push({ type: 'goal' as EntityType, name: g.title, externalId: g.id, externalType: 'AgeGoal', importance: 75, tags: ['goals', 'auto-indexed'], properties: {} })
  }
  for (const i of rawData.initiatives) {
    entities.push({ type: 'initiative' as EntityType, name: i.title, externalId: i.id, externalType: 'AsoInitiative', importance: 72, tags: ['strategy', i.type, 'auto-indexed'], properties: { type: i.type } })
  }

  return entities
}
