'use client'
import { useState, useEffect } from 'react'
import { Shield, Smartphone, Globe, KeyRound, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Session { id: string; ipAddress: string; userAgent: string; isTrusted: boolean; lastActiveAt: string; expiresAt: string }
interface IpRule { id: string; cidr: string; type: string; description: string | null; isActive: boolean }
interface Summary { activeSessions: number; ipRules: number; twoFaEnabled: number }

export default function SecurityCenterPage() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [ipRules, setIpRules] = useState<IpRule[]>([])
  const [twoFa, setTwoFa] = useState(false)
  const [tab, setTab] = useState<'sessions' | 'ip' | '2fa'>('sessions')
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [s, sess, ip, fa] = await Promise.all([
      fetch(`${API}/v1/security-adv/summary`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/security-adv/sessions`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/security-adv/ip-rules`, { headers: h }).then(r => r.json()),
      fetch(`${API}/v1/security-adv/2fa/status`, { headers: h }).then(r => r.json()),
    ])
    setSummary(s.data); setSessions(sess.data ?? []); setIpRules(ip.data ?? []); setTwoFa(fa.data?.enabled)
    setLoading(false)
  }
  useEffect(() => { load() }, [token])

  const revokeSession = async (id: string) => { await fetch(`${API}/v1/security-adv/sessions/${id}`, { method: 'DELETE', headers: h }); load() }
  const deleteRule = async (id: string) => { await fetch(`${API}/v1/security-adv/ip-rules/${id}`, { method: 'DELETE', headers: h }); load() }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" /> Security Center</h1>
        <button onClick={load} disabled={loading} className="border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Active Sessions', value: summary.activeSessions, icon: Smartphone }, { label: 'IP Rules', value: summary.ipRules, icon: Globe }, { label: '2FA Enabled Users', value: summary.twoFaEnabled, icon: KeyRound }].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5"><div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">{c.label}</span><c.icon className="w-5 h-5 text-indigo-400" /></div><p className="text-2xl font-bold text-foreground">{c.value}</p></div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {(['sessions', 'ip', '2fa'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm px-4 py-2 rounded-lg transition-colors ${tab === t ? 'bg-card border border-border text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t === '2fa' ? '2FA' : t === 'ip' ? 'IP Rules' : 'Sessions'}</button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {sessions.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No active sessions</p>}
            {sessions.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{s.ipAddress}</p><p className="text-xs text-muted-foreground">{s.isTrusted ? '✓ Trusted · ' : ''}{new Date(s.lastActiveAt).toLocaleString()}</p></div>
                <button onClick={() => revokeSession(s.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'ip' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between"><h2 className="text-sm font-medium text-foreground">IP Allow / Block Rules</h2><button className="flex items-center gap-1 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="w-3 h-3" /> Add Rule</button></div>
          <div className="divide-y divide-border">
            {ipRules.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No IP rules configured</p>}
            {ipRules.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.type === 'allow' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{r.type}</span>
                <span className="text-sm font-mono text-foreground flex-1">{r.cidr}</span>
                {r.description && <span className="text-xs text-muted-foreground">{r.description}</span>}
                <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === '2fa' && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <KeyRound className={`w-12 h-12 mx-auto mb-4 ${twoFa ? 'text-emerald-400' : 'text-muted-foreground'}`} />
          <h2 className="text-lg font-semibold text-foreground mb-2">{twoFa ? 'Two-Factor Auth is Enabled' : 'Enable Two-Factor Auth'}</h2>
          <p className="text-sm text-muted-foreground mb-6">{twoFa ? 'Your account is protected with TOTP-based 2FA.' : 'Add an extra layer of security to your account.'}</p>
          <button className={`text-sm px-6 py-2.5 rounded-xl font-medium transition-colors ${twoFa ? 'border border-border text-foreground hover:bg-muted' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>{twoFa ? 'Manage 2FA' : 'Set Up 2FA'}</button>
        </div>
      )}
    </div>
  )
}
