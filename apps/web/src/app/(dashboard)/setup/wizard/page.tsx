'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react'

const TENANT_ID = 'default-tenant'

interface WizardStep {
  key: string
  question: string
}

const ARRAY_STEPS = ['services', 'products', 'goals']
const NUMBER_STEPS = ['branches', 'employees']

export default function WizardPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('sessionId') ?? ''

  const [steps, setSteps] = useState<WizardStep[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/v1/ai-onboarding/wizard/steps').then(r => r.json()).then(d => {
      setSteps(d.steps ?? [])
    })
    // Load existing answers
    fetch(`/api/v1/ai-onboarding/sessions/${sessionId}?tenantId=${TENANT_ID}`).then(r => r.json()).then(d => {
      if (d.session?.answers?.length) {
        const map: Record<string, unknown> = {}
        for (const a of d.session.answers) map[a.stepKey] = a.answer
        setAnswers(map)
        setCurrentIdx(d.session.answers.length < (d.session.totalSteps ?? 10) ? d.session.answers.length : d.session.answers.length - 1)
      }
    })
  }, [sessionId])

  useEffect(() => {
    const step = steps[currentIdx]
    if (step) {
      const existing = answers[step.key]
      setInputValue(Array.isArray(existing) ? existing.join(', ') : String(existing ?? ''))
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [currentIdx, steps])

  const step = steps[currentIdx]
  const progress = steps.length ? Math.round(((currentIdx) / steps.length) * 100) : 0

  function parseAnswer(key: string, raw: string): unknown {
    if (ARRAY_STEPS.includes(key)) return raw.split(',').map(s => s.trim()).filter(Boolean)
    if (NUMBER_STEPS.includes(key)) return parseInt(raw) || 0
    return raw.trim()
  }

  async function handleNext() {
    if (!step || !inputValue.trim()) return
    setSaving(true)
    const answer = parseAnswer(step.key, inputValue)
    setAnswers(prev => ({ ...prev, [step.key]: answer }))

    await fetch(`/api/v1/ai-onboarding/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, stepKey: step.key, question: step.question, answer }),
    })
    setSaving(false)

    if (currentIdx < steps.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      await handleFinish()
    }
  }

  async function handleFinish() {
    setDetecting(true)
    await fetch(`/api/v1/ai-onboarding/sessions/${sessionId}/detect-industry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID }),
    })
    await fetch(`/api/v1/ai-onboarding/sessions/${sessionId}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID }),
    })
    setDetecting(false)
    setDone(true)
    setTimeout(() => router.push(`/setup/plan?sessionId=${sessionId}`), 1500)
  }

  function handleBack() {
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNext() }
  }

  if (detecting || done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          {done ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-2">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Plan Ready!</h2>
              <p className="text-gray-500">Redirecting to your setup plan...</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-2">
                <Sparkles size={32} className="text-violet-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Analyzing Your Business</h2>
              <p className="text-gray-500">Reno Brain is designing your perfect configuration...</p>
              <div className="flex justify-center gap-1 mt-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!step) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading wizard...</div>
  }

  const isArrayStep = ARRAY_STEPS.includes(step.key)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Question {currentIdx + 1} of {steps.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
              {currentIdx + 1}
            </div>
            <Sparkles size={14} className="text-violet-400" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">{step.question}</h2>

          {isArrayStep ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              rows={3}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Separate items with commas..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          ) : NUMBER_STEPS.includes(step.key) ? (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="number"
              min={0}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          )}

          <div className="flex gap-3 mt-6">
            {currentIdx > 0 && (
              <button type="button" onClick={handleBack}
                className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button type="button" onClick={handleNext} disabled={saving || !inputValue.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 transition">
              {saving ? <RefreshCw size={16} className="animate-spin" /> : null}
              {currentIdx < steps.length - 1 ? (<>Next <ArrowRight size={16} /></>) : (<><Sparkles size={16} /> Generate Plan</>)}
            </button>
          </div>
        </div>

        {/* Previous answers */}
        {Object.keys(answers).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(answers).slice(-3).map(([k, v]) => (
              <div key={k} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500">
                <span className="font-medium text-gray-700">{k.replace(/_/g, ' ')}:</span>{' '}
                {Array.isArray(v) ? v.slice(0, 2).join(', ') : String(v).slice(0, 30)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
