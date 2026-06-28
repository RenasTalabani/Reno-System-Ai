'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { messages, type Locale, type Messages, LOCALES, getDirection } from './index'

interface I18nStore {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => {
        set({ locale })
        // Apply direction to document
        if (typeof document !== 'undefined') {
          document.documentElement.dir = getDirection(locale)
          document.documentElement.lang = locale
        }
      },
    }),
    { name: 'reno-locale' },
  ),
)

type DeepKeyof<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${DeepKeyof<T[K]>}` : K) : never }[keyof T]
  : never

type DeepValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? DeepValue<T[K], R>
    : never
  : P extends keyof T
    ? T[P]
    : never

export function useT() {
  const { locale } = useI18nStore()
  const dict = messages[locale]

  function t<P extends DeepKeyof<Messages>>(path: P): DeepValue<Messages, P> {
    const keys = (path as string).split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = dict
    for (const key of keys) {
      val = val?.[key]
    }
    return (val ?? path) as DeepValue<Messages, P>
  }

  return { t, locale, dir: getDirection(locale), locales: LOCALES }
}
