'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, FileText, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Document {
  id: string; documentName: string; documentType: string; documentNumber?: string
  isVerified: boolean; isConfidential: boolean; expiryDate?: string; createdAt: string
  employee: { id: string; firstName: string; lastName: string; employeeCode: string }
}

export default function DocumentsPage() {
  const { token } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isVerified, setIsVerified] = useState('')
  const [expiring, setExpiring] = useState(false)
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (isVerified !== '') params.set('isVerified', isVerified)
      if (expiring) params.set('expiring', 'true')
      const res = await fetch(`${API}/v1/hr/documents?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) { setDocuments(data.data); setTotal(data.meta?.pagination?.total ?? 0) }
    } finally {
      setLoading(false)
    }
  }, [token, page, isVerified, expiring])

  useEffect(() => { if (token) load() }, [load])

  const handleVerify = async (id: string) => {
    setVerifyingId(id)
    try {
      await fetch(`${API}/v1/hr/documents/${id}/verify`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
      load()
    } finally { setVerifyingId(null) }
  }

  const totalPages = Math.ceil(total / limit)

  const isExpiringSoon = (date?: string) => {
    if (!date) return false
    const d = new Date(date)
    const in30 = new Date(); in30.setDate(in30.getDate() + 30)
    return d <= in30 && d >= new Date()
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employee Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and verify employee documents</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={isVerified} onChange={e => { setIsVerified(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <option value="">All verification status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg cursor-pointer text-sm text-foreground">
          <input type="checkbox" checked={expiring} onChange={e => { setExpiring(e.target.checked); setPage(1) }} className="rounded border-border" />
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Expiring soon (30 days)
        </label>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Document</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Number</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expiry</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Verified</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-muted/50 rounded animate-pulse" /></td></tr>)
            ) : documents.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No documents found</td></tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-semibold text-indigo-500">{getInitials(doc.employee.firstName, doc.employee.lastName)}</div>
                      <div>
                        <p className="font-medium text-foreground">{doc.employee.firstName} {doc.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{doc.employee.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{doc.documentName}</span>
                      {doc.isConfidential && <Badge variant="warning" className="text-[10px] px-1 py-0">Confidential</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{doc.documentType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{doc.documentNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    {doc.expiryDate ? (
                      <span className={`flex items-center gap-1.5 ${isExpiringSoon(doc.expiryDate) ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {isExpiringSoon(doc.expiryDate) && <AlertTriangle className="w-3.5 h-3.5" />}
                        {new Date(doc.expiryDate).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={doc.isVerified ? 'success' : 'warning'}>{doc.isVerified ? 'Verified' : 'Pending'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {!doc.isVerified && (
                      <button
                        onClick={() => handleVerify(doc.id)}
                        disabled={verifyingId === doc.id}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                        title="Verify document"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} documents</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
