import type { FastifyInstance } from 'fastify'
import { prisma, type DepDeploymentLog } from '@reno/database'
import os from 'node:os'
import process from 'node:process'

export async function deploymentRoutes(app: FastifyInstance) {
  // POST /v1/deployment/log — record a deployment event (CI/CD token required)
  app.post('/log', async (request, reply) => {
    const token = request.headers['authorization']?.replace('Bearer ', '')
    const deployToken = process.env['DEPLOY_TOKEN'] ?? process.env['RESTORE_APPROVAL_TOKEN']
    if (!deployToken || token !== deployToken) {
      return reply.status(401).send({ error: 'Invalid deploy token' })
    }

    const body = request.body as {
      version: string
      environment: string
      strategy?: string
      commitSha?: string
      branch?: string
      deployedBy?: string
      healthCheckPassed?: boolean
      migrationRan?: boolean
      testsPassed?: boolean
      rollbackReason?: string
      durationMs?: number
      previousVersion?: string
      metadata?: Record<string, unknown>
    }

    const log = await prisma.depDeploymentLog.create({
      data: {
        version: body.version,
        environment: body.environment,
        strategy: body.strategy ?? 'rolling',
        status: 'completed',
        commitSha: body.commitSha,
        branch: body.branch,
        deployedBy: body.deployedBy,
        healthCheckPassed: body.healthCheckPassed ?? false,
        migrationRan: body.migrationRan ?? false,
        testsPassed: body.testsPassed ?? false,
        rollbackReason: body.rollbackReason,
        durationMs: body.durationMs,
        previousVersion: body.previousVersion,
        metadata: (body.metadata ?? {}) as never,
        completedAt: new Date(),
      },
    })

    return reply.status(201).send({ id: log.id, recorded: true })
  })

  // GET /v1/deployment/logs — paginated audit log
  app.get('/logs', async (request, reply) => {
    const { environment, limit = '20', offset = '0' } = request.query as {
      environment?: string
      limit?: string
      offset?: string
    }

    const where = environment ? { environment } : {}

    const [logs, total] = await Promise.all([
      prisma.depDeploymentLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: Math.min(Number(limit), 100),
        skip: Number(offset),
      }),
      prisma.depDeploymentLog.count({ where }),
    ])

    return { logs, total, limit: Number(limit), offset: Number(offset) }
  })

  // GET /v1/deployment/dashboard — deployment health summary
  app.get('/dashboard', async (_request, reply) => {
    const [latest, recentLogs, byEnv] = await Promise.all([
      prisma.depDeploymentLog.findFirst({ orderBy: { startedAt: 'desc' } }),
      prisma.depDeploymentLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.depDeploymentLog.groupBy({
        by: ['environment', 'status'],
        _count: { id: true },
        orderBy: { environment: 'asc' },
      }),
    ])

    const successRate =
      recentLogs.length === 0
        ? 100
        : Math.round(
            (recentLogs.filter((l: DepDeploymentLog) => l.status === 'completed' && l.healthCheckPassed).length /
              recentLogs.length) *
              100
          )

    const rollbackCount = recentLogs.filter((l: DepDeploymentLog) => l.strategy === 'rollback').length

    return {
      latestDeployment: latest,
      successRate,
      rollbacksInLast10: rollbackCount,
      deploymentsByEnvironment: byEnv,
      recentDeployments: recentLogs,
    }
  })

  // GET /v1/deployment/env-validation — runtime env validation endpoint
  app.get('/env-validation', async (_request, reply) => {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'BACKUP_ENCRYPTION_KEY',
      'RESTORE_APPROVAL_TOKEN',
      'OPENAI_API_KEY',
    ]

    const results: { variable: string; present: boolean; minLength?: boolean }[] = []
    let allPassed = true

    const minLengths: Record<string, number> = {
      JWT_SECRET: 64,
      JWT_REFRESH_SECRET: 64,
      ENCRYPTION_KEY: 32,
      BACKUP_ENCRYPTION_KEY: 32,
    }

    for (const key of required) {
      const val = process.env[key]
      const present = Boolean(val && val.length > 0)
      const minLen = minLengths[key]
      const minLengthOk = minLen ? (val?.length ?? 0) >= minLen : undefined

      if (!present || minLengthOk === false) allPassed = false

      results.push({ variable: key, present, ...(minLen !== undefined ? { minLength: minLengthOk } : {}) })
    }

    return reply.status(allPassed ? 200 : 422).send({
      valid: allPassed,
      checks: results,
      nodeVersion: process.version,
      hostname: os.hostname(),
      uptime: Math.floor(process.uptime()),
    })
  })

  // GET /v1/deployment/rollback-candidates — list versions available to roll back to
  app.get('/rollback-candidates', async (request, reply) => {
    const { environment = 'production' } = request.query as { environment?: string }

    const logs = await prisma.depDeploymentLog.findMany({
      where: {
        environment,
        status: 'completed',
        healthCheckPassed: true,
        strategy: { not: 'rollback' },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { id: true, version: true, startedAt: true, commitSha: true, branch: true },
    })

    return { environment, candidates: logs }
  })
}
