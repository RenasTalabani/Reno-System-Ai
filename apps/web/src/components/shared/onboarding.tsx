'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Building2, Users, Database, ArrowRight, X, CheckCircle2 } from 'lucide-react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useT } from '@/lib/i18n/use-translations'

interface OnboardingStore {
  completed: boolean
  currentStep: number
  markCompleted: () => void
  setStep: (step: number) => void
  reset: () => void
}

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      completed: false,
      currentStep: 0,
      markCompleted: () => set({ completed: true }),
      setStep: (step) => set({ currentStep: step }),
      reset: () => set({ completed: false, currentStep: 0 }),
    }),
    { name: 'reno-onboarding' },
  ),
)

const STEPS = [
  { icon: Building2, color: 'from-blue-500 to-cyan-500', key: '1' },
  { icon: Users, color: 'from-purple-500 to-pink-500', key: '2' },
  { icon: Database, color: 'from-orange-500 to-red-500', key: '3' },
  { icon: Sparkles, color: 'from-green-500 to-teal-500', key: '4' },
]

export function OnboardingModal() {
  const { completed, currentStep, markCompleted, setStep } = useOnboarding()
  const [visible, setVisible] = useState(!completed)
  const { t } = useT()

  if (!visible || completed) return null

  const step = STEPS[currentStep]!
  const StepIcon = step.icon
  const isLast = currentStep === STEPS.length - 1

  const stepTitles = [
    String(t('onboarding.step1Title')),
    String(t('onboarding.step2Title')),
    String(t('onboarding.step3Title')),
    String(t('onboarding.step4Title')),
  ]
  const stepDescs = [
    String(t('onboarding.step1Desc')),
    String(t('onboarding.step2Desc')),
    String(t('onboarding.step3Desc')),
    String(t('onboarding.step4Desc')),
  ]

  const handleNext = () => {
    if (isLast) {
      markCompleted()
      setVisible(false)
    } else {
      setStep(currentStep + 1)
    }
  }

  const handleSkip = () => {
    markCompleted()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Reno System"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
              {/* Close */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Skip onboarding"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Step indicator */}
              <div className="flex gap-1.5 px-6 pt-6">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i <= currentStep ? 'bg-primary' : 'bg-border'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Icon */}
              <div className="flex justify-center pt-8 pb-4">
                <motion.div
                  key={currentStep}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}
                >
                  <StepIcon className="h-10 w-10 text-white" aria-hidden="true" />
                </motion.div>
              </div>

              {/* Content */}
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 pb-6 text-center"
              >
                {currentStep === 0 && (
                  <div className="mb-4">
                    <h1 className="text-2xl font-bold text-foreground">{String(t('onboarding.welcome'))}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{String(t('onboarding.subtitle'))}</p>
                  </div>
                )}
                <h2 className="text-lg font-semibold text-foreground">{stepTitles[currentStep]}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{stepDescs[currentStep]}</p>
              </motion.div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {String(t('onboarding.skip'))}
                </button>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={() => setStep(currentStep - 1)}
                      className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      {String(t('onboarding.back'))}
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isLast
                      ? <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{String(t('onboarding.finish'))}</>
                      : <>{String(t('onboarding.next'))}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
