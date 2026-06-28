'use client'

import { useState, useEffect } from 'react'
import { Palette, Globe, Check, Trash2, Plus, Eye, Upload } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Theme {
  id: string
  name: string
  isActive: boolean
  colors: Record<string, string>
  logoUrl: string | null
  faviconUrl: string | null
  createdAt: string
}

interface Domain {
  id: string
  domain: string
  isPrimary: boolean
  sslStatus: string
  verifiedAt: string | null
}

const DEFAULT_COLORS = {
  primary: '#6366f1',
  background: '#09090b',
  card: '#18181b',
  border: '#27272a',
  foreground: '#fafafa',
  muted: '#27272a',
  accent: '#6366f1',
  destructive: '#ef4444',
  success: '#22c55e',
}

export default function WhiteLabelPage() {
  const { token } = useAuthStore()
  const [themes, setThemes] = useState<Theme[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [tab, setTab] = useState<'themes' | 'domains'>('themes')
  const [editing, setEditing] = useState<Partial<Theme> | null>(null)
  const [newDomain, setNewDomain] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/v1/white-label/themes`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/white-label/domains`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([t, d]) => { setThemes(t.data ?? []); setDomains(d.data ?? []) })
  }, [token])

  const activate = async (id: string) => {
    await fetch(`${API}/v1/white-label/themes/${id}/activate`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setThemes(t => t.map(x => ({ ...x, isActive: x.id === id })))
  }

  const saveTheme = async () => {
    if (!editing) return
    if (editing.id) {
      const res = await fetch(`${API}/v1/white-label/themes/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(editing) })
      const data = await res.json()
      setThemes(t => t.map(x => x.id === editing.id ? data.data : x))
    } else {
      const res = await fetch(`${API}/v1/white-label/themes`, { method: 'POST', headers, body: JSON.stringify({ ...editing, name: editing.name || 'New Theme', colors: editing.colors || DEFAULT_COLORS }) })
      const data = await res.json()
      if (data.data) setThemes(t => [...t, data.data])
    }
    setEditing(null)
  }

  const delTheme = async (id: string) => {
    await fetch(`${API}/v1/white-label/themes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setThemes(t => t.filter(x => x.id !== id))
  }

  const addDomain = async () => {
    if (!newDomain.trim()) return
    const res = await fetch(`${API}/v1/white-label/domains`, { method: 'POST', headers, body: JSON.stringify({ domain: newDomain.trim() }) })
    const data = await res.json()
    if (data.data) { setDomains(d => [...d, data.data]); setNewDomain('') }
  }

  const verifyDomain = async (id: string) => {
    await fetch(`${API}/v1/white-label/domains/${id}/verify`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setDomains(d => d.map(x => x.id === id ? { ...x, sslStatus: 'active', verifiedAt: new Date().toISOString() } : x))
  }

  const delDomain = async (id: string) => {
    await fetch(`${API}/v1/white-label/domains/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setDomains(d => d.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-indigo-500" /> White-Label & Theme Studio
      </h1>

      <div className="flex gap-1 mb-6 bg-muted/40 rounded-xl p-1 w-fit">
        {(['themes', 'domains'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors capitalize ${tab === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'themes' ? <><Palette className="w-3.5 h-3.5 inline mr-1.5" />Themes</> : <><Globe className="w-3.5 h-3.5 inline mr-1.5" />Custom Domains</>}
          </button>
        ))}
      </div>

      {tab === 'themes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setEditing({ colors: { ...DEFAULT_COLORS }, name: '' })}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> New Theme
            </button>
          </div>
          {themes.map(theme => (
            <div key={theme.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${theme.isActive ? 'border-indigo-500' : 'border-border'}`}>
              <div className="flex gap-1.5 shrink-0">
                {Object.values(theme.colors).slice(0, 5).map((color, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">{theme.name}</p>
                  {theme.isActive && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">active</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {!theme.isActive && (
                  <button onClick={() => activate(theme.id)} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 border border-indigo-500/30 rounded-lg transition-colors">
                    <Check className="w-3.5 h-3.5 inline mr-1" />Activate
                  </button>
                )}
                <button onClick={() => setEditing({ ...theme })} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                {!theme.isActive && (
                  <button onClick={() => delTheme(theme.id)} className="p-1.5 text-muted-foreground/40 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'domains' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input value={newDomain} onChange={e => setNewDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="yourdomain.com" className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground" />
            <button onClick={addDomain} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors">Add</button>
          </div>
          {domains.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No custom domains configured</div>
          ) : domains.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{d.domain}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.sslStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{d.sslStatus}</span>
                  {d.isPrimary && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">primary</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {d.sslStatus !== 'active' && (
                  <button onClick={() => verifyDomain(d.id)} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 border border-indigo-500/30 rounded-lg transition-colors">Verify</button>
                )}
                <button onClick={() => delDomain(d.id)} className="p-1.5 text-muted-foreground/40 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">{editing.id ? 'Edit Theme' : 'New Theme'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Theme name</label>
                <input value={editing.name ?? ''} onChange={e => setEditing(t => ({ ...t!, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Colors</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(editing.colors ?? DEFAULT_COLORS).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input type="color" value={value as string} onChange={e => setEditing(t => ({ ...t!, colors: { ...(t!.colors ?? {}), [key]: e.target.value } }))}
                        className="w-8 h-8 rounded border border-border cursor-pointer" />
                      <span className="text-xs text-muted-foreground">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveTheme} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Save Theme</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
