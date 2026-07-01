'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/proxy'

type Tab = 'dashboard' | 'connectors' | 'integrations' | 'webhooks' | 'sync-logs' | 'field-mapping' | 'health'

interface Connector {
  id: string
  name: string
  slug: string
  category: string
  authType: string
  description: string | null
  logoEmoji: string | null
  capabilities: string[]
}

interface Integration {
  id: string
  name: string
  status: string
  syncCount: number
  errorCount: number
  lastSyncAt: string | null
  lastSyncStatus: string | null
  webhookSecret: string
  connector: Connector
  syncLogs?: SyncLog[]
}

interface SyncLog {
  id: string
  direction: string
  status: string
  recordsTotal: number
  recordsSynced: number
  recordsFailed: number
  duration: number | null
  triggeredBy: string | null
  createdAt: string
  integration?: { name: string; connector: { name: string; logoEmoji: string | null } }
}

interface WebhookEvent {
  id: string
  source: string
  eventType: string
  processed: boolean
  createdAt: string
  aiAnalysis: { intent: string; action: string; priority: string; suggestedRenoAction: string; extractedData: Record<string, unknown> } | null
  integration?: { name: string } | null
}

interface HealthReport {
  id: string
  name: string
  connector: string
  emoji: string | null
  category: string
  status: string
  score: number
  issues: string[]
  recommendations: string[]
}

function useApi(path: string) {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else setError(json.error?.message ?? 'Unknown error')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [path])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

