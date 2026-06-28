import { prisma } from '@reno/database'
import { createHash } from 'node:crypto'

// Supported entity types for semantic search
export type SearchEntityType =
  | 'knowledge_article'
  | 'crm_contact'
  | 'document'
  | 'employee'
  | 'helpdesk_ticket'
  | 'project'
  | 'task'

export interface SearchResult {
  id: string
  entityType: SearchEntityType
  entityId: string
  title: string
  excerpt: string
  score: number
  url: string
  metadata: Record<string, unknown>
}

// Generate embedding via Reno Brain (falls back to keyword match if no AI provider)
async function getEmbedding(tenantId: string, text: string): Promise<number[] | null> {
  try {
    // Check if tenant has an embedding-capable AI provider
    const config = await prisma.brainProviderConfig.findFirst({
      where: { tenantId, isEnabled: true, provider: { in: ['openai', 'anthropic'] } },
    })
    if (!config) return null

    // Use OpenAI embeddings if available
    if (config.provider === 'openai') {
      const { OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: (config.config as any)?.apiKey ?? '' })
      const resp = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      })
      return resp.data[0]?.embedding ?? null
    }
    return null
  } catch {
    return null
  }
}

// pgvector cosine similarity search via raw SQL (Prisma doesn't support vector ops natively)
async function vectorSearch(tenantId: string, embedding: number[], limit: number) {
  const embeddingStr = `[${embedding.join(',')}]`
  const results = await prisma.$queryRaw<Array<{
    entity_type: string
    entity_id: string
    content: string
    metadata: unknown
    similarity: number
  }>>`
    SELECT entity_type, entity_id, content, metadata,
           1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM ai_vector_embeddings
    WHERE tenant_id = ${tenantId}::uuid
      AND 1 - (embedding <=> ${embeddingStr}::vector) > 0.7
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `
  return results
}

// Keyword fallback when no embedding provider
async function keywordSearch(tenantId: string, query: string, limit: number) {
  const q = `%${query.toLowerCase()}%`
  const [articles, contacts, employees] = await Promise.all([
    prisma.kbArticle.findMany({
      where: { tenantId, deletedAt: null, OR: [{ title: { contains: query, mode: 'insensitive' } }, { body: { contains: query, mode: 'insensitive' } }] },
      take: Math.ceil(limit / 3),
      select: { id: true, title: true, body: true, slug: true },
    }),
    prisma.crmContact.findMany({
      where: { tenantId, deletedAt: null, OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] },
      take: Math.ceil(limit / 3),
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.hrEmployee.findMany({
      where: { tenantId, deletedAt: null, OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { workEmail: { contains: query, mode: 'insensitive' } }] },
      take: Math.ceil(limit / 3),
      select: { id: true, firstName: true, lastName: true, workEmail: true },
    }),
  ])

  const results: SearchResult[] = []
  articles.forEach(a => results.push({
    id: a.id, entityType: 'knowledge_article', entityId: a.id,
    title: a.title, excerpt: (a.body as string ?? '').slice(0, 150),
    score: 0.5, url: `/knowledge/${a.slug}`,
    metadata: {},
  }))
  contacts.forEach(c => results.push({
    id: c.id, entityType: 'crm_contact', entityId: c.id,
    title: `${c.firstName} ${c.lastName}`, excerpt: c.email ?? '',
    score: 0.5, url: `/crm/contacts/${c.id}`,
    metadata: { email: c.email },
  }))
  employees.forEach(e => results.push({
    id: e.id, entityType: 'employee', entityId: e.id,
    title: `${e.firstName} ${e.lastName}`, excerpt: e.workEmail ?? '',
    score: 0.5, url: `/hr/employees/${e.id}`,
    metadata: { email: e.workEmail },
  }))
  return results
}

export async function semanticSearch(
  tenantId: string,
  query: string,
  options: { limit?: number; entityTypes?: SearchEntityType[] } = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 20
  const queryHash = createHash('sha256').update(`${tenantId}:${query}`).digest('hex')

  // Check cache
  const cached = await prisma.$queryRaw<Array<{ results: unknown; expires_at: Date }>>`
    SELECT results, expires_at FROM semantic_search_cache
    WHERE tenant_id = ${tenantId}::uuid AND query_hash = ${queryHash}
    LIMIT 1
  `.catch(() => [])

  if (Array.isArray(cached) && cached[0] && new Date(cached[0].expires_at) > new Date()) {
    await prisma.$executeRaw`
      UPDATE semantic_search_cache SET hit_count = hit_count + 1
      WHERE tenant_id = ${tenantId}::uuid AND query_hash = ${queryHash}
    `.catch(() => {})
    return cached[0].results as SearchResult[]
  }

  // Try vector search
  const embedding = await getEmbedding(tenantId, query)
  if (embedding) {
    const raw = await vectorSearch(tenantId, embedding, limit)
    const results: SearchResult[] = raw.map(r => ({
      id: r.entity_id,
      entityType: r.entity_type as SearchEntityType,
      entityId: r.entity_id,
      title: (r.metadata as any)?.title ?? r.entity_id,
      excerpt: r.content.slice(0, 150),
      score: Number(r.similarity),
      url: `/${r.entity_type.replace('_', '/')}/${r.entity_id}`,
      metadata: r.metadata as Record<string, unknown>,
    }))

    // Cache results
    await prisma.$executeRaw`
      INSERT INTO semantic_search_cache (tenant_id, query_hash, query_text, results, expires_at)
      VALUES (${tenantId}::uuid, ${queryHash}, ${query}, ${JSON.stringify(results)}::jsonb, now() + interval '1 hour')
      ON CONFLICT (tenant_id, query_hash) DO UPDATE
        SET results = EXCLUDED.results, expires_at = EXCLUDED.expires_at, hit_count = semantic_search_cache.hit_count + 1
    `.catch(() => {})

    return results
  }

  // Keyword fallback
  return keywordSearch(tenantId, query, limit)
}

export async function indexEntity(
  tenantId: string,
  entityType: string,
  entityId: string,
  content: string,
  metadata: Record<string, unknown>,
  embedding?: number[],
) {
  if (!embedding) return // Skip if no embedding (will be indexed on next search)

  const embeddingStr = `[${embedding.join(',')}]`
  await prisma.$executeRaw`
    INSERT INTO ai_vector_embeddings (tenant_id, entity_type, entity_id, content, metadata, embedding)
    VALUES (${tenantId}::uuid, ${entityType}, ${entityId}, ${content}, ${JSON.stringify(metadata)}::jsonb, ${embeddingStr}::vector)
    ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE
      SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, embedding = EXCLUDED.embedding, updated_at = now()
  `.catch(() => {})
}
