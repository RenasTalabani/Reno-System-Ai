import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

function genClientCode(language: string, packageName: string, endpoints: string[]): string {
  switch (language) {
    case 'typescript':
      return `import { ${packageName} } from '${packageName}'\n\nconst client = new ${packageName}({ apiKey: process.env.RENO_API_KEY })\n${endpoints.slice(0, 3).map(e => `await client.request('${e}')`).join('\n')}`
    case 'python':
      return `from ${packageName.replace(/-/g, '_')} import Client\n\nclient = Client(api_key=os.environ["RENO_API_KEY"])\n${endpoints.slice(0, 3).map(e => `client.request("${e}")`).join('\n')}`
    case 'go':
      return `client := ${packageName}.NewClient(os.Getenv("RENO_API_KEY"))\n${endpoints.slice(0, 3).map(e => `client.Request("${e}")`).join('\n')}`
    default:
      return `// ${language} client for ${packageName}\n${endpoints.slice(0, 3).map(e => `// call ${e}`).join('\n')}`
  }
}

export async function sdkRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    languages: ['typescript', 'python', 'go', 'java', 'csharp', 'php', 'ruby'],
    specFormats: ['openapi-3.0', 'openapi-3.1', 'asyncapi-2.0'],
    buildStatuses: ['queued', 'building', 'succeeded', 'failed'],
    changeTypes: ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'],
  }))

  // T2: create API spec
  app.post('/specs', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, version = '1.0.0', specFormat = 'openapi-3.0', spec = {}, metadata } = req.body as any
    const endpointCount = spec.paths ? Object.keys(spec.paths).length : 0
    const created = await prisma.sdkApiSpec.create({
      data: { tenantId: r.tenantId, name, version, specFormat, spec: spec as never, endpointCount, status: 'draft', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'sdk', entityType: 'SdkApiSpec', entityId: created.id, newValues: { name, version } as never } as never }).catch(() => null)
    return created
  })

  // T3: list specs
  app.get('/specs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const specs = await prisma.sdkApiSpec.findMany({
      where: { tenantId: r.tenantId },
      select: { id: true, name: true, version: true, specFormat: true, status: true, endpointCount: true, createdAt: true, _count: { select: { builds: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { specs, total: specs.length }
  })

  // T4: get spec
  app.get('/specs/:sid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    return prisma.sdkApiSpec.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId } })
  })

  // T5: publish spec
  app.post('/specs/:sid/publish', async (req) => {
    const { sid } = req.params as any
    return prisma.sdkApiSpec.update({ where: { id: sid }, data: { status: 'published' } })
  })

  // T6: import current platform API as spec (introspection simulation)
  app.post('/specs/import-platform', async (req) => {
    const r = req as unknown as { tenantId: string }
    const paths: Record<string, unknown> = {
      '/v1/auth/login': { post: { summary: 'Login' } },
      '/v1/users': { get: { summary: 'List users' } },
      '/v1/crm/contacts': { get: { summary: 'List contacts' } },
      '/v1/finance/invoices': { get: { summary: 'List invoices' } },
      '/v1/webhooks/endpoints': { get: { summary: 'List webhook endpoints' } },
      '/v1/event-bus/streams': { get: { summary: 'List streams' } },
    }
    return prisma.sdkApiSpec.create({
      data: { tenantId: r.tenantId, name: `reno-platform-${Date.now()}`, version: '1.0.0', specFormat: 'openapi-3.0', spec: { openapi: '3.0.0', paths } as never, endpointCount: Object.keys(paths).length, status: 'published' },
    })
  })

  // T7: create target
  app.post('/targets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { language, packageName, config } = req.body as any
    return prisma.sdkTarget.create({
      data: { tenantId: r.tenantId, language, packageName, isEnabled: true, config: config as never },
    })
  })

  // T8: list targets
  app.get('/targets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const targets = await prisma.sdkTarget.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { builds: true } } } })
    return { targets, total: targets.length }
  })

  // T9: toggle target
  app.post('/targets/:tid/toggle', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const t = await prisma.sdkTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId } })
    const updated = await prisma.sdkTarget.update({ where: { id: tid }, data: { isEnabled: !t.isEnabled } })
    return { success: true, isEnabled: updated.isEnabled }
  })

  // T10: run build (simulation — generates artifact ref + log)
  app.post('/builds', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { specId, targetId } = req.body as any
    const spec = await prisma.sdkApiSpec.findFirstOrThrow({ where: { id: specId, tenantId: r.tenantId } })
    const target = await prisma.sdkTarget.findFirstOrThrow({ where: { id: targetId, tenantId: r.tenantId } })
    if (!target.isEnabled) return { error: 'target is disabled' }
    const log = [
      { step: 'parse-spec', status: 'ok', endpoints: spec.endpointCount },
      { step: 'generate-models', status: 'ok' },
      { step: 'generate-client', status: 'ok', language: target.language },
      { step: 'package', status: 'ok' },
    ]
    const build = await prisma.sdkBuild.create({
      data: {
        tenantId: r.tenantId, specId, targetId, version: spec.version, status: 'succeeded',
        artifactRef: `artifacts/sdk/${target.packageName}-${spec.version}.tar.gz`,
        sizeKb: 120 + Math.floor(Math.random() * 400),
        buildLog: log as never, finishedAt: new Date(),
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'BUILD_SDK', module: 'sdk', entityType: 'SdkBuild', entityId: build.id, newValues: { language: target.language, version: spec.version } as never } as never }).catch(() => null)
    return build
  })

  // T11: list builds
  app.get('/builds', async (req) => {
    const r = req as unknown as { tenantId: string }
    const builds = await prisma.sdkBuild.findMany({
      where: { tenantId: r.tenantId }, orderBy: { startedAt: 'desc' }, take: 100,
      include: { spec: { select: { name: true } }, target: { select: { language: true, packageName: true } } },
    })
    return { builds, total: builds.length }
  })

  // T12: get build (with log)
  app.get('/builds/:bid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { bid } = req.params as any
    return prisma.sdkBuild.findFirstOrThrow({ where: { id: bid, tenantId: r.tenantId }, include: { spec: true, target: true } })
  })

  // T13: build all enabled targets for a spec
  app.post('/specs/:sid/build-all', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const spec = await prisma.sdkApiSpec.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId } })
    const targets = await prisma.sdkTarget.findMany({ where: { tenantId: r.tenantId, isEnabled: true } })
    const builds = []
    for (const t of targets) {
      builds.push(await prisma.sdkBuild.create({
        data: {
          tenantId: r.tenantId, specId: sid, targetId: t.id, version: spec.version, status: 'succeeded',
          artifactRef: `artifacts/sdk/${t.packageName}-${spec.version}.tar.gz`, sizeKb: 120 + Math.floor(Math.random() * 400),
          buildLog: [{ step: 'all', status: 'ok' }] as never, finishedAt: new Date(),
        },
      }))
    }
    return { built: builds.length, builds }
  })

  // T14: generate snippet
  app.post('/snippets/generate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { language = 'typescript', endpoint = '/v1/users', packageName = '@reno/sdk' } = req.body as any
    const code = genClientCode(language, packageName, [endpoint])
    return prisma.sdkSnippet.create({
      data: { tenantId: r.tenantId, title: `${language} — ${endpoint}`, language, endpoint, code, description: `Auto-generated ${language} example for ${endpoint}` },
    })
  })

  // T15: list snippets
  app.get('/snippets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { language } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (language) where.language = language
    const snippets = await prisma.sdkSnippet.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
    return { snippets, total: snippets.length }
  })

  // T16: update snippet
  app.patch('/snippets/:snid', async (req) => {
    const { snid } = req.params as any
    const data = req.body as any
    return prisma.sdkSnippet.update({ where: { id: snid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T17: add changelog entry
  app.post('/changelog', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { version, changeType = 'added', summary, details, isBreaking = false } = req.body as any
    return prisma.sdkChangelog.create({
      data: { tenantId: r.tenantId, version, changeType, summary, details, isBreaking },
    })
  })

  // T18: list changelog
  app.get('/changelog', async (req) => {
    const r = req as unknown as { tenantId: string }
    const entries = await prisma.sdkChangelog.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { entries, total: entries.length }
  })

  // T19: breaking changes report
  app.get('/changelog/breaking', async (req) => {
    const r = req as unknown as { tenantId: string }
    const entries = await prisma.sdkChangelog.findMany({ where: { tenantId: r.tenantId, isBreaking: true }, orderBy: { createdAt: 'desc' } })
    return { entries, total: entries.length }
  })

  // T20: record download
  app.post('/builds/:bid/download', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { bid } = req.params as any
    const build = await prisma.sdkBuild.findFirstOrThrow({ where: { id: bid, tenantId: r.tenantId }, include: { target: true } })
    await prisma.sdkDownload.create({
      data: { tenantId: r.tenantId, buildRef: build.artifactRef ?? bid, language: build.target.language, version: build.version, downloadedBy: r.userId },
    })
    return { success: true, artifactRef: build.artifactRef }
  })

  // T21: download analytics
  app.get('/downloads/analytics', async (req) => {
    const r = req as unknown as { tenantId: string }
    const downloads = await prisma.sdkDownload.findMany({ where: { tenantId: r.tenantId }, take: 1000 })
    const byLanguage: Record<string, number> = {}
    for (const d of downloads) byLanguage[d.language] = (byLanguage[d.language] ?? 0) + 1
    return { total: downloads.length, byLanguage }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [specs, targets, builds, snippets, changelogs, downloads] = await Promise.all([
      prisma.sdkApiSpec.count({ where: { tenantId: r.tenantId } }),
      prisma.sdkTarget.count({ where: { tenantId: r.tenantId } }),
      prisma.sdkBuild.count({ where: { tenantId: r.tenantId } }),
      prisma.sdkSnippet.count({ where: { tenantId: r.tenantId } }),
      prisma.sdkChangelog.count({ where: { tenantId: r.tenantId } }),
      prisma.sdkDownload.count({ where: { tenantId: r.tenantId } }),
    ])
    return { specs, targets, builds, snippets, changelogEntries: changelogs, downloads }
  })

  // T23: spec diff (compares endpoint sets of two specs)
  app.post('/specs/diff', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fromSpecId, toSpecId } = req.body as any
    const [from, to] = await Promise.all([
      prisma.sdkApiSpec.findFirstOrThrow({ where: { id: fromSpecId, tenantId: r.tenantId } }),
      prisma.sdkApiSpec.findFirstOrThrow({ where: { id: toSpecId, tenantId: r.tenantId } }),
    ])
    const fromPaths = Object.keys((from.spec as any)?.paths ?? {})
    const toPaths = Object.keys((to.spec as any)?.paths ?? {})
    const added = toPaths.filter(p => !fromPaths.includes(p))
    const removed = fromPaths.filter(p => !toPaths.includes(p))
    return { added, removed, unchanged: toPaths.filter(p => fromPaths.includes(p)).length, breaking: removed.length > 0 }
  })

  // T24: quickstart doc (generated)
  app.get('/quickstart/:language', async (req) => {
    const { language } = req.params as any
    const code = genClientCode(language, '@reno/sdk', ['/v1/auth/login', '/v1/users', '/v1/crm/contacts'])
    return { language, steps: ['Install the package', 'Set RENO_API_KEY', 'Initialize the client', 'Make your first call'], code }
  })

  // T25: delete snippet
  app.delete('/snippets/:snid', async (req) => {
    const { snid } = req.params as any
    await prisma.sdkSnippet.delete({ where: { id: snid } })
    return { success: true }
  })

  // T26: delete target
  app.delete('/targets/:tid', async (req) => {
    const { tid } = req.params as any
    await prisma.sdkTarget.delete({ where: { id: tid } })
    return { success: true }
  })

  // T27: delete changelog entry
  app.delete('/changelog/:clid', async (req) => {
    const { clid } = req.params as any
    await prisma.sdkChangelog.delete({ where: { id: clid } })
    return { success: true }
  })

  // T28: delete spec
  app.delete('/specs/:sid', async (req) => {
    const { sid } = req.params as any
    await prisma.sdkApiSpec.delete({ where: { id: sid } })
    return { success: true }
  })
}
