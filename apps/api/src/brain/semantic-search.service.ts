import { prisma } from '@reno/database'

export interface SearchResult {
  entityType: string
  entityId: string
  content: string
  score: number
  chunkIndex: number
}

export interface IndexInput {
  entityType: string
  entityId: string
  content: string
  chunkIndex?: number
  model?: string
}

interface VectorRecord {
  entityType: string
  entityId: string
  content: string
  chunkIndex: number
  embedding: number[]
}

export const semanticSearchService = {
  async index(tenantId: string, input: IndexInput, embedding: number[]) {
    return prisma.aiVectorEmbedding.upsert({
      where: {
        tenantId_entityType_entityId_chunkIndex: {
          tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
          chunkIndex: input.chunkIndex ?? 0,
        },
      },
      create: {
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        chunkIndex: input.chunkIndex ?? 0,
        content: input.content,
        embedding: embedding as never,
        model: input.model ?? 'text-embedding-3-small',
        dimensions: embedding.length,
      },
      update: {
        content: input.content,
        embedding: embedding as never,
        model: input.model ?? 'text-embedding-3-small',
        dimensions: embedding.length,
      },
    })
  },

  async search(tenantId: string, queryEmbedding: number[], entityType?: string, limit = 10): Promise<SearchResult[]> {
    const stored = await prisma.aiVectorEmbedding.findMany({
      where: { tenantId, ...(entityType ? { entityType } : {}) },
      take: 500,
    })

    const records: VectorRecord[] = stored.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      content: item.content,
      chunkIndex: item.chunkIndex,
      embedding: item.embedding as number[],
    }))

    return records
      .map((item) => ({
        entityType: item.entityType,
        entityId: item.entityId,
        content: item.content,
        chunkIndex: item.chunkIndex,
        score: this.cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .filter((r) => r.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  },

  async keywordSearch(tenantId: string, query: string, limit = 10) {
    const [articles, memories, lessons] = await Promise.all([
      prisma.kbArticle
        .findMany({
          where: {
            tenantId,
            isActive: true,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: { id: true, title: true, content: true },
          take: limit,
        })
        .catch(() => []),
      prisma.aiBusinessMemory
        .findMany({
          where: {
            tenantId,
            isActive: true,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: { id: true, title: true, content: true, memoryType: true },
          take: limit,
        })
        .catch(() => []),
      prisma.aiLessonLearned
        .findMany({
          where: {
            tenantId,
            isActive: true,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { lesson: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: { id: true, title: true, lesson: true, category: true },
          take: limit,
        })
        .catch(() => []),
    ])

    return {
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.content.slice(0, 200),
        type: 'knowledge_base',
      })),
      memories: memories.map((m) => ({
        id: m.id,
        title: m.title,
        excerpt: m.content.slice(0, 200),
        type: m.memoryType,
      })),
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        excerpt: l.lesson.slice(0, 200),
        type: 'lesson',
      })),
    }
  },

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0
    let dot = 0
    let magA = 0
    let magB = 0
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0
      const bi = b[i] ?? 0
      dot += ai * bi
      magA += ai * ai
      magB += bi * bi
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB)
    return denom === 0 ? 0 : dot / denom
  },

  async deleteEntityEmbeddings(tenantId: string, entityType: string, entityId: string) {
    return prisma.aiVectorEmbedding.deleteMany({ where: { tenantId, entityType, entityId } })
  },
}
