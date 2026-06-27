import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/lib/query-provider'
import { WebVitals } from '@/components/web-vitals'
import { SkipToMain, A11yLiveRegions, AccessibilityProvider } from '@/components/shared/accessibility'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { OnboardingModal } from '@/components/shared/onboarding'
import { AiAssistant } from '@/components/shared/ai-assistant'
import { GlobalCommandPalette } from '@/components/shared/global-command-palette'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Reno System',
    default: 'Reno System',
  },
  description: 'AI-first Business Operating System',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)', color: '#4f46e5' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        {/* SVG color-blind filter definitions — hidden, referenced via CSS url() */}
        <svg aria-hidden="true" className="svg-filters">
          <defs>
            <filter id="deuteranopia">
              <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" />
            </filter>
            <filter id="protanopia">
              <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" />
            </filter>
            <filter id="tritanopia">
              <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
            </filter>
          </defs>
        </svg>

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccessibilityProvider>
            <QueryProvider>
              <SkipToMain />
              <A11yLiveRegions />
              <OfflineBanner />
              <WebVitals />
              <main id="main-content">
                {children}
              </main>
              <GlobalCommandPalette />
              <AiAssistant />
              <OnboardingModal />
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{ duration: 4000 }}
              />
            </QueryProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
