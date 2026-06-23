'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-500 bg-blue-500/10',
  liability: 'text-red-500 bg-red-500/10',
  equity: 'text-purple-500 bg-purple-500/10',
  revenue: 'text-green-500 bg-green-500/10',
  expense: 'text-amber-500 bg-amber-500/10',
}

function AccountNode({ account, depth = 0 }: { account: any, depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = account.children?.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors ${depth > 0 ? 'border-l border-border ml-6' : ''}`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center shrink-0"
        >
          {hasChildren ? (expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />) : <span className="w-3.5" />}
        </button>
        <span className="font-mono text-sm text-muted-foreground w-16 shrink-0">{account.code}</span>
        <span className={`text-sm font-medium text-foreground flex-1 ${!account.isDetail ? 'font-semibold' : ''}`}>{account.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[account.type] ?? 'bg-muted text-muted-foreground'}`}>{account.type}</span>
        <span className="text-xs text-muted-foreground w-24 text-right capitalize">{account.category?.replace(/_/g, ' ')}</span>
        <span className="text-xs text-muted-foreground w-14 text-right">{account.normalBalance}</span>
      </div>
      {expanded && hasChildren && account.children.map((child: any) => (
        <AccountNode key={child.id} account={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function ChartOfAccountsPage() {
  const { token } = useAuthStore()
  const [tree, setTree] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/v1/finance/accounts/tree`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setTree(json.data) })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Double-entry bookkeeping account structure</p>
        </div>
        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
          <span className="w-5 shrink-0" />
          <span className="w-16 shrink-0">Code</span>
          <span className="flex-1">Account Name</span>
          <span className="w-20 text-right">Type</span>
          <span className="w-24 text-right">Category</span>
          <span className="w-14 text-right">Balance</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading accounts...</div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-sm">No accounts configured yet.</p>
            <p className="text-xs mt-1">Run the database seed to load the default chart of accounts.</p>
          </div>
        ) : (
          tree.map(acc => <AccountNode key={acc.id} account={acc} />)
        )}
      </div>
    </div>
  )
}
