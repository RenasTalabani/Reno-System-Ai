// Phase 53 — AI Document Intelligence: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  PIPELINE_TEMPLATES, simulateOcr, classifyDocument, extractFields,
  executePipelineStep, generateDocumentSummary,
} from './ai-engine.js'

export async function adiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [documents, pipelines, recentDocs] = await Promise.all([
      prisma.adiDocument.aggregate({ where: { tenantId, deletedAt: null }, _count: true }),
      prisma.adiPipeline.count({ where: { tenantId } }),
      prisma.adiDocument.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, status: true, mimeType: true, confidence: true, createdAt: true },
      }),
    ])
    const processed = await prisma.adiDocument.count({ where: { tenantId, deletedAt: null, status: 'processed' } })
    return {
      summary: generateDocumentSummary(documents._count, processed, pipelines),
      stats: { totalDocuments: documents._count, processedDocuments: processed, activePipelines: pipelines },
      recentDocuments: recentDocs,
    }
  })

  // ── Documents ──────────────────────────────────────────────────────────────
  app.get('/documents', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { status?: string; category?: string }
    const docs = await prisma.adiDocument.findMany({
      where: { tenantId, deletedAt: null, ...(q.status && { status: q.status }) },
      include: { _count: { select: { extractions: true, classifications: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { documents: docs }
  })

  app.get('/documents/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const doc = await prisma.adiDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        extractions: { orderBy: { confidence: 'desc' } },
        classifications: { orderBy: { confidence: 'desc' }, take: 1 },
      },
    })
    if (!doc) return { error: 'Not found' }
    return doc
  })

  // Upload / register a document (simulates upload, stores metadata)
  app.post('/documents/upload', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; mimeType: string; fileSize: number; storagePath?: string }
    const doc = await prisma.adiDocument.create({
      data: {
        tenantId,
        name: body.name,
        originalName: body.name,
        mimeType: body.mimeType,
        fileSize: body.fileSize,
        storagePath: body.storagePath ?? `/uploads/${tenantId}/${body.name}`,
        status: 'uploaded',
        uploadedBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'upload', module: 'adi', entityType: 'document', entityId: doc.id, newValues: { name: body.name, mimeType: body.mimeType } as never } }).catch(() => null)
    return doc
  })

  // Process a document (OCR → classify → extract)
  app.post('/documents/:id/process', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const doc = await prisma.adiDocument.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!doc) return { error: 'Not found' }

    // Run OCR
    const ocr = simulateOcr(doc.originalName, doc.mimeType, doc.fileSize)

    // Classify
    const classification = classifyDocument(ocr.rawText, doc.originalName)

    // Extract fields
    const fields = extractFields(ocr.rawText, classification.category)

    // Persist everything
    const [updatedDoc] = await Promise.all([
      prisma.adiDocument.update({
        where: { id },
        data: {
          status: 'processed',
          rawText: ocr.rawText,
          pageCount: ocr.pageCount,
          wordCount: ocr.wordCount,
          confidence: ocr.confidence,
          language: ocr.language,
          processedAt: new Date(),
        },
      }),
      prisma.adiClassification.create({
        data: {
          tenantId, documentId: id,
          category: classification.category,
          subcategory: classification.subcategory,
          confidence: classification.confidence,
          labels: classification.labels as never,
          sentiment: classification.sentiment,
          language: classification.language,
        },
      }),
      ...fields.map(f => prisma.adiExtraction.create({
        data: {
          tenantId, documentId: id,
          extractionType: f.extractionType,
          fieldName: f.fieldName,
          fieldValue: f.fieldValue,
          confidence: f.confidence,
          pageNumber: f.pageNumber,
        },
      })),
    ])

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'process', module: 'adi', entityType: 'document', entityId: id, newValues: { category: classification.category, fieldsExtracted: fields.length } as never } }).catch(() => null)
    return { document: updatedDoc, classification, extractedFields: fields.length, confidence: ocr.confidence }
  })

  app.delete('/documents/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    await prisma.adiDocument.update({ where: { id }, data: { deletedAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'delete', module: 'adi', entityType: 'document', entityId: id, newValues: {} as never } }).catch(() => null)
    return { success: true }
  })

  // ── Extractions ────────────────────────────────────────────────────────────
  app.get('/documents/:id/extractions', async (req) => {
    const { id } = req.params as { id: string }
    const extractions = await prisma.adiExtraction.findMany({ where: { documentId: id }, orderBy: { confidence: 'desc' } })
    return { extractions }
  })

  app.patch('/documents/:id/extractions/:extId/verify', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { extId } = req.params as { id: string; extId: string }
    const body = req.body as { fieldValue?: string }
    const ext = await prisma.adiExtraction.update({
      where: { id: extId },
      data: { isVerified: true, verifiedBy: userId, ...(body.fieldValue && { fieldValue: body.fieldValue }) },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'verify_extraction', module: 'adi', entityType: 'extraction', entityId: extId, newValues: body as never } }).catch(() => null)
    return ext
  })

  // ── Pipelines ──────────────────────────────────────────────────────────────
  app.get('/pipeline-templates', async () => ({ templates: PIPELINE_TEMPLATES }))

  app.post('/pipeline-templates/install', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { slug } = req.body as { slug: string }
    const tmpl = PIPELINE_TEMPLATES.find(t => t.slug === slug)
    if (!tmpl) return { error: `Template '${slug}' not found` }
    const existing = await prisma.adiPipeline.findUnique({ where: { tenantId_slug: { tenantId, slug } } })
    if (existing) return { ...existing, alreadyInstalled: true }
    const pipeline = await prisma.adiPipeline.create({
      data: { tenantId, name: tmpl.name, slug: tmpl.slug, description: tmpl.description, steps: tmpl.steps as never, inputTypes: tmpl.inputTypes as never },
    })
    return pipeline
  })

  app.get('/pipelines', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const pipelines = await prisma.adiPipeline.findMany({
      where: { tenantId }, include: { _count: { select: { runs: true } } }, orderBy: { createdAt: 'desc' },
    })
    return { pipelines }
  })

  app.post('/pipelines', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { name: string; slug: string; description?: string; steps?: unknown[]; inputTypes?: string[] }
    const pipeline = await prisma.adiPipeline.create({
      data: { tenantId, name: body.name, slug: body.slug, description: body.description, steps: (body.steps ?? []) as never, inputTypes: (body.inputTypes ?? []) as never },
    })
    return pipeline
  })

  app.patch('/pipelines/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const pipeline = await prisma.adiPipeline.update({ where: { id }, data: body as never })
    return pipeline
  })

  app.delete('/pipelines/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.adiPipeline.delete({ where: { id } })
    return { success: true }
  })

  // Run a pipeline on a document
  app.post('/pipelines/:id/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as { documentId?: string }

    const pipeline = await prisma.adiPipeline.findFirst({ where: { id, tenantId } })
    if (!pipeline) return { error: 'Pipeline not found' }

    const steps = pipeline.steps as Array<{ step: string; config: Record<string, unknown> }>

    let context: Record<string, unknown> = { documentId: body.documentId }
    let totalDurationMs = 0
    const stepOutputs: Record<string, unknown>[] = []

    let doc = body.documentId
      ? await prisma.adiDocument.findFirst({ where: { id: body.documentId, tenantId } })
      : null

    if (!doc && body.documentId) return { error: 'Document not found' }

    const mockDoc = doc ?? { name: 'sample.pdf', mimeType: 'application/pdf', fileSize: 100_000, rawText: null }

    for (const { step, config } of steps) {
      const result = executePipelineStep(step, mockDoc, config, context)
      context = { ...context, ...result.output }
      totalDurationMs += result.durationMs
      stepOutputs.push({ step, ...result.output })
    }

    const run = await prisma.adiPipelineRun.create({
      data: {
        tenantId, pipelineId: id, documentId: body.documentId ?? null,
        status: 'completed', output: { steps: stepOutputs, context } as never,
        durationMs: totalDurationMs, completedAt: new Date(),
      },
    })
    await prisma.adiPipeline.update({ where: { id }, data: { totalRuns: { increment: 1 }, lastRunAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'run_pipeline', module: 'adi', entityType: 'pipeline', entityId: id, newValues: { runId: run.id } as never } }).catch(() => null)
    return { runId: run.id, status: 'completed', steps: stepOutputs.length, durationMs: totalDurationMs, output: context }
  })

  app.get('/pipelines/:id/runs', async (req) => {
    const { id } = req.params as { id: string }
    const runs = await prisma.adiPipelineRun.findMany({ where: { pipelineId: id }, orderBy: { startedAt: 'desc' }, take: 20 })
    return { runs }
  })
}
