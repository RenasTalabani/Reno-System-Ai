import { prisma } from '@reno/database'

export type MemoryType = 'company' | 'customer' | 'supplier' | 'employee' | 'project' | 'financial' | 'incident' | 'decision'

export interface CreateMemoryInput {
  memoryType: MemoryType
  entityType?: string
  entityId?: string
  entityName?: string
  title: string
  content: string
  evidence?: unknown[]
  importance?: number
  confidence?: number
  tags?: string[]
  validUntil?: Date
}

export const businessMemoryService = {
  async create(tenantId: string, input: CreateMemoryInput) {
    return prisma.aiBusinessMemory.create({
      data: {
        tenantId,
        memoryType: input.memoryType,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        title: input.title,
        content: input.content,
        evidence: (input.evidence ?? []) as never,
        importance: input.importance ?? 0.5,
        confidence: input.confidence ?? 0.8,
        tags: input.tags ?? [],
        validUntil: input.validUntil,
      },
    })
  },

  async list(tenantId: string, memoryType?: MemoryType, entityId?: string, limit = 50, offset = 0) {
    return prisma.aiBusinessMemory.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(memoryType ? { memoryType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: [{ importance: 'desc' }, { learnedAt: 'desc' }],
      take: limit,
      skip: offset,
    })
  },

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    return prisma.aiBusinessMemory.findMany({
      where: { tenantId, entityType, entityId, isActive: true },
      orderBy: { importance: 'desc' },
    })
  },

  async update(id: string, tenantId: string, data: Partial<CreateMemoryInput>) {
    return prisma.aiBusinessMemory.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.content ? { content: data.content } : {}),
        ...(data.importance !== undefined ? { importance: data.importance } : {}),
        ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.evidence ? { evidence: data.evidence as never } : {}),
      },
    })
  },

  async softDelete(id: string, tenantId: string) {
    return prisma.aiBusinessMemory.update({
      where: { id },
      data: { isActive: false },
    })
  },

  async getContext(tenantId: string, entityType?: string, entityId?: string) {
    const memories = await prisma.aiBusinessMemory.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: [{ importance: 'desc' }, { confidence: 'desc' }],
      take: 20,
    })

    return memories.map((m) => ({
      type: m.memoryType,
      entity: m.entityName,
      title: m.title,
      content: m.content,
      confidence: m.confidence,
      importance: m.importance,
    }))
  },
}
