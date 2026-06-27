'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { useI18nStore } from '@/lib/i18n/use-translations'
import { LOCALES, type Locale } from '@/lib/i18n/index'

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const locale = useI18nStore((s) => s.locale)
  const setLocale = useI18nStore((s) => s.setLocale)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{LOCALES[locale as Locale]?.nativeName}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-border bg-background shadow-xl py-1.5"
              aria-label="Select language"
            >
              <div role="menu">
              {(Object.entries(LOCALES) as [Locale, typeof LOCALES[Locale]][]).map(([code, info]) => (
                <button
                  type="button"
                  key={code}
                  role="menuitem"
                  aria-current={locale === code ? 'true' : undefined}
                  onClick={() => { setLocale(code); setOpen(false) }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <span className="text-base" aria-hidden="true">{info.flag}</span>
                  <span className="flex-1 text-left text-foreground">{info.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{info.dir.toUpperCase()}</span>
                  {locale === code && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                </button>
              ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
