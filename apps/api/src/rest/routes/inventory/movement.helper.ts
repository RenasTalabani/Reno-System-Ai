import { prisma } from '@reno/database'

// IN types: stock increases at toWarehouse
// OUT types: stock decreases at fromWarehouse
// Transfer types: both fromWarehouse and toWarehouse
const IN_TYPES = new Set(['receipt', 'transfer_in', 'adjustment_in', 'opening', 'return_in'])
const OUT_TYPES = new Set(['issue', 'transfer_out', 'adjustment_out', 'return_out'])

async function upsertStockBalance(
  tenantId: string,
  productId: string,
  warehouseId: string,
  delta: number,
  unitCost?: number | null,
) {
  const existing = await prisma.invStockBalance.findUnique({
    where: { tenantId_productId_warehouseId: { tenantId, productId, warehouseId } },
  })

  if (existing) {
    const newOnHand = Number(existing.onHand) + delta
    let newAvgCost = existing.avgCost ? Number(existing.avgCost) : null

    if (delta > 0 && unitCost) {
      const existingValue = Number(existing.onHand) * (Number(existing.avgCost) || 0)
      const addedValue = delta * unitCost
      const newQty = Number(existing.onHand) + delta
      newAvgCost = newQty > 0 ? (existingValue + addedValue) / newQty : unitCost
    }

    await prisma.invStockBalance.update({
      where: { id: existing.id },
      data: {
        onHand: newOnHand,
        available: Math.max(0, newOnHand - Number(existing.reserved)),
        avgCost: newAvgCost,
        totalValue: newAvgCost != null ? Math.max(0, newOnHand) * newAvgCost : null,
      },
    })
  } else if (delta > 0) {
    await prisma.invStockBalance.create({
      data: {
        tenantId,
        productId,
        warehouseId,
        onHand: delta,
        reserved: 0,
        available: delta,
        avgCost: unitCost,
        totalValue: unitCost ? delta * unitCost : null,
      },
    })
  }
}

export async function createMovement(params: {
  tenantId: string
  userId: string
  type: string
  productId: string
  fromWarehouseId?: string | null
  toWarehouseId?: string | null
  fromZoneId?: string | null
  toZoneId?: string | null
  fromBinId?: string | null
  toBinId?: string | null
  lotId?: string | null
  serialId?: string | null
  quantity: number
  unitCost?: number | null
  currency?: string
  date?: Date
  reference?: string | null
  referenceType?: string | null
  referenceId?: string | null
  notes?: string | null
}) {
  const { tenantId, userId, type, quantity, unitCost } = params

  const count = await prisma.invMovement.count({ where: { tenantId } })
  const number = `MOV-${String(count + 1).padStart(5, '0')}`

  const movement = await prisma.invMovement.create({
    data: {
      tenantId,
      number,
      type,
      productId: params.productId,
      fromWarehouseId: params.fromWarehouseId,
      toWarehouseId: params.toWarehouseId,
      fromZoneId: params.fromZoneId,
      toZoneId: params.toZoneId,
      fromBinId: params.fromBinId,
      toBinId: params.toBinId,
      lotId: params.lotId,
      serialId: params.serialId,
      quantity,
      unitCost,
      totalCost: unitCost ? quantity * unitCost : null,
      currency: params.currency ?? 'USD',
      date: params.date ?? new Date(),
      reference: params.reference,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      notes: params.notes,
      createdBy: userId,
      updatedBy: userId,
    },
  })

  // Update stock balances based on movement type
  if (params.fromWarehouseId && OUT_TYPES.has(type)) {
    await upsertStockBalance(tenantId, params.productId, params.fromWarehouseId, -quantity, unitCost)
  }
  if (params.toWarehouseId && IN_TYPES.has(type)) {
    await upsertStockBalance(tenantId, params.productId, params.toWarehouseId, quantity, unitCost)
  }
  // Transfer: both warehouses affected
  if (type === 'transfer_out' && params.fromWarehouseId && params.toWarehouseId) {
    await upsertStockBalance(tenantId, params.productId, params.fromWarehouseId, -quantity, unitCost)
    await upsertStockBalance(tenantId, params.productId, params.toWarehouseId, quantity, unitCost)
  }

  return movement
}
