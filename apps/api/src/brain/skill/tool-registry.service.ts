import { prisma } from '@reno/database'
import { TOOL_REGISTRY } from '../tools/registry.js'

export interface ToolRegistryEntry {
  toolId: string
  name: string
  description: string
  category: string
  module: string | null
  version: string
  owner: string
  requiredPermissions: string[]
  riskLevel: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown> | null
  isDestructive: boolean
  requiresApproval: boolean
  deprecated: boolean
  replacementToolId: string | null
  isEnabled: boolean
  keywords: string[]
}

// Fetch all enabled tools from DB, falling back to code registry if DB is empty
export async function listTools(filters?: {
  category?: string
  module?: string
  isEnabled?: boolean
  includeDeprecated?: boolean
}): Promise<ToolRegistryEntry[]> {
  try {
    const where: any = {}
    if (filters?.category) where.category = filters.category
    if (filters?.module) where.module = filters.module
    if (filters?.isEnabled !== undefined) where.isEnabled = filters.isEnabled
    else where.isEnabled = true
    if (!filters?.includeDeprecated) where.deprecated = false

    const tools = await prisma.aiToolRegistry.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    if (tools.length > 0) {
      return tools.map(t => ({
        toolId: t.toolId,
        name: t.name,
        description: t.description,
        category: t.category,
        module: t.module,
        version: t.version,
        owner: t.owner,
        requiredPermissions: t.requiredPermissions as string[],
        riskLevel: t.riskLevel,
        inputSchema: t.inputSchema as Record<string, unknown>,
        outputSchema: t.outputSchema as Record<string, unknown> | null,
        isDestructive: t.isDestructive,
        requiresApproval: t.requiresApproval,
        deprecated: t.deprecated,
        replacementToolId: t.replacementToolId,
        isEnabled: t.isEnabled,
        keywords: t.keywords as string[],
      }))
    }
  } catch {
    // DB not yet migrated — fall through to code registry
  }

  // Fallback: code registry
  return TOOL_REGISTRY
    .filter(t => {
      if (filters?.category && t.category !== filters.category) return false
      return true
    })
    .map(t => ({
      toolId: t.name,
      name: t.label,
      description: t.description,
      category: t.category,
      module: t.requiredModules[0] ?? null,
      version: '1.0.0',
      owner: 'reno',
      requiredPermissions: [],
      riskLevel: t.isDestructive ? 'critical' : t.requiresApproval ? 'medium' : 'low',
      inputSchema: {},
      outputSchema: null,
      isDestructive: t.isDestructive,
      requiresApproval: t.requiresApproval,
      deprecated: false,
      replacementToolId: null,
      isEnabled: true,
      keywords: [],
    }))
}

export async function getToolById(toolId: string): Promise<ToolRegistryEntry | null> {
  try {
    const tool = await prisma.aiToolRegistry.findUnique({ where: { toolId } })
    if (tool) {
      return {
        toolId: tool.toolId,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        module: tool.module,
        version: tool.version,
        owner: tool.owner,
        requiredPermissions: tool.requiredPermissions as string[],
        riskLevel: tool.riskLevel,
        inputSchema: tool.inputSchema as Record<string, unknown>,
        outputSchema: tool.outputSchema as Record<string, unknown> | null,
        isDestructive: tool.isDestructive,
        requiresApproval: tool.requiresApproval,
        deprecated: tool.deprecated,
        replacementToolId: tool.replacementToolId,
        isEnabled: tool.isEnabled,
        keywords: tool.keywords as string[],
      }
    }
  } catch {
    // ignore
  }
  return null
}

export async function getToolCategories(): Promise<string[]> {
  try {
    const results = await prisma.aiToolRegistry.findMany({
      where: { isEnabled: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    return results.map(r => r.category)
  } catch {
    const cats = new Set(TOOL_REGISTRY.map(t => t.category))
    return Array.from(cats)
  }
}
