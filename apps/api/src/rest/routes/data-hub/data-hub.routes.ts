import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

// Supported entities and their Prisma model mappings
const ENTITY_MAP: Record<string, { model: any; csvFields: string[] }> = {
  cdp_customers: {
    model: () => prisma.cdpCustomer,
    csvFields: ['email', 'firstName', 'lastName', 'company', 'phone', 'lifecycleStage'],
  },
  hr_employees: {
    model: () => prisma.hrEmployee,
    csvFields: ['employeeCode', 'firstName', 'lastName', 'email', 'position', 'department'],
  },
  crm_contacts: {
    model: () => (prisma as any).crmContact,
    csvFields: ['firstName', 'lastName', 'email', 'phone', 'company'],
  },
}

export async function dataHubRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Import ─────────────────────────────────────────────────────────────────

  app.get('/imports', async (request, reply) => {
    const { tenantId } = request as any
    const jobs = await prisma.dixImportJob.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return reply.send(buildSuccessResponse(jobs))
  })

  // POST /data-hub/imports — create import job with pre-parsed rows
  app.post('/imports', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const { entity, filename, rows, mapping } = body as { entity: string; filename: string; rows: Record<string, string>[]; mapping: Record<string, string> }

    if (!ENTITY_MAP[entity]) throw new RenoError(ErrorCode.VALIDATION_ERROR, `Unknown entity: ${entity}`, 400)

    const job = await prisma.dixImportJob.create({
      data: { tenantId, createdBy: userId, entity, filename: filename ?? `import_${entity}.csv`, totalRows: rows?.length ?? 0, mapping, status: 'processing', startedAt: new Date() },
    })

    // Run import async
    setImmediate(async () => {
      let success = 0; let errors: Array<{ row: number; error: string }> = []
      const model = ENTITY_MAP[entity].model()
      for (let i = 0; i < (rows ?? []).length; i++) {
        try {
          const raw = rows[i]
          const mapped: Record<string, unknown> = { tenantId }
          for (const [csvCol, modelField] of Object.entries(mapping)) {
            if (raw[csvCol] !== undefined) mapped[modelField] = raw[csvCol]
          }
          await (model as any).upsert({
            where: { tenantId_email: { tenantId, email: mapped.email as string } },
            create: mapped,
            update: mapped,
          }).catch(async () => { await (model as any).create({ data: mapped }) })
          success++
        } catch (e) {
          errors.push({ row: i + 1, error: (e as Error).message })
        }
      }
      await prisma.dixImportJob.update({
        where: { id: job.id },
        data: { status: errors.length === rows?.length ? 'failed' : errors.length > 0 ? 'partial' : 'completed', processedRows: (rows ?? []).length, successRows: success, errorRows: errors.length, errors: errors.slice(0, 100), finishedAt: new Date() },
      })
    })

    return reply.status(201).send(buildSuccessResponse({ jobId: job.id, status: 'processing' }))
  })

  app.get('/imports/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const job = await prisma.dixImportJob.findFirst({ where: { id, tenantId } })
    if (!job) throw new RenoError(ErrorCode.NOT_FOUND, 'Import job not found', 404)
    return reply.send(buildSuccessResponse(job))
  })

  // ── Export ─────────────────────────────────────────────────────────────────

  app.get('/exports', async (request, reply) => {
    const { tenantId } = request as any
    const jobs = await prisma.dixExportJob.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return reply.send(buildSuccessResponse(jobs))
  })

  app.post('/exports', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const { entity, format = 'csv', filters = {}, columns = [] } = body

    if (!ENTITY_MAP[entity]) throw new RenoError(ErrorCode.VALIDATION_ERROR, `Unknown entity: ${entity}`, 400)

    const job = await prisma.dixExportJob.create({
      data: { tenantId, createdBy: userId, entity, format, filters, columns, status: 'processing' },
    })

    // Run export async
    setImmediate(async () => {
      try {
        const model = ENTITY_MAP[entity].model()
        const records = await (model as any).findMany({ where: { tenantId, ...filters }, take: 10000 })
        const cols: string[] = columns.length > 0 ? columns : ENTITY_MAP[entity].csvFields
        const csv = [
          cols.join(','),
          ...records.map((r: any) => cols.map(c => JSON.stringify(r[c] ?? '')).join(',')),
        ].join('\n')

        // Store CSV as data URL (in production: upload to S3/GCS)
        const dataUrl = `data:text/csv;base64,${Buffer.from(csv).toString('base64')}`
        await prisma.dixExportJob.update({
          where: { id: job.id },
          data: { status: 'completed', rowCount: records.length, fileUrl: dataUrl, finishedAt: new Date() },
        })
      } catch (e) {
        await prisma.dixExportJob.update({ where: { id: job.id }, data: { status: 'failed', finishedAt: new Date() } })
      }
    })

    return reply.status(201).send(buildSuccessResponse({ jobId: job.id, status: 'processing' }))
  })

  app.get('/exports/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const job = await prisma.dixExportJob.findFirst({ where: { id, tenantId } })
    if (!job) throw new RenoError(ErrorCode.NOT_FOUND, 'Export job not found', 404)
    return reply.send(buildSuccessResponse(job))
  })

  // GET /data-hub/schema/:entity — return the field schema for CSV mapping UI
  app.get('/schema/:entity', async (request, reply) => {
    const { entity } = request.params as any
    const cfg = ENTITY_MAP[entity]
    if (!cfg) throw new RenoError(ErrorCode.NOT_FOUND, 'Unknown entity', 404)
    return reply.send(buildSuccessResponse({ entity, fields: cfg.csvFields }))
  })

  // GET /data-hub/entities — list supported entities
  app.get('/entities', async (_request, reply) => {
    return reply.send(buildSuccessResponse(Object.keys(ENTITY_MAP)))
  })
}
