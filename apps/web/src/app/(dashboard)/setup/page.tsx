'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Play, RefreshCw, CheckCircle, ArrowRight, Building2 } from 'lucide-react'

const TENANT_ID = 'default-tenant'

interface Session {
  id: string
  status: string
  currentStep: number
  totalSteps: number
  detectedIndustry: string | null
  resumeToken: string | null
}

const INDUSTRY_ICONS: Record<string, string> = {
  gym: '🏋️', logistics: '🚛', manufacturing: '🏭', retail: '🛒',
  healthcare: '🏥', education: '🎓', services: '💼',
}

export default function SetupPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/ai-onboarding/sessions/active?tenantId=${TENANT_ID}`)
      .then(r => r.json())
      .then(d => { setSession(d.session); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleStart() {
    setStarting(true)
    const res = await fetch('/api/v1/ai-onboarding/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID }),
    }).then(r => r.json())
    router.push(`/setup/wizard?sessionId=${res.session.id}`)
  }

  function handleResume() {
    if (!session) return
    if (session.status === 'plan_generated') {
      router.push(`/setup/plan?sessionId=${session.id}`)
    } else {
      router.push(`/setup/wizard?sessionId=${session.id}`)
    }
  }

  const progress = session ? Math.round((session.currentStep / session.totalSteps) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4 shadow-lg">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI Company Setup</h1>
          <p className="mt-2 text-gray-500 text-base">
            Answer a few questions and Reno Brain will design your perfect business configuration.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-violet-400" />
            Checking for existing setup...
          </div>
        ) : session && session.status !== 'applied' ? (
          /* Resume existing session */
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Building2 size={18} className="text-violet-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Setup in Progress</div>
                <div className="text-sm text-gray-500">
                  {session.status === 'plan_generated' ? 'Plan generated — awaiting your approval' : `Step ${session.currentStep} of ${session.totalSteps} answered`}
                </div>
              </div>
              <div className="ml-auto text-2xl">
                {session.detectedIndustry ? INDUSTRY_ICONS[session.detectedIndustry] ?? '🏢' : '🏢'}
              </div>
            </div>

            {session.status !== 'plan_generated' && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={handleResume}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition">
                <Play size={16} />
                {session.status === 'plan_generated' ? 'Review Plan' : 'Resume Setup'}
              </button>
              <button type="button" onClick={handleStart} disabled={starting}
                className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
                Start New
              </button>
            </div>
          </div>
        ) : session?.status === 'applied' ? (
          /* Setup complete */
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 mb-2">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Setup Complete!</h2>
            <p className="text-sm text-gray-500">Your Reno configuration has been applied successfully.</p>
            <button type="button" onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700">
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* No session — start fresh */
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🏋️', label: 'Gym & Fitness' },
                  { icon: '🚛', label: 'Logistics' },
                  { icon: '🏭', label: 'Manufacturing' },
                  { icon: '🛒', label: 'Retail' },
                  { icon: '🏥', label: 'Healthcare' },
                  { icon: '🎓', label: 'Education' },
                  { icon: '💼', label: 'Services' },
                  { icon: '🏢', label: 'Any Business' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  'Answer 10 questions about your business',
                  'AI detects your industry and recommends modules',
                  'Review the complete setup plan',
                  'One-click apply after your approval',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                    <span className="text-sm text-gray-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 pb-8">
              <button type="button" onClick={handleStart} disabled={starting}
                className="w-full flex items-center justify-center gap-2 py-4 bg-violet-600 text-white rounded-xl font-semibold text-base hover:bg-violet-700 disabled:opacity-50 transition shadow-md shadow-violet-200">
                {starting ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {starting ? 'Starting...' : 'Start AI Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
