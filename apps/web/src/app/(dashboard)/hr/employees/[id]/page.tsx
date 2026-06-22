'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, User, FileText, Clock, DollarSign } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Employee {
  id: string; employeeCode: string; firstName: string; lastName: string
  workEmail: string; personalEmail?: string; phone?: string
  employmentType: string; status: string; hireDate: string
  dateOfBirth?: string; gender?: string; nationality?: string
  address?: Record<string, string>; avatarUrl?: string
  department?: { id: string; name: string }
  company?: { id: string; name: string }
  branch?: { id: string; name: string }
  manager?: { id: string; firstName: string; lastName: string; avatarUrl?: string }
  subordinates?: Array<{ id: string; firstName: string; lastName: string; avatarUrl?: string }>
  positions?: Array<{ id: string; isCurrent: boolean; startDate: string; position: { title: string } }>
  documents?: Array<{ id: string; documentName: string; documentType: string; expiryDate?: string; isVerified: boolean }>
  shiftAssigns?: Array<{ shift: { name: string; startTime: string; endTime: string } }>
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', on_leave: 'warning', suspended: 'warning', terminated: 'danger', probation: 'default',
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'leave' | 'payslips' | 'documents'>('profile')
  const [subData, setSubData] = useState<any>(null)
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/v1/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setEmployee(d.data) })
      .finally(() => setLoading(false))
  }, [id, token])

  useEffect(() => {
    if (!token || activeTab === 'profile') return
    setSubLoading(true)
    const endpoints: Record<string, string> = {
      attendance: `/v1/hr/employees/${id}/attendance`,
      leave: `/v1/hr/employees/${id}/leave-balance`,
      payslips: `/v1/hr/employees/${id}/payslips`,
      documents: `/v1/hr/documents?employeeId=${id}`,
    }
    fetch(`${API}${endpoints[activeTab]}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setSubData(d.data) })
      .finally(() => setSubLoading(false))
  }, [activeTab, id, token])

  if (loading) return <div className="p-8 animate-pulse"><div className="h-40 bg-card rounded-xl" /></div>
  if (!employee) return <div className="p-8 text-muted-foreground">Employee not found.</div>

  const currentPosition = employee.positions?.find(p => p.isCurrent)
  const currentShift = employee.shiftAssigns?.[0]

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leave', label: 'Leave Balance' },
    { key: 'payslips', label: 'Payslips' },
    { key: 'documents', label: 'Documents' },
  ] as const

  return (
    <div className="p-8 space-y-6">
      {/* Back */}
      <Link href="/hr/employees" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </Link>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-6">
        <div className="w-16 h-16 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl font-bold text-indigo-500 shrink-0">
          {getInitials(employee.firstName, employee.lastName)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{employee.firstName} {employee.lastName}</h1>
              <p className="text-muted-foreground text-sm">{currentPosition?.position?.title ?? 'No Position'} · {employee.department?.name ?? 'No Department'}</p>
              <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">{employee.employeeCode}</p>
            </div>
            <Badge variant={statusVariant[employee.status] ?? 'default'} className="capitalize">{employee.status.replace('_', ' ')}</Badge>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{employee.workEmail}</span>
            {employee.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{employee.phone}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Hired {new Date(employee.hireDate).toLocaleDateString()}</span>
            {currentShift && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{currentShift.shift.name} ({currentShift.shift.startTime}–{currentShift.shift.endTime})</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Personal Information</h3>
            <div className="space-y-3 text-sm">
              {employee.dateOfBirth && <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span>{new Date(employee.dateOfBirth).toLocaleDateString()}</span></div>}
              {employee.gender && <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span className="capitalize">{employee.gender}</span></div>}
              {employee.nationality && <div className="flex justify-between"><span className="text-muted-foreground">Nationality</span><span>{employee.nationality}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Employment Type</span><span className="capitalize">{employee.employmentType.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span>{employee.company?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{employee.branch?.name ?? '—'}</span></div>
            </div>
          </div>

          {/* Manager & Team */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Reporting Structure</h3>
            {employee.manager ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Manager</p>
                <Link href={`/hr/employees/${employee.manager.id}`} className="flex items-center gap-3 hover:text-indigo-500 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-semibold text-indigo-500">{getInitials(employee.manager.firstName, employee.manager.lastName)}</div>
                  <span className="text-sm font-medium">{employee.manager.firstName} {employee.manager.lastName}</span>
                </Link>
              </div>
            ) : <p className="text-sm text-muted-foreground">No manager assigned</p>}

            {(employee.subordinates?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Direct Reports ({employee.subordinates?.length})</p>
                <div className="flex flex-wrap gap-2">
                  {employee.subordinates?.slice(0, 5).map(s => (
                    <Link key={s.id} href={`/hr/employees/${s.id}`} className="flex items-center gap-2 bg-muted/30 rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-semibold text-indigo-500">{getInitials(s.firstName, s.lastName)}</div>
                      <span className="text-xs">{s.firstName} {s.lastName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'profile' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {subLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />)}</div>
          ) : !subData || (Array.isArray(subData) && subData.length === 0) ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No records found</div>
          ) : activeTab === 'leave' ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30"><tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Leave Type</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Allocated</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Used</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Pending</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Remaining</th></tr></thead>
              <tbody className="divide-y divide-border">
                {(subData as any[]).map((b: any) => <tr key={b.id}><td className="px-4 py-3 font-medium">{b.leaveType?.name ?? '—'}</td><td className="px-4 py-3">{b.allocatedDays}</td><td className="px-4 py-3 text-red-500">{b.usedDays}</td><td className="px-4 py-3 text-amber-500">{b.pendingDays}</td><td className="px-4 py-3 text-emerald-500 font-medium">{Number(b.allocatedDays) - Number(b.usedDays) - Number(b.pendingDays)}</td></tr>)}
              </tbody>
            </table>
          ) : activeTab === 'payslips' ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30"><tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Gross</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Net</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {(subData as any[]).map((p: any) => <tr key={p.id}><td className="px-4 py-3">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month-1]} {p.year}</td><td className="px-4 py-3">${Number(p.grossSalary).toLocaleString()}</td><td className="px-4 py-3 font-medium">${Number(p.netSalary).toLocaleString()}</td><td className="px-4 py-3"><Badge variant={p.status === 'paid' ? 'success' : p.status === 'processed' ? 'info' : 'default'} className="capitalize">{p.status}</Badge></td></tr>)}
              </tbody>
            </table>
          ) : activeTab === 'attendance' ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30"><tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Check In</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Check Out</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th></tr></thead>
              <tbody className="divide-y divide-border">
                {(subData as any[]).map((a: any) => <tr key={a.id}><td className="px-4 py-3">{new Date(a.date).toLocaleDateString()}</td><td className="px-4 py-3 text-muted-foreground">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td className="px-4 py-3 text-muted-foreground">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td className="px-4 py-3">{a.workingHours ? `${a.workingHours}h` : '—'}</td><td className="px-4 py-3"><Badge variant={a.status === 'present' ? 'success' : a.status === 'absent' ? 'danger' : 'warning'} className="capitalize">{a.status.replace('_', ' ')}</Badge></td></tr>)}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30"><tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Document</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Expiry</th><th className="text-left px-4 py-3 font-medium text-muted-foreground">Verified</th></tr></thead>
              <tbody className="divide-y divide-border">
                {(Array.isArray(subData) ? subData : subData?.data ?? []).map((d: any) => <tr key={d.id}><td className="px-4 py-3 font-medium">{d.documentName}</td><td className="px-4 py-3 text-muted-foreground capitalize">{d.documentType.replace('_', ' ')}</td><td className="px-4 py-3 text-muted-foreground">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</td><td className="px-4 py-3"><Badge variant={d.isVerified ? 'success' : 'warning'}>{d.isVerified ? 'Verified' : 'Pending'}</Badge></td></tr>)}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
