import type { FastifyInstance } from 'fastify'
import { listTools, getToolById, getToolCategories } from '../../../brain/skill/tool-registry.service.js'
import { listCapabilities, getCapabilityById } from '../../../brain/skill/capability-registry.js'
import { getSkillExecutionStats } from '../../../brain/skill/index.js'

export async function brainSkillEngineRoutes(app: FastifyInstance) {
  // GET /brain/tools — list all tools with optional filters
  app.get('/tools', async (req, reply) => {
    const { category, module: mod } = req.query as { category?: string; module?: string }
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })

    const tools = await listTools({ category, module: mod })
    return reply.send({ tools, total: tools.length })
  })

  // GET /brain/tools/categories — list distinct tool categories
  app.get('/tools/categories', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })

    const categories = await getToolCategories()
    return reply.send({ categories })
  })

  // GET /brain/tools/:toolId — tool detail
  app.get('/tools/:toolId', async (req, reply) => {
    const { toolId } = req.params as { toolId: string }
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })

    const tool = await getToolById(toolId)
    if (!tool) return reply.status(404).send({ error: 'Tool not found' })
    return reply.send({ tool })
  })

  // GET /brain/capabilities — list all capabilities with optional filter
  app.get('/capabilities', async (req, reply) => {
    const { category } = req.query as { category?: string }
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })

    const capabilities = await listCapabilities({ category })
    return reply.send({ capabilities, total: capabilities.length })
  })

  // GET /brain/capabilities/:capabilityId — capability detail
  app.get('/capabilities/:capabilityId', async (req, reply) => {
    const { capabilityId } = req.params as { capabilityId: string }
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })

    const capability = await getCapabilityById(capabilityId)
    if (!capability) return reply.status(404).send({ error: 'Capability not found' })
    return reply.send({ capability })
  })

  // GET /brain/skill-engine/stats — execution stats for the tenant
  app.get('/skill-engine/stats', async (req, reply) => {
    const { days } = req.query as { days?: string }
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })

    const stats = await getSkillExecutionStats(tenantId, days ? parseInt(days, 10) : 30)
    return reply.send(stats)
  })
}
