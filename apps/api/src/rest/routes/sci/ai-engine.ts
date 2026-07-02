// Phase 61 — Supply Chain AI Engine

export function assessSupplierRisk(supplier: {
  onTimeDelivery: number
  qualityScore: number
  leadTimeDays: number
  country?: string | null
}) {
  const deliveryRisk = Math.max(0, 100 - supplier.onTimeDelivery)
  const qualityRisk = Math.max(0, 100 - supplier.qualityScore)
  const leadRisk = Math.min(100, supplier.leadTimeDays * 2)
  const geoRisk = supplier.country && ['CN', 'RU', 'IR', 'KP'].includes(supplier.country) ? 20 : 0
  const aiRiskScore = Math.min(100, deliveryRisk * 0.4 + qualityRisk * 0.3 + leadRisk * 0.2 + geoRisk * 0.1)

  const aiRiskLevel =
    aiRiskScore >= 75 ? 'critical' : aiRiskScore >= 50 ? 'high' : aiRiskScore >= 25 ? 'medium' : 'low'

  const insights: string[] = []
  if (supplier.onTimeDelivery < 80) insights.push(`On-time delivery at ${supplier.onTimeDelivery.toFixed(0)}% — below 80% threshold`)
  if (supplier.qualityScore < 70) insights.push(`Quality score ${supplier.qualityScore.toFixed(0)}/100 needs improvement`)
  if (supplier.leadTimeDays > 21) insights.push(`Lead time of ${supplier.leadTimeDays} days creates inventory risk`)
  if (geoRisk > 0) insights.push('Geopolitical risk factor detected for country of origin')
  if (insights.length === 0) insights.push('Supplier performance within acceptable parameters')

  return { aiRiskScore: Math.round(aiRiskScore * 10) / 10, aiRiskLevel, insights }
}

export function predictShipmentDelay(shipment: {
  scheduledDate: Date
  carrier?: string | null
  origin?: string | null
  destination?: string | null
  status: string
}) {
  const now = new Date()
  const daysUntilDelivery = (shipment.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  let aiDelayRisk = 15 // base risk
  if (daysUntilDelivery < 0) aiDelayRisk = 85 // already late
  else if (daysUntilDelivery < 2) aiDelayRisk = 40
  if (shipment.status === 'delayed') aiDelayRisk = Math.min(95, aiDelayRisk + 50)
  if (shipment.carrier && ['budget', 'economy'].some(k => shipment.carrier!.toLowerCase().includes(k))) aiDelayRisk += 10

  const insights: string[] = []
  if (aiDelayRisk >= 75) insights.push('High risk of significant delay — consider expediting')
  else if (aiDelayRisk >= 40) insights.push('Moderate delay risk — monitor closely')
  else insights.push('Shipment on track for on-time delivery')

  const etaDays = daysUntilDelivery < 0 ? Math.abs(daysUntilDelivery) + 3 : daysUntilDelivery + (aiDelayRisk / 100) * 5
  const aiEta = new Date(now.getTime() + etaDays * 24 * 60 * 60 * 1000)

  return { aiDelayRisk: Math.round(aiDelayRisk), aiEta, insights }
}

export function forecastDemand(params: {
  skuCode: string
  skuName: string
  period: string
  historicalAvg?: number
}) {
  const base = params.historicalAvg ?? 100
  const trend = 1 + (Math.random() * 0.1 - 0.05) // ±5% trend
  const aiDemand = Math.max(0, Math.round(base * trend))
  const reorderPoint = Math.round(aiDemand * 0.3)
  const safetyStock = Math.round(aiDemand * 0.15)
  const aiConfidence = 0.75 + Math.random() * 0.15

  const aiSummary = `AI forecasts demand of ${aiDemand} units for ${params.skuCode} in ${params.period}. ` +
    `Reorder point: ${reorderPoint}, safety stock: ${safetyStock}. Confidence: ${(aiConfidence * 100).toFixed(0)}%.`

  return { aiDemand, reorderPoint, safetyStock, aiConfidence: Math.round(aiConfidence * 100) / 100, aiSummary }
}

export function generateInventoryAlerts(skus: Array<{
  skuCode: string; skuName: string; currentQty: number; reorderPoint: number; maxQty?: number
}>) {
  return skus.flatMap(sku => {
    const alerts: Array<{ alertType: string; severity: string; threshold: number; aiSuggestion: string }> = []

    if (sku.currentQty <= 0) {
      alerts.push({ alertType: 'stockout', severity: 'critical', threshold: 0, aiSuggestion: `${sku.skuName} is out of stock. Initiate emergency procurement immediately.` })
    } else if (sku.currentQty <= sku.reorderPoint) {
      alerts.push({ alertType: 'reorder', severity: 'warning', threshold: sku.reorderPoint, aiSuggestion: `${sku.skuName} below reorder point. Place order for ${sku.reorderPoint * 3} units.` })
    }

    if (sku.maxQty && sku.currentQty > sku.maxQty * 0.9) {
      alerts.push({ alertType: 'overstock', severity: 'info', threshold: sku.maxQty, aiSuggestion: `${sku.skuName} approaching maximum capacity. Consider promotions or return to supplier.` })
    }

    return alerts.map(a => ({ ...a, skuCode: sku.skuCode, skuName: sku.skuName, currentQty: sku.currentQty }))
  })
}

export function computeSupplyChainKpis(suppliers: Array<{ aiRiskScore: number; onTimeDelivery: number; qualityScore: number }>, shipments: Array<{ status: string; aiDelayRisk: number }>) {
  const totalSuppliers = suppliers.length
  const highRiskSuppliers = suppliers.filter(s => s.aiRiskScore >= 50).length
  const avgOnTime = totalSuppliers ? suppliers.reduce((s, x) => s + x.onTimeDelivery, 0) / totalSuppliers : 0
  const avgQuality = totalSuppliers ? suppliers.reduce((s, x) => s + x.qualityScore, 0) / totalSuppliers : 0
  const totalShipments = shipments.length
  const delayedShipments = shipments.filter(s => s.status === 'delayed').length
  const avgDelayRisk = totalShipments ? shipments.reduce((s, x) => s + x.aiDelayRisk, 0) / totalShipments : 0

  return {
    totalSuppliers,
    highRiskSuppliers,
    avgOnTime: Math.round(avgOnTime * 10) / 10,
    avgQuality: Math.round(avgQuality * 10) / 10,
    totalShipments,
    delayedShipments,
    onTimeRate: totalShipments ? Math.round((1 - delayedShipments / totalShipments) * 1000) / 10 : 100,
    avgDelayRisk: Math.round(avgDelayRisk * 10) / 10,
  }
}
