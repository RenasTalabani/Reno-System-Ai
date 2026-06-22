'use client'

import { useEffect, useState } from 'react'
import { Plus, Briefcase, Clock, Calendar, Globe } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface LeaveType { id: string; name: string; code: string; paidType: string; maxDaysPerYear: number; genderRestriction: string; color: string }
interface Shift { id: string; name: string; code: string; startTime: string; endTime: string; workDays: string[]; color: string; isFlexible: boolean }
interface Holiday { id: string; name: string; date: string; holidayType: string; isPaid: boolean }

type TabKey = 'leave-types' | 'shifts' | 'holidays' | 'positions'

export default function HrSettingsPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<TabKey>('leave-types')
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)

  const load = async (t: TabKey) => {
    setLoading(true)
    try {
      if (t === 'leave-types') {
        const res = await fetch(`${API}/v1/hr/leave/types`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await res.json()
        if (d.success) setLeaveTypes(d.data)
      } else if (t === 'shifts') {
        const res = await fetch(`${API}/v1/hr/shifts`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await res.json()
        if (d.success) setShifts(d.data)
      } else if (t === 'holidays') {
        const res = await fetch(`${API}/v1/hr/holidays`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await res.json()
        if (d.success) setHolidays(d.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load(tab) }, [tab, token])

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'leave-types', label: 'Leave Types', icon: Calendar },
    { key: 'shifts', label: 'Shifts', icon: Clock },
    { key: 'holidays', label: 'Holidays', icon: Globe },
    { key: 'positions', label: 'Job Positions', icon: Briefcase },
  ]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure leave types, shifts, holidays, and job positions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />)}</div>
        ) : tab === 'leave-types' ? (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Leave Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid?</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Max Days/Year</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaveTypes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No leave types configured</td></tr>
              ) : leaveTypes.map(lt => (
                <tr key={lt.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                      <span className="font-medium text-foreground">{lt.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lt.code}</td>
                  <td className="px-4 py-3 capitalize text-foreground/80">{lt.paidType}</td>
                  <td className="px-4 py-3 text-foreground/80">{lt.maxDaysPerYear} days</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{lt.genderRestriction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'shifts' ? (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Shift</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Work Days</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flexible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shifts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No shifts configured</td></tr>
              ) : shifts.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.code}</td>
                  <td className="px-4 py-3 text-foreground/80">{s.startTime} – {s.endTime}</td>
                  <td className="px-4 py-3 text-foreground/70 uppercase text-xs">{Array.isArray(s.workDays) ? s.workDays.join(', ') : '—'}</td>
                  <td className="px-4 py-3 text-foreground/70">{s.isFlexible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'holidays' ? (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Holiday</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holidays.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No holidays configured for this year</td></tr>
              ) : holidays.map(h => (
                <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{h.name}</td>
                  <td className="px-4 py-3 text-foreground/80">{new Date(h.date).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{h.holidayType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-foreground/70">{h.isPaid ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">Job positions management coming soon</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Use the API endpoint /v1/hr/positions to manage positions</p>
          </div>
        )}
      </div>
    </div>
  )
}
