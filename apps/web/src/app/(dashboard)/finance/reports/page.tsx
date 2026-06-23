'use client'

import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type ReportType = 'pl' | 'balance-sheet' | 'trial-balance'

export default function FinanceReportsPage() {
  const { token } = useAuthStore()
  const [report, setReport] = useState<ReportType>('pl')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const currentYear = new Date().getFullYear()
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(`${currentYear}-12-31`)
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10))

  const load = async () => {
    if (!token) return
    setLoading(true)
    let url = `${API}/v1/finance/reports/${report}`
    if (report === 'pl' || report === 'trial-balance') url += `?fromDate=${fromDate}&toDate=${toDate}`
    else url += `?asOf=${asOf}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [token, report])

  const fmt = (v: number) => `$${Number(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const renderPL = () => {
    if (!data) return null
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: fmt(data.totalRevenue), color: 'text-green-500' },
            { label: 'Total Expenses', value: fmt(data.totalExpenses), color: 'text-red-500' },
            { label: 'Net Income', value: fmt(data.netIncome), color: data.netIncome >= 0 ? 'text-green-500' : 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-green-500/5 border-b border-border"><h3 className="font-semibold text-green-600">Revenue</h3></div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {data.revenue?.map((r: any) => <tr key={r.code}><td className="px-5 py-2.5"><span className="font-mono text-xs text-muted-foreground mr-2">{r.code}</span>{r.name}</td><td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(r.amount)}</td></tr>)}
                {(!data.revenue?.length) && <tr><td colSpan={2} className="px-5 py-4 text-center text-muted-foreground text-xs">No revenue accounts</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-red-500/5 border-b border-border"><h3 className="font-semibold text-red-600">Expenses</h3></div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {data.expenses?.map((e: any) => <tr key={e.code}><td className="px-5 py-2.5"><span className="font-mono text-xs text-muted-foreground mr-2">{e.code}</span>{e.name}</td><td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(e.amount)}</td></tr>)}
                {(!data.expenses?.length) && <tr><td colSpan={2} className="px-5 py-4 text-center text-muted-foreground text-xs">No expense accounts</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderBalanceSheet = () => {
    if (!data) return null
    const Section = ({ title, rows, total, color }: any) => (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className={`px-5 py-3 border-b border-border ${color}`}><h3 className="font-semibold">{title}</h3></div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {rows?.map((r: any) => <tr key={r.code}><td className="px-5 py-2.5"><span className="font-mono text-xs text-muted-foreground mr-2">{r.code}</span>{r.name}</td><td className="px-5 py-2.5 text-right tabular-nums">{fmt(r.amount)}</td></tr>)}
            {(!rows?.length) && <tr><td colSpan={2} className="px-5 py-3 text-center text-muted-foreground text-xs">No accounts</td></tr>}
          </tbody>
          <tfoot className="border-t border-border bg-muted/10">
            <tr><td className="px-5 py-2.5 font-semibold">Total</td><td className="px-5 py-2.5 text-right font-bold tabular-nums">{fmt(total)}</td></tr>
          </tfoot>
        </table>
      </div>
    )
    return (
      <div className="space-y-4">
        <div className={`flex items-center gap-3 p-3 rounded-lg ${data.balanced ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
          <span className="text-sm font-medium">{data.balanced ? '✓ Balance sheet is balanced' : '⚠ Balance sheet is out of balance'}</span>
        </div>
        <Section title="Assets" rows={data.assets} total={data.totalAssets} color="bg-blue-500/5" />
        <Section title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} color="bg-red-500/5" />
        <Section title="Equity" rows={data.equity} total={data.totalEquity} color="bg-purple-500/5" />
      </div>
    )
  }

  const renderTrialBalance = () => {
    if (!data) return null
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Code</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Account</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Debit</th>
              <th className="text-right px-5 py-3 text-muted-foreground font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.rows?.map((r: any) => (
              <tr key={r.code} className="hover:bg-muted/10">
                <td className="px-5 py-2.5 font-mono text-muted-foreground">{r.code}</td>
                <td className="px-5 py-2.5 text-foreground">{r.name}</td>
                <td className="px-5 py-2.5 text-muted-foreground capitalize">{r.type}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{r.debit > 0 ? fmt(r.debit) : '—'}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{r.credit > 0 ? fmt(r.credit) : '—'}</td>
              </tr>
            ))}
            {(!data.rows?.length) && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No posted journal entries yet</td></tr>}
          </tbody>
          {data.totals && (
            <tfoot className="border-t-2 border-border bg-muted/10">
              <tr>
                <td colSpan={3} className="px-5 py-3 font-bold">TOTAL</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{fmt(data.totals.debit)}</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{fmt(data.totals.credit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">IFRS-ready financial statements</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[['pl', 'Profit & Loss'], ['balance-sheet', 'Balance Sheet'], ['trial-balance', 'Trial Balance']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setReport(key as ReportType)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${report === key ? 'bg-indigo-500 text-white' : 'bg-card border border-border text-foreground hover:bg-muted/50'}`}>
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {report === 'balance-sheet' ? (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">As of</label>
            <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
              className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none" />
            <span className="text-muted-foreground text-sm">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none" />
          </div>
        )}
        <button type="button" onClick={load}
          className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
          Run Report
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-card border border-border rounded-xl animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Calculating...</p>
        </div>
      ) : !data ? (
        <div className="h-64 bg-card border border-border rounded-xl flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select a report and click Run Report</p>
          </div>
        </div>
      ) : (
        <>
          {report === 'pl' && renderPL()}
          {report === 'balance-sheet' && renderBalanceSheet()}
          {report === 'trial-balance' && renderTrialBalance()}
        </>
      )}
    </div>
  )
}