async function apiPost(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPatch(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPut(path: string, body: unknown = {}) {
  const res = await fetch(`${API}?path=${encodeURIComponent(path)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return res.json()
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  paused: 'bg-gray-100 text-gray-600',
  revoked: 'bg-red-50 text-red-500',
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'text-green-600',
  degraded: 'text-yellow-600',
  critical: 'text-red-600',
  unknown: 'text-gray-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

const CATEGORY_EMOJIS: Record<string, string> = {
  chat: '💬', email: '📧', calendar: '📅', payment: '💳',
  ecommerce: '🛍️', storage: '📁', erp: '🏭', bank: '🏦', custom: '🔌',
}

function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? 'bg-gray-100 text-gray-600'}`}>{value}</span>
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, loading } = useApi('/integration-hub/dashboard')
  const d = data as { total: number; active: number; error: number; pending: number; syncLogs: number; webhookEvents: number; unprocessed: number; categories: string[]; summary: string } | null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Integrations', value: d?.total ?? 0, color: 'text-blue-600' },
          { label: 'Active', value: d?.active ?? 0, color: 'text-green-600' },
          { label: 'Errors', value: d?.error ?? 0, color: 'text-red-600' },
          { label: 'Pending', value: d?.pending ?? 0, color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Sync Operations', value: d?.syncLogs ?? 0, icon: '🔄' },
          { label: 'Webhook Events', value: d?.webhookEvents ?? 0, icon: '🪝' },
          { label: 'Unprocessed Events', value: d?.unprocessed ?? 0, icon: '⏳' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="text-3xl">{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-gray-700">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {d?.summary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
          <h3 className="font-semibold text-blue-800 mb-1">Integration Hub Status</h3>
          <p className="text-sm text-blue-700">{d.summary}</p>
        </div>
      )}

      {d?.categories && d.categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Connected Categories</h3>
          <div className="flex flex-wrap gap-2">
            {d.categories.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span>{CATEGORY_EMOJIS[cat] ?? '🔌'}</span>
                <span className="text-sm text-gray-700 capitalize">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Connectors ────────────────────────────────────────────────────────────────

function ConnectorsTab({ onConnect }: { onConnect: (c: Connector) => void }) {
  const { data, loading } = useApi('/integration-hub/connectors')
  const connectors = (data ?? []) as Connector[]
  const [filter, setFilter] = useState('')

  const categories = [...new Set(connectors.map(c => c.category))].sort()

  if (loading) return <div className="text-center py-20 text-gray-400">Loading connector marketplace...</div>

  const filtered = filter ? connectors.filter(c => c.category === filter) : connectors

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All ({connectors.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {CATEGORY_EMOJIS[cat]} {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{c.logoEmoji ?? '🔌'}</div>
                <div>
                  <h4 className="font-semibold text-gray-800">{c.name}</h4>
                  <span className="text-xs text-gray-400 capitalize">{c.category}</span>
                </div>
              </div>
              <span className="text-xs bg-gray-50 text-gray-500 rounded px-2 py-0.5">{c.authType}</span>
            </div>
            {c.description && <p className="text-xs text-gray-500 mb-3">{c.description}</p>}
            <div className="flex flex-wrap gap-1 mb-3">
              {c.capabilities.slice(0, 3).map(cap => (
                <span key={cap} className="text-xs bg-blue-50 text-blue-600 rounded px-2 py-0.5">{cap}</span>
              ))}
              {c.capabilities.length > 3 && (
                <span className="text-xs text-gray-400">+{c.capabilities.length - 3}</span>
              )}
            </div>
            <button onClick={() => onConnect(c)} className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Integrations ──────────────────────────────────────────────────────────────

function IntegrationsTab({ initialConnector, onClearConnector }: { initialConnector: Connector | null; onClearConnector: () => void }) {
  const { data, loading, reload } = useApi('/integration-hub/integrations')
  const integrations = (data ?? []) as Integration[]
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', connectorId: initialConnector?.id ?? '' })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    if (initialConnector) { setShowForm(true); setForm(f => ({ ...f, connectorId: initialConnector.id })) }
  }, [initialConnector])

  const save = async () => {
    if (!form.name || !form.connectorId) return
    setSaving(true)
    await apiPost('/integration-hub/integrations', form)
    await reload()
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', connectorId: '' })
    onClearConnector()
  }

  const testConn = async (id: string) => {
    setTesting(id)
    await apiPost(`/integration-hub/integrations/${id}/test`)
    await reload()
    setTesting(null)
  }

  const sync = async (id: string) => {
    setSyncing(id)
    await apiPost(`/integration-hub/integrations/${id}/sync`, { direction: 'inbound' })
    await reload()
    setSyncing(null)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading integrations...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{integrations.length} configured integrations</p>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Integration
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">
            {initialConnector ? `Connect ${initialConnector.logoEmoji} ${initialConnector.name}` : 'New Integration'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Integration Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Stripe Production, Shopify Europe" />
            </div>
            {!initialConnector && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Connector ID</label>
                <input value={form.connectorId} onChange={e => setForm(f => ({ ...f, connectorId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="connector ID from marketplace" />
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!form.name || !form.connectorId || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Connecting...' : 'Connect'}
            </button>
            <button onClick={() => { setShowForm(false); onClearConnector() }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No integrations yet. Browse the Connectors tab to get started.</div>
      ) : (
        <div className="space-y-3">
          {integrations.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{i.connector.logoEmoji ?? '🔌'}</div>
                  <div>
                    <h4 className="font-medium text-gray-800">{i.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{i.connector.name}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400 capitalize">{i.connector.category}</span>
                    </div>
                  </div>
                </div>
                <Badge value={i.status} map={STATUS_COLORS} />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-50">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">{i.syncCount}</div>
                  <div className="text-xs text-gray-400">Syncs</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">{i.errorCount}</div>
                  <div className="text-xs text-gray-400">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">{i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleDateString() : '—'}</div>
                  <div className="text-xs text-gray-400">Last Sync</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => testConn(i.id)} disabled={testing === i.id} className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  {testing === i.id ? 'Testing...' : '🔗 Test'}
                </button>
                <button onClick={() => sync(i.id)} disabled={syncing === i.id} className="flex-1 py-1.5 text-xs font-medium border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                  {syncing === i.id ? 'Syncing...' : '🔄 Sync Now'}
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-gray-400 font-mono truncate">🪝 {i.webhookSecret.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

function WebhooksTab() {
  const { data, loading, reload } = useApi('/integration-hub/webhook-events')
  const events = (data ?? []) as WebhookEvent[]
  const [expanded, setExpanded] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const markProcessed = async (id: string) => {
    setProcessing(id)
    await apiPatch(`/integration-hub/webhook-events/${id}/process`)
    await reload()
    setProcessing(null)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading webhook events...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{events.length} webhook events · {events.filter(e => !e.processed).length} unprocessed</p>
        <button onClick={reload} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">↻ Refresh</button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No webhook events yet. External systems will post to your integration webhook URLs.</div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => {
            const isOpen = expanded === ev.id
            return (
              <div key={ev.id} className={`bg-white rounded-xl border shadow-sm ${ev.processed ? 'opacity-70 border-gray-100' : 'border-blue-100'}`}>
                <button className="w-full text-left p-4" onClick={() => setExpanded(isOpen ? null : ev.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{CATEGORY_EMOJIS[ev.source] ?? '🪝'}</span>
                      <div>
                        <div className="font-medium text-sm text-gray-800">{ev.eventType}</div>
                        <div className="text-xs text-gray-400">{ev.source} · {new Date(ev.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ev.aiAnalysis?.priority && <Badge value={ev.aiAnalysis.priority} map={PRIORITY_COLORS} />}
                      {ev.processed ? (
                        <span className="text-xs text-green-600">✓ Processed</span>
                      ) : (
                        <span className="text-xs text-blue-600">⏳ Pending</span>
                      )}
                      <span className="text-gray-300">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>

                {isOpen && ev.aiAnalysis && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-blue-500 mb-1">Intent</div>
                        <div className="text-sm text-blue-800">{ev.aiAnalysis.intent}</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-indigo-500 mb-1">Action</div>
                        <div className="text-sm text-indigo-800">{ev.aiAnalysis.action}</div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-purple-500 mb-1">Suggested Reno Action</div>
                      <div className="text-sm text-purple-800">{ev.aiAnalysis.suggestedRenoAction}</div>
                    </div>
                    {!ev.processed && (
                      <button onClick={() => markProcessed(ev.id)} disabled={processing === ev.id} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                        {processing === ev.id ? 'Processing...' : '✓ Mark Processed'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Sync Logs ─────────────────────────────────────────────────────────────────

function SyncLogsTab() {
  const { data, loading } = useApi('/integration-hub/sync-logs')
  const logs = (data ?? []) as SyncLog[]

  if (loading) return <div className="text-center py-20 text-gray-400">Loading sync logs...</div>

  const SYNC_STATUS_COLORS: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-3">
      {logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No sync operations yet. Run a manual sync from the Integrations tab.</div>
      ) : (
        logs.map(log => (
          <div key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{log.integration?.connector?.logoEmoji ?? '🔄'}</span>
                <div>
                  <div className="font-medium text-sm text-gray-800">{log.integration?.name ?? 'Unknown'}</div>
                  <div className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()} · {log.direction} · {log.triggeredBy}</div>
                </div>
              </div>
              <Badge value={log.status} map={SYNC_STATUS_COLORS} />
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-50">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700">{log.recordsTotal}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">{log.recordsSynced}</div>
                <div className="text-xs text-gray-400">Synced</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-red-600">{log.recordsFailed}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700">{log.duration ? `${log.duration}ms` : '—'}</div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Field Mapping ─────────────────────────────────────────────────────────────

function FieldMappingTab() {
  const { data: intData } = useApi('/integration-hub/integrations')
  const integrations = (intData ?? []) as Integration[]
  const [integrationId, setIntegrationId] = useState('')
  const [targetEntity, setTargetEntity] = useState('customer')
  const [mappings, setMappings] = useState<Array<{ sourceField: string; targetEntity: string; targetField: string; transform?: string; confidence: number }>>([])
  const [loading, setLoading] = useState(false)

  const suggest = async () => {
    if (!integrationId) return
    setLoading(true)
    const r = await apiPost('/integration-hub/field-mappings/suggest', { integrationId, targetEntity })
    if (r.success) setMappings(r.data)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">AI Field Mapping Suggestions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Integration</label>
            <select value={integrationId} onChange={e => setIntegrationId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— Select integration —</option>
              {integrations.map(i => <option key={i.id} value={i.id}>{i.connector.logoEmoji} {i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Target Entity (Reno)</label>
            <select value={targetEntity} onChange={e => setTargetEntity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['customer', 'order', 'product', 'payment', 'email', 'transaction'].map(e => <option key={e} value={e} className="capitalize">{e}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={suggest} disabled={!integrationId || loading} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Generating...' : '✨ Suggest Mappings'}
            </button>
          </div>
        </div>
      </div>

      {mappings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Suggested Field Mappings</h3>
            <span className="text-xs text-gray-400">{mappings.length} suggestions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 text-sm font-mono text-gray-700">{m.sourceField}</div>
                <div className="text-gray-300">→</div>
                <div className="flex-1 text-sm font-mono text-blue-700">{m.targetField}</div>
                {m.transform && <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-0.5">{m.transform}</div>}
                <div className="w-16 text-right">
                  <div className={`text-xs font-medium ${m.confidence >= 90 ? 'text-green-600' : m.confidence >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {m.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Health ─────────────────────────────────────────────────────────────────────

function HealthTab() {
  const { data, loading, reload } = useApi('/integration-hub/health')
  const d = data as { reports: HealthReport[]; overallScore: number } | null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading health reports...</div>

  const reports = d?.reports ?? []

  const scoreColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
  const scoreBar = (score: number) => score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className={`text-4xl font-black ${scoreColor(d?.overallScore ?? 100)}`}>{d?.overallScore ?? 100}</div>
          <div>
            <div className="font-semibold text-gray-700">Overall Health Score</div>
            <div className="text-xs text-gray-400">across {reports.length} integrations</div>
          </div>
        </div>
        <button onClick={reload} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">↻ Refresh</button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No integrations to report on. Add integrations first.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.emoji ?? '🔌'}</span>
                  <div>
                    <h4 className="font-medium text-gray-800">{r.name}</h4>
                    <div className="text-xs text-gray-400">{r.connector} · <span className={`font-medium ${HEALTH_COLORS[r.status]}`}>{r.status}</span></div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${scoreColor(r.score)}`}>{r.score}</div>
                  <div className="text-xs text-gray-400">health score</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBar(r.score)}`} style={{ width: `${r.score}%` }} />
                </div>
              </div>

              {r.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  {r.issues.map((issue, i) => (
                    <div key={i} className="flex gap-2 text-xs text-orange-700">
                      <span>⚠</span><span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}

              {r.recommendations.length > 0 && (
                <div className="mt-2 space-y-1">
                  {r.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2 text-xs text-blue-600">
                      <span>→</span><span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'connectors', label: 'Connectors' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'webhooks', label: 'Webhooks' },
  { key: 'sync-logs', label: 'Sync Logs' },
  { key: 'field-mapping', label: 'Field Mapping' },
  { key: 'health', label: 'Health' },
]

export default function IntegrationHubPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [pendingConnector, setPendingConnector] = useState<Connector | null>(null)

  const handleConnect = (c: Connector) => {
    setPendingConnector(c)
    setTab('integrations')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Enterprise Integration Hub</h1>
        <p className="text-sm text-gray-500 mt-1">Connect Reno to external systems · 17 connectors · Webhooks · Field mapping · Health monitoring</p>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'connectors' && <ConnectorsTab onConnect={handleConnect} />}
        {tab === 'integrations' && <IntegrationsTab initialConnector={pendingConnector} onClearConnector={() => setPendingConnector(null)} />}
        {tab === 'webhooks' && <WebhooksTab />}
        {tab === 'sync-logs' && <SyncLogsTab />}
        {tab === 'field-mapping' && <FieldMappingTab />}
        {tab === 'health' && <HealthTab />}
      </div>
    </div>
  )
}
