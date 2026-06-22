import type { FastifyRequest } from 'fastify'
import { verifyAccessToken } from '@reno/auth'
import { prisma } from '@reno/database'
import type { RenoContext } from '@reno/core'

export interface GraphQLContext {
  req: FastifyRequest
  prisma: typeof prisma
  ctx?: RenoContext
}

export async function createContext({
  request,
}: {
  request: FastifyRequest
}): Promise<GraphQLContext> {
  const authHeader = request.headers['authorization']
  let ctx: RenoContext | undefined

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const payload = verifyAccessToken(token)
      ctx = {
        tenantId: payload.tid,
        userId: payload.sub,
        sessionId: payload.sid,
        roles: payload.roles,
        companyIds: [],
        requestId: (request.id as string) ?? crypto.randomUUID(),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      }
    } catch {
      // Invalid token — ctx remains undefined
      // Resolvers that require auth will check ctx and throw
    }
  }

  return {
    req: request,
    prisma,
    ctx,
  }
}
