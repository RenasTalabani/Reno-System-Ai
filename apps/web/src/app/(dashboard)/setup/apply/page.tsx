'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, RefreshCw, Sparkles, ArrowRight } from 'lucide-react'

const TENANT_ID = 'default-tenant'

interface ApplyResult {
  id: string; title: string; status: 'applied' | 'failed' | 'pending'; error?: string
}

export default function ApplyPage() {
  const router = useRouter()
  const params = useSearchParams()
  const planId = params.get('planId') ?? ''

  const [status, setStatus] = useState<'idle' | 'applying' | 'done'>('idle')
  const [results, setResults] = useState<ApplyResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const applied = useRef(false)

  useEffect(() => {
    if (!planId || applied.current) return
    applied.current = true
    apply()
  }, [planId])

  async function apply() {
    setStatus('applying')
    try {
      const res = await fetch(`/api/v1/ai-onboarding/plans/${planId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID }),
      }).then(r => r.json())

      if (res.results) {
        for (let i = 0; i < res.results.length; i++) {
          await new Promise(r => setTimeout(r, 80))
          setResults(prev => [...prev, res.results[i]])
        }
        setStatus('done')
      } else {
        setError(res.error ?? 'Apply failed')
        setStatus('done')
      }
    } catch (err: any) {
      setError(String(err?.message ?? err))
      setStatus('done')
    }
  }

  const appliedCount = results.filter(r => r.status === 'applied').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const progress = results.length ? Math.round((appliedCount / results.length) * 100) : 0

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center py-6">
        {status === 'applying' ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-4">
              <Sparkles size={28} className="text-violet-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Applying Your Setup</h1>
            <p className="text-gray-500 text-sm mt-2">Reno is configuring your system — please wait...</p>
          </>
        ) : status === 'done' && !error ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Setup Complete!</h1>
            <p className="text-gray-500 text-sm mt-2">
              {appliedCount} items applied successfully.{failedCount > 0 ? ` ${failedCount} items had errors.` : ''}
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-4">
              <XCircle size={28} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Setup Error</h1>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {status === 'applying' && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Applying...</span><span>{appliedCount} applied</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Applied Items
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {results.map(result => (
              <div key={result.id} className="flex items-start gap-3 px-5 py-3">
                {result.status === 'applied' ? (
                  <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                ) : result.status === 'failed' ? (
                  <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <RefreshCw size={14} className="text-gray-300 mt-0.5 shrink-0 animate-spin" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{result.title}</div>
                  {result.error && <div className="text-xs text-red-500 mt-0.5">{result.error}</div>}
                </div>
                <span className={`text-xs font-medium shrink-0 ${
                  result.status === 'applied' ? 'text-green-600' :
                  result.status === 'failed' ? 'text-red-500' : 'text-gray-400'
                }`}>{result.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {status === 'done' && results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Applied', value: appliedCount, color: 'text-green-600 bg-green-50 border-green-100' },
            { label: 'Failed', value: failedCount, color: 'text-red-500 bg-red-50 border-red-100' },
            { label: 'Total', value: results.length, color: 'text-violet-700 bg-violet-50 border-violet-100' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-4 text-center ${stat.color}`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {status === 'done' && !error && (
        <button type="button" onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-4 bg-violet-600 text-white rounded-2xl font-semibold hover:bg-violet-700 transition">
          Go to Dashboard <ArrowRight size={16} />
        </button>
      )}
    </div>
  )
}
