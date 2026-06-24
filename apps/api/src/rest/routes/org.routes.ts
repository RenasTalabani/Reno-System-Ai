import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@reno/database'
import { RenoError, ErrorCode, buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

const CreateCompanySchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  currency: z.string().default('USD'),
  timezone: z.string().default('UTC'),
})

const CreateBranchSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional(),
  branchType: z.string().optional(),
  address: z.record(z.unknown()).optional(),
})

const CreateDepartmentSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
})

const CreateTeamSchema = z.object({
  departmentId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  leadId: z.string().uuid().optional(),
})

export async function orgRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Companies ────────────────────────────────────────────────────────────

  app.get('/companies', async (request, reply) => {
    const companies = await prisma.coreCompany.findMany({
      where: { tenantId: request.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    })
    return reply.send(buildSuccessResponse(companies))
  })

  app.post('/companies', async (request, reply) => {
    const body = CreateCompanySchema.parse(request.body)
    const company = await prisma.coreCompany.create({
      data: { tenantId: request.tenantId, ...body, createdBy: request.userId },
    })
    return reply.status(201).send(buildSuccessResponse(company))
  })

  app.get('/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const company = await prisma.coreCompany.findFirst({
      where: { id, tenantId: request.tenantId, deletedAt: null },
      include: {
        branches: { where: { deletedAt: null } },
        departments: { where: { deletedAt: null } },
      },
    })
    if (!company) throw new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found', 404)
    return reply.send(buildSuccessResponse(company))
  })

  app.put('/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateCompanySchema.partial().parse(request.body)
    const updated = await prisma.coreCompany.update({
      where: { id },
      data: { ...body, updatedBy: request.userId },
    })
    return reply.send(buildSuccessResponse(updated))
  })

  // ── Branches ─────────────────────────────────────────────────────────────

  app.get('/branches', async (request, reply) => {
    const query = request.query as { companyId?: string }
    const branches = await prisma.coreBranch.findMany({
      where: {
        tenantId: request.tenantId,
        deletedAt: null,
        ...(query.companyId && { companyId: query.companyId }),
      },
      orderBy: { name: 'asc' },
    })
    return reply.send(buildSuccessResponse(branches))
  })

  app.post('/branches', async (request, reply) => {
    const body = CreateBranchSchema.parse(request.body)
    const branch = await prisma.coreBranch.create({
      data: { tenantId: request.tenantId, ...(body as any), createdBy: request.userId },
    })
    return reply.status(201).send(buildSuccessResponse(branch))
  })

  app.put('/branches/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateBranchSchema.partial().parse(request.body)
    const updated = await prisma.coreBranch.update({
      where: { id },
      data: { ...(body as any), updatedBy: request.userId },
    })
    return reply.send(buildSuccessResponse(updated))
  })

  // ── Departments ───────────────────────────────────────────────────────────

  app.get('/departments', async (request, reply) => {
    const query = request.query as { companyId?: string; branchId?: string }
    const departments = await prisma.coreDepartment.findMany({
      where: {
        tenantId: request.tenantId,
        deletedAt: null,
        ...(query.companyId && { companyId: query.companyId }),
        ...(query.branchId && { branchId: query.branchId }),
      },
      include: { children: { where: { deletedAt: null } }, teams: { where: { deletedAt: null } } },
      orderBy: { name: 'asc' },
    })
    return reply.send(buildSuccessResponse(departments))
  })

  app.post('/departments', async (request, reply) => {
    const body = CreateDepartmentSchema.parse(request.body)
    const dept = await prisma.coreDepartment.create({
      data: { tenantId: request.tenantId, ...body, createdBy: request.userId },
    })
    return reply.status(201).send(buildSuccessResponse(dept))
  })

  app.put('/departments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateDepartmentSchema.partial().parse(request.body)
    const updated = await prisma.coreDepartment.update({
      where: { id },
      data: { ...body, updatedBy: request.userId },
    })
    return reply.send(buildSuccessResponse(updated))
  })

  app.delete('/departments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.coreDepartment.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: request.userId },
    })
    return reply.status(204).send()
  })

  // ── Teams ─────────────────────────────────────────────────────────────────

  app.get('/teams', async (request, reply) => {
    const query = request.query as { departmentId?: string }
    const teams = await prisma.coreTeam.findMany({
      where: {
        tenantId: request.tenantId,
        deletedAt: null,
        ...(query.departmentId && { departmentId: query.departmentId }),
      },
      orderBy: { name: 'asc' },
    })
    return reply.send(buildSuccessResponse(teams))
  })

  app.post('/teams', async (request, reply) => {
    const body = CreateTeamSchema.parse(request.body)
    const team = await prisma.coreTeam.create({
      data: { tenantId: request.tenantId, ...body, createdBy: request.userId },
    })
    return reply.status(201).send(buildSuccessResponse(team))
  })

  app.put('/teams/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateTeamSchema.partial().parse(request.body)
    const updated = await prisma.coreTeam.update({
      where: { id },
      data: { ...body, updatedBy: request.userId },
    })
    return reply.send(buildSuccessResponse(updated))
  })

  app.delete('/teams/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.coreTeam.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: request.userId },
    })
    return reply.status(204).send()
  })
}
