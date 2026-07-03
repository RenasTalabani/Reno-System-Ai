import type { FastifyInstance } from 'fastify'
import { workflowAutomationRoutes, workflowTriggerRoute } from './routes.js'

export async function workflowAutomationModuleRoutes(app: FastifyInstance) {
  await app.register(workflowAutomationRoutes, { prefix: '/workflow-automation' })
  await app.register(workflowTriggerRoute, { prefix: '' })
}
