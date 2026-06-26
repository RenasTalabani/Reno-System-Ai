import type { RenoClient } from '../client.js'

export interface BrainQueryRequest {
  query: string
  context?: Record<string, unknown>
}

export interface BrainQueryResponse {
  answer: string
  confidence: number
  sources?: string[]
  suggestedActions?: string[]
}

export interface BrainInsight {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  category: string
  createdAt: string
}

export class BrainModule {
  constructor(private client: RenoClient) {}

  async query(data: BrainQueryRequest): Promise<BrainQueryResponse> {
    return this.client.post('/brain/query', data)
  }

  async getInsights(limit = 10): Promise<{ insights: BrainInsight[] }> {
    return this.client.get('/brain/insights', { limit })
  }
}
