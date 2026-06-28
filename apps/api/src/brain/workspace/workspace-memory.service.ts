import { prisma } from '@reno/database'

export async function getMemory(tenantId: string, userId: string) {
  return prisma.aiWorkspaceMemory.findMany({
    where: { tenantId, userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function setMemory(params: {
  tenantId: string; userId: string; key: string
  value: unknown; scope?: string; source?: string; ttlDays?: number
}) {
  const { tenantId, userId, key, value, scope = 'user', source, ttlDays } = params
  const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 86_400_000) : null
  return prisma.aiWorkspaceMemory.upsert({
    where: { tenantId_userId_scope_memKey: { tenantId, userId, scope, memKey: key } },
    create: { tenantId, userId, scope, memKey: key, memValue: value as any, source, expiresAt },
    update: { memValue: value as any, source, expiresAt, updatedAt: new Date() },
  })
}

export async function deleteMemory(tenantId: string, userId: string, key: string) {
  await prisma.aiWorkspaceMemory.deleteMany({ where: { tenantId, userId, memKey: key } })
}

export async function buildMemoryContext(tenantId: string, userId: string): Promise<string> {
  const memories = await getMemory(tenantId, userId)
  if (!memories.length) return ''
  const lines = memories.map(m => `- ${m.memKey}: ${JSON.stringify(m.memValue)}`).join('\n')
  return `\nUser workspace memory:\n${lines}\n`
}

export async function autoLearnFromConversation(params: {
  tenantId: string; userId: string
  userMessage: string; commandType: string
}) {
  const { tenantId, userId, userMessage, commandType } = params
  const saves: Promise<unknown>[] = []

  // Learn preferred command type
  if (commandType && commandType !== 'general') {
    saves.push(setMemory({ tenantId, userId, key: 'preferred_command', value: commandType, source: 'auto' }))
  }
  // Learn language
  const arabic = /[؀-ۿ]/.test(userMessage)
  if (arabic) {
    saves.push(setMemory({ tenantId, userId, key: 'preferred_language', value: 'ar', source: 'auto' }))
  }

  await Promise.all(saves)
}
