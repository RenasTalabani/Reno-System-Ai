export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown'
  score: number
  issues: string[]
  recommendations: string[]
}

export interface WebhookAnalysis {
  intent: string
  entityType: string
  entityId: string
  action: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  suggestedRenoAction: string
  extractedData: Record<string, unknown>
}

export interface FieldMapping {
  sourceField: string
  targetEntity: string
  targetField: string
  transform?: string
  confidence: number
}

export interface SyncResult {
  recordsTotal: number
  recordsSynced: number
  recordsFailed: number
  duration: number
  sampleData: Array<{ index: number; externalId: string; syncedAt: string; status: string }>
}

// ── Health Assessment ──────────────────────────────────────────────────────────

export function assessIntegrationHealth(
  syncCount: number,
  errorCount: number,
  lastSyncStatus: string | null,
  lastSyncAt: Date | null,
): IntegrationHealth {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  if (lastSyncAt === null) {
    issues.push('Integration has never synced')
    recommendations.push('Run a manual sync to verify the connection is working')
    score -= 40
  } else {
    const hoursSince = (Date.now() - lastSyncAt.getTime()) / 36e5
    if (hoursSince > 48) {
      issues.push('No successful sync in the last 48 hours')
      recommendations.push('Check connectivity and trigger a manual sync')
      score -= 20
    } else if (hoursSince > 24) {
      issues.push('No sync in the last 24 hours')
      score -= 10
    }
  }

  if (syncCount > 0) {
    const errorRate = errorCount / syncCount
    if (errorRate > 0.5) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(0)}%`)
      recommendations.push('Review credentials, API rate limits, and field mapping errors')
      score -= 30
    } else if (errorRate > 0.2) {
      issues.push(`Elevated error rate: ${(errorRate * 100).toFixed(0)}%`)
      recommendations.push('Review recent sync logs for recurring errors')
      score -= 15
    }
  }

  if (lastSyncStatus === 'error') {
    issues.push('Last sync failed')
    recommendations.push('Retry the sync and check error logs for details')
    score -= 20
  } else if (lastSyncStatus === 'partial') {
    issues.push('Last sync completed with partial failures')
    score -= 5
  }

  score = Math.max(0, score)
  const status: IntegrationHealth['status'] =
    score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : score > 0 ? 'critical' : 'unknown'

  return { status, score, issues, recommendations }
}

// ── Webhook Payload Analysis ───────────────────────────────────────────────────

export function analyseWebhookPayload(
  source: string,
  eventType: string,
  payload: Record<string, unknown>,
): WebhookAnalysis {
  // Stripe
  if (source === 'stripe') {
    const obj = ((payload.data as Record<string, unknown>)?.object ?? {}) as Record<string, unknown>
    if (eventType.startsWith('payment_intent')) {
      return {
        intent: 'payment_event',
        entityType: 'payment',
        entityId: String(obj.id ?? ''),
        action: eventType.includes('succeeded') ? 'payment_captured' : eventType.includes('failed') ? 'payment_failed' : 'payment_updated',
        priority: eventType.includes('failed') ? 'high' : 'medium',
        suggestedRenoAction: eventType.includes('succeeded')
          ? 'Mark linked invoice as paid in Reno Finance'
          : 'Alert finance team of payment failure and retry',
        extractedData: { amount: obj.amount, currency: obj.currency, status: obj.status },
      }
    }
    if (eventType.startsWith('customer.subscription')) {
      return {
        intent: 'subscription_event',
        entityType: 'subscription',
        entityId: String(obj.id ?? ''),
        action: eventType.includes('deleted') ? 'subscription_cancelled' : 'subscription_updated',
        priority: eventType.includes('deleted') ? 'high' : 'low',
        suggestedRenoAction: eventType.includes('deleted')
          ? 'Flag customer in CRM as churned and notify sales'
          : 'Update customer subscription tier in Reno CRM',
        extractedData: { plan: (obj.items as Record<string, unknown>), status: obj.status },
      }
    }
  }

  // Shopify
  if (source === 'shopify') {
    if (eventType === 'orders/create' || eventType === 'orders/paid') {
      return {
        intent: 'new_order',
        entityType: 'order',
        entityId: String(payload.id ?? ''),
        action: 'order_received',
        priority: 'high',
        suggestedRenoAction: 'Create sales order in Reno CRM and notify fulfillment team',
        extractedData: { orderId: payload.id, total: payload.total_price, customer: payload.customer },
      }
    }
    if (eventType === 'customers/create') {
      return {
        intent: 'new_customer',
        entityType: 'customer',
        entityId: String(payload.id ?? ''),
        action: 'customer_created',
        priority: 'medium',
        suggestedRenoAction: 'Create contact in Reno CRM and add to onboarding sequence',
        extractedData: { email: payload.email, name: `${payload.first_name} ${payload.last_name}` },
      }
    }
    if (eventType === 'inventory_levels/update') {
      return {
        intent: 'inventory_update',
        entityType: 'inventory',
        entityId: String(payload.inventory_item_id ?? ''),
        action: 'stock_adjusted',
        priority: (payload.available as number) < 10 ? 'high' : 'low',
        suggestedRenoAction: (payload.available as number) < 10
          ? 'Trigger low-stock alert and create reorder request in Inventory'
          : 'Sync inventory level to Reno Inventory module',
        extractedData: { available: payload.available, locationId: payload.location_id },
      }
    }
  }

  // Slack
  if (source === 'slack') {
    const event = (payload.event ?? {}) as Record<string, unknown>
    return {
      intent: 'chat_message',
      entityType: 'message',
      entityId: String(event.ts ?? ''),
      action: 'message_received',
      priority: 'low',
      suggestedRenoAction: 'Log message in Reno communications feed',
      extractedData: { channel: event.channel, text: event.text, user: event.user },
    }
  }

  // PayPal
  if (source === 'paypal') {
    return {
      intent: 'payment_event',
      entityType: 'transaction',
      entityId: String(payload.id ?? ''),
      action: String(payload.event_type ?? 'payment_event').toLowerCase(),
      priority: 'medium',
      suggestedRenoAction: 'Record transaction in Reno Finance and reconcile',
      extractedData: { amount: (payload.resource as Record<string, unknown>)?.amount, currency: 'USD' },
    }
  }

  // Generic fallback
  return {
    intent: 'unknown_event',
    entityType: 'generic',
    entityId: String(payload.id ?? ''),
    action: eventType,
    priority: 'low',
    suggestedRenoAction: 'Review event payload and configure field mappings for this connector',
    extractedData: { source, eventType },
  }
}

// ── Field Mapping Suggestions ──────────────────────────────────────────────────

const MAPPING_TEMPLATES: Record<string, Record<string, FieldMapping[]>> = {
  shopify: {
    customer: [
      { sourceField: 'email', targetEntity: 'CrmContact', targetField: 'email', confidence: 99 },
      { sourceField: 'first_name', targetEntity: 'CrmContact', targetField: 'firstName', confidence: 99 },
      { sourceField: 'last_name', targetEntity: 'CrmContact', targetField: 'lastName', confidence: 99 },
      { sourceField: 'phone', targetEntity: 'CrmContact', targetField: 'phone', confidence: 90 },
      { sourceField: 'total_spent', targetEntity: 'CrmContact', targetField: 'totalRevenue', confidence: 85 },
    ],
    order: [
      { sourceField: 'id', targetEntity: 'FinInvoice', targetField: 'externalRef', confidence: 99 },
      { sourceField: 'total_price', targetEntity: 'FinInvoice', targetField: 'totalAmount', confidence: 95 },
      { sourceField: 'created_at', targetEntity: 'FinInvoice', targetField: 'invoiceDate', confidence: 95 },
      { sourceField: 'financial_status', targetEntity: 'FinInvoice', targetField: 'status', confidence: 80 },
    ],
    product: [
      { sourceField: 'title', targetEntity: 'InvProduct', targetField: 'name', confidence: 99 },
      { sourceField: 'sku', targetEntity: 'InvProduct', targetField: 'sku', confidence: 99 },
      { sourceField: 'price', targetEntity: 'InvProduct', targetField: 'sellingPrice', confidence: 95 },
      { sourceField: 'inventory_quantity', targetEntity: 'InvProduct', targetField: 'stockLevel', confidence: 90 },
    ],
  },
  stripe: {
    customer: [
      { sourceField: 'email', targetEntity: 'CrmContact', targetField: 'email', confidence: 99 },
      { sourceField: 'name', targetEntity: 'CrmContact', targetField: 'fullName', confidence: 90 },
      { sourceField: 'phone', targetEntity: 'CrmContact', targetField: 'phone', confidence: 85 },
    ],
    payment: [
      { sourceField: 'amount', targetEntity: 'FinTransaction', targetField: 'amount', transform: 'divide_100', confidence: 95 },
      { sourceField: 'currency', targetEntity: 'FinTransaction', targetField: 'currency', confidence: 99 },
      { sourceField: 'status', targetEntity: 'FinTransaction', targetField: 'status', confidence: 99 },
      { sourceField: 'created', targetEntity: 'FinTransaction', targetField: 'transactionDate', transform: 'unix_to_iso', confidence: 90 },
    ],
  },
  gmail: {
    email: [
      { sourceField: 'from', targetEntity: 'CrmContact', targetField: 'email', confidence: 85 },
      { sourceField: 'subject', targetEntity: 'CrmActivity', targetField: 'subject', confidence: 99 },
      { sourceField: 'date', targetEntity: 'CrmActivity', targetField: 'activityDate', confidence: 95 },
      { sourceField: 'body', targetEntity: 'CrmActivity', targetField: 'notes', confidence: 80 },
    ],
  },
  'open-banking': {
    transaction: [
      { sourceField: 'amount', targetEntity: 'FinTransaction', targetField: 'amount', confidence: 99 },
      { sourceField: 'currency', targetEntity: 'FinTransaction', targetField: 'currency', confidence: 99 },
      { sourceField: 'bookingDate', targetEntity: 'FinTransaction', targetField: 'transactionDate', confidence: 99 },
      { sourceField: 'remittanceInformation', targetEntity: 'FinTransaction', targetField: 'description', confidence: 85 },
    ],
  },
}

export function generateFieldMappings(connectorSlug: string, targetEntity: string): FieldMapping[] {
  return MAPPING_TEMPLATES[connectorSlug]?.[targetEntity] ?? [
    { sourceField: 'id', targetEntity, targetField: 'externalId', confidence: 80 },
    { sourceField: 'name', targetEntity, targetField: 'name', confidence: 75 },
    { sourceField: 'created_at', targetEntity, targetField: 'createdAt', confidence: 70 },
  ]
}

// ── Sync Simulation ────────────────────────────────────────────────────────────

const SYNC_VOLUMES: Record<string, number> = {
  shopify: 47, stripe: 312, gmail: 28, slack: 15, 'google-cal': 12,
  'open-banking': 156, netsuite: 89, sap: 234, woocommerce: 63, default: 25,
}

export function simulateSyncResult(connectorSlug: string): SyncResult {
  const total = SYNC_VOLUMES[connectorSlug] ?? SYNC_VOLUMES.default
  const failed = Math.floor(total * (Math.random() * 0.04))
  const synced = total - failed
  const duration = 800 + Math.floor(Math.random() * 2200)

  const sampleData = Array.from({ length: Math.min(3, synced) }, (_, i) => ({
    index: i + 1,
    externalId: `ext_${Math.random().toString(36).slice(2, 10)}`,
    syncedAt: new Date().toISOString(),
    status: 'ok',
  }))

  return { recordsTotal: total, recordsSynced: synced, recordsFailed: failed, duration, sampleData }
}

// ── Dashboard Summary ──────────────────────────────────────────────────────────

export function generateHubSummary(
  totalIntegrations: number,
  activeCount: number,
  errorCount: number,
  pendingSyncEvents: number,
): string {
  if (totalIntegrations === 0) return 'No integrations configured yet. Browse the connector marketplace to connect your first external system.'
  if (errorCount > 0) return `${activeCount} integrations active, ${errorCount} require attention due to sync errors. Review the Health tab for details.`
  if (pendingSyncEvents > 50) return `${activeCount} integrations running smoothly with ${pendingSyncEvents} webhook events pending processing.`
  return `${activeCount} of ${totalIntegrations} integrations active and healthy. All external systems are connected.`
}
