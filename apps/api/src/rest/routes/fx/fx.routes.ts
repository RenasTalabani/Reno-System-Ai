import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function fxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /fx/currencies — list all currencies
  app.get('/currencies', async (_request, reply) => {
    const currencies = await prisma.fxCurrency.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } })
    return reply.send(buildSuccessResponse(currencies))
  })

  // ── Settings ───────────────────────────────────────────────────────────────

  app.get('/settings', async (request, reply) => {
    const { tenantId } = request as any
    const settings = await prisma.fxTenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, baseCurrency: 'USD', enabledCurrencies: ['USD'] },
      update: {},
    })
    return reply.send(buildSuccessResponse(settings))
  })

  app.put('/settings', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const settings = await prisma.fxTenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, baseCurrency: body.baseCurrency ?? 'USD', enabledCurrencies: body.enabledCurrencies ?? ['USD'] },
      update: { baseCurrency: body.baseCurrency, enabledCurrencies: body.enabledCurrencies, autoUpdateRates: body.autoUpdateRates, rateSource: body.rateSource },
    })
    return reply.send(buildSuccessResponse(settings))
  })

  // ── Exchange Rates ─────────────────────────────────────────────────────────

  app.get('/rates', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const date = q.date ?? new Date().toISOString().slice(0, 10)
    const rates = await prisma.fxRate.findMany({ where: { tenantId, effectiveDate: { lte: new Date(date) } }, orderBy: [{ fromCurrency: 'asc' }, { effectiveDate: 'desc' }] })
    // De-dup: keep latest rate per pair
    const latest = new Map<string, typeof rates[0]>()
    for (const r of rates) {
      const key = `${r.fromCurrency}_${r.toCurrency}`
      if (!latest.has(key)) latest.set(key, r)
    }
    return reply.send(buildSuccessResponse([...latest.values()]))
  })

  app.post('/rates', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const rate = await prisma.fxRate.upsert({
      where: { tenantId_fromCurrency_toCurrency_effectiveDate: { tenantId, fromCurrency: body.fromCurrency, toCurrency: body.toCurrency, effectiveDate: new Date(body.effectiveDate ?? new Date().toISOString().slice(0, 10)) } },
      create: { tenantId, fromCurrency: body.fromCurrency, toCurrency: body.toCurrency, rate: body.rate, source: body.source ?? 'manual', effectiveDate: new Date(body.effectiveDate ?? new Date().toISOString().slice(0, 10)) },
      update: { rate: body.rate, source: body.source ?? 'manual' },
    })
    return reply.status(201).send(buildSuccessResponse(rate))
  })

  app.post('/rates/bulk', async (request, reply) => {
    const { tenantId } = request as any
    const { rates } = request.body as { rates: Array<{ fromCurrency: string; toCurrency: string; rate: number; effectiveDate?: string }> }
    const today = new Date().toISOString().slice(0, 10)
    await prisma.fxRate.createMany({
      data: rates.map(r => ({ tenantId, fromCurrency: r.fromCurrency, toCurrency: r.toCurrency, rate: r.rate, source: 'bulk', effectiveDate: new Date(r.effectiveDate ?? today) })),
      skipDuplicates: true,
    })
    return reply.send(buildSuccessResponse({ imported: rates.length }))
  })

  // POST /fx/convert — convert an amount between currencies
  app.post('/convert', async (request, reply) => {
    const { tenantId } = request as any
    const { from, to, amount } = request.body as { from: string; to: string; amount: number }
    if (from === to) return reply.send(buildSuccessResponse({ from, to, amount, converted: amount, rate: 1 }))

    const rate = await prisma.fxRate.findFirst({
      where: { tenantId, fromCurrency: from, toCurrency: to },
      orderBy: { effectiveDate: 'desc' },
    })
    if (!rate) throw new RenoError(ErrorCode.NOT_FOUND, `No exchange rate found for ${from}→${to}`, 404)
    const converted = Number(amount) * Number(rate.rate)
    return reply.send(buildSuccessResponse({ from, to, amount, converted, rate: Number(rate.rate), effectiveDate: rate.effectiveDate }))
  })

  // GET /fx/summary — multi-currency revenue breakdown in base currency
  app.get('/summary', async (request, reply) => {
    const { tenantId } = request as any
    const settings = await prisma.fxTenantSettings.findUnique({ where: { tenantId } })
    const base = settings?.baseCurrency ?? 'USD'

    // Get revenue grouped by currency (assuming sales_invoices has a currency column — fallback to USD)
    const revenueRaw: Array<{ currency: string; total: bigint }> = await prisma.$queryRaw`
      SELECT COALESCE(currency, 'USD') AS currency, SUM(total_amount)::bigint AS total
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}::uuid AND status = 'paid'
      GROUP BY COALESCE(currency, 'USD')
    `

    // Get latest rates for conversion
    const rates = await prisma.fxRate.findMany({ where: { tenantId, toCurrency: base }, orderBy: { effectiveDate: 'desc' } })
    const rateMap = new Map<string, number>()
    for (const r of rates) { if (!rateMap.has(r.fromCurrency)) rateMap.set(r.fromCurrency, Number(r.rate)) }
    rateMap.set(base, 1)

    const converted = revenueRaw.map(r => ({
      currency: r.currency,
      total: Number(r.total),
      rate: rateMap.get(r.currency) ?? null,
      totalBase: rateMap.has(r.currency) ? Number(r.total) * (rateMap.get(r.currency) ?? 1) : null,
    }))

    return reply.send(buildSuccessResponse({ baseCurrency: base, breakdown: converted, totalBase: converted.reduce((s, r) => s + (r.totalBase ?? 0), 0) }))
  })
}
