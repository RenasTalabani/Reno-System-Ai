export type NodeStatus = 'pending' | 'running' | 'success' | 'error' | 'proposed' | 'skipped'

export interface ExecutionNode {
  toolId: string
  order: number
  status: NodeStatus
  startedAt?: number
  completedAt?: number
  durationMs?: number
  proposalId?: string
  error?: string
}

export interface ExecutionGraphSummary {
  nodes: ExecutionNode[]
  totalDurationMs: number
  successCount: number
  proposalCount: number
  errorCount: number
  toolsUsed: string[]
  proposalIds: string[]
}

export class ExecutionGraph {
  private nodes: Map<string, ExecutionNode> = new Map()
  private orderCounter = 0
  private startTime = Date.now()

  addNode(toolId: string): void {
    if (!this.nodes.has(toolId)) {
      this.nodes.set(toolId, {
        toolId,
        order: ++this.orderCounter,
        status: 'pending',
      })
    }
  }

  markRunning(toolId: string): void {
    const node = this.getOrCreate(toolId)
    node.status = 'running'
    node.startedAt = Date.now()
  }

  markSuccess(toolId: string, proposalId?: string): void {
    const node = this.getOrCreate(toolId)
    node.status = proposalId ? 'proposed' : 'success'
    node.completedAt = Date.now()
    node.durationMs = node.startedAt ? node.completedAt - node.startedAt : undefined
    if (proposalId) node.proposalId = proposalId
  }

  markError(toolId: string, error: string): void {
    const node = this.getOrCreate(toolId)
    node.status = 'error'
    node.completedAt = Date.now()
    node.durationMs = node.startedAt ? node.completedAt - node.startedAt : undefined
    node.error = error
  }

  toSummary(): ExecutionGraphSummary {
    const nodes = Array.from(this.nodes.values()).sort((a, b) => a.order - b.order)
    const successCount = nodes.filter(n => n.status === 'success').length
    const proposalCount = nodes.filter(n => n.status === 'proposed').length
    const errorCount = nodes.filter(n => n.status === 'error').length

    return {
      nodes,
      totalDurationMs: Date.now() - this.startTime,
      successCount,
      proposalCount,
      errorCount,
      toolsUsed: nodes.filter(n => n.status !== 'pending').map(n => n.toolId),
      proposalIds: nodes.filter(n => n.proposalId).map(n => n.proposalId!),
    }
  }

  private getOrCreate(toolId: string): ExecutionNode {
    if (!this.nodes.has(toolId)) {
      this.addNode(toolId)
    }
    return this.nodes.get(toolId)!
  }
}
