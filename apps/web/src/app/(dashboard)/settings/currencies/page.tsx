'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, RefreshCw, ArrowRightLeft } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Currency { code: string; name: string; symbol: string }
interface FxRate { id: string; fromCurrency: string; toCurrency: string; rate: number; effectiveDate: string; source: string }
interface Settings { baseCurrency: string; enabledCurrencies: string[] }

export default function CurrenciesPage() {
  const { token } = useAuthStore()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [rates, setRates] = useState<FxRate[]>([])
  const [settings, setSettings] = useState<Settings>({ baseCurrency: 'USD', enabledCurrencies: ['USD'] })
  const [showAddRate, setShowAddRate] = useState(false)
  const [rateForm, setRateForm] = useState({ fromCurrency: 'EUR', toCurrency: 'USD', rate: '' })
  const [convert, setConvert] = useState({ from: 'EUR', to: 'USD', amount: '100', result: null as number | null })

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/v1/fx/currencies`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/fx/rates`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/v1/fx/settings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([c, r, s]) => { setCurrencies(c.data ?? []); setRates(r.data ?? []); if (s.data) setSettings(s.data) })
  }, [token])

  const saveSettings = async (updated: Partial<Settings>) => {
    const next = { ...settings, ...updated }
    setSettings(next)
    await fetch(`${API}/v1/fx/settings`, { method: 'PUT', headers: h, body: JSON.stringify(next) })
  }

  const addRate = async () => {
    const res = await fetch(`${API}/v1/fx/rates`, { method: 'POST', headers: h, body: JSON.stringify({ ...rateForm, rate: parseFloat(rateForm.rate) }) }).then(r => r.json())
    if (res.data) { setRates(r => [res.data, ...r]); setShowAddRate(false); setRateForm({ fromCurrency: 'EUR', toCurrency: 'USD', rate: '' }) }
  }

  const doConvert = async () => {
    const res = await fetch(`${API}/v1/fx/convert`, { method: 'POST', headers: h, body: JSON.stringify({ from: convert.from, to: convert.to, amount: parseFloat(convert.amount) }) }).then(r => r.json())
    if (res.data?.converted !== undefined) setConvert(c => ({ ...c, result: res.data.converted }))
  }

  const currencyMap = new Map(currencies.map(c => [c.code, c]))

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Globe className="w-5 h-5 text-indigo-500" /> Multi-Currency Settings
      </h1>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Base Currency</h2>
        <div className="flex items-center gap-3">
          <select value={settings.baseCurrency} onChange={e => saveSettings({ baseCurrency: e.target.value })}
            className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground">
            {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">All reports consolidate to this currency</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-sm flex items-center justify-between">
          Currency Converter
          <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
        </h2>
        <div className="flex items-center gap-3">
          <input type="number" value={convert.amount} onChange={e => setConvert(c => ({ ...c, amount: e.target.value, result: null }))}
            className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <select value={convert.from} onChange={e => setConvert(c => ({ ...c, from: e.target.value, result: null }))}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
          <span className="text-muted-foreground">→</span>
          <select value={convert.to} onChange={e => setConvert(c => ({ ...c, to: e.target.value, result: null }))}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
          <button onClick={doConvert} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">Convert</button>
        </div>
        {convert.result !== null && (
          <p className="text-lg font-semibold text-foreground">{convert.amount} {convert.from} = <span className="text-indigo-400">{convert.result.toFixed(4)} {convert.to}</span></p>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Exchange Rates</h2>
          <button onClick={() => setShowAddRate(true)} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Rate
          </button>
        </div>
        {rates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No exchange rates set. Add rates to enable currency conversion.</p>
        ) : rates.map(r => (
          <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
            <span className="text-foreground font-medium">{r.fromCurrency} → {r.toCurrency}</span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-xs">{new Date(r.effectiveDate).toLocaleDateString()}</span>
              <span className="font-semibold text-foreground">{Number(r.rate).toFixed(6)}</span>
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{r.source}</span>
            </div>
          </div>
        ))}
      </div>

      {showAddRate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Exchange Rate</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">From</label>
                  <select value={rateForm.fromCurrency} onChange={e => setRateForm(f => ({ ...f, fromCurrency: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">To</label>
                  <select value={rateForm.toCurrency} onChange={e => setRateForm(f => ({ ...f, toCurrency: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Rate (1 {rateForm.fromCurrency} = ? {rateForm.toCurrency})</label>
                <input type="number" step="0.000001" value={rateForm.rate} onChange={e => setRateForm(f => ({ ...f, rate: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddRate(false)} className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={addRate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg transition-colors">Save Rate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
