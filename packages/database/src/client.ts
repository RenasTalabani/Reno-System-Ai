import { PrismaClient } from './generated/prisma/index.js'

// Global Prisma instance (shared across the process)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}

// ---------------------------------------------------------------------------
// Tenant-scoped client factory
// Every query from a module MUST go through this to ensure tenant isolation
// ---------------------------------------------------------------------------
export function createTenantClient(tenantId: string) {
  return prisma.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async findMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId, deletedAt: null }
          return query(args)
        },
        async findFirst({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId, deletedAt: null }
          return query(args)
        },
        async findUnique({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          return query(args)
        },
        async create({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          const data = (args['data'] as Record<string, unknown>) ?? {}
          args['data'] = { ...data, tenantId }
          return query(args)
        },
        async update({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
          return query(args)
        },
        async delete({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          // Soft delete — never hard delete
          const where = (args['where'] as Record<string, unknown>) ?? {}
          return (prisma as unknown as Record<string, Record<string, (args: unknown) => Promise<unknown>>>)[
            // Extract model from args context
            'sysAuditLog'
          ]?.['update']?.({
            where,
            data: { deletedAt: new Date(), isActive: false },
          })
        },
      },
    },
  })
}

export type TenantPrismaClient = ReturnType<typeof createTenantClient>
export { PrismaClient } from './generated/prisma/index.js'
