import en, { type Messages } from './locales/en.js'
import ar from './locales/ar.js'
import ku from './locales/ku.js'

export type Locale = 'en' | 'ar' | 'ku'
export type Direction = 'ltr' | 'rtl'

export const LOCALES: Record<Locale, { name: string; nativeName: string; dir: Direction; flag: string }> = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇬🇧' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  ku: { name: 'Kurdish', nativeName: 'کوردی', dir: 'rtl', flag: '🏴' },
}

export const messages: Record<Locale, Messages> = { en, ar, ku }

export function getDirection(locale: Locale): Direction {
  return LOCALES[locale].dir
}

export function isRTL(locale: Locale): boolean {
  return LOCALES[locale].dir === 'rtl'
}

export type { Messages }
