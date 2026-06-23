'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, User, Menu, X, ChevronDown, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'

interface Branding {
  portalName: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  welcomeMessage?: string
  footerText?: string
  employeePortalEnabled: boolean
  customerPortalEnabled: boolean
  supplierPortalEnabled: boolean
}

interface PortalMe {
  portalType: string | null
  user: { firstName?: string; lastName?: string; email: string } | null
}

const EMPLOYEE_NAV = [
  { label: 'Dashboard', href: '/portal/employee' },
  { label: 'Leave Requests', href: '/portal/employee/leave' },
  { label: 'Payslips', href: '/portal/employee/payslips' },
  { label: 'My Documents', href: '/portal/employee/documents' },
  { label: 'Support Tickets', href: '/portal/tickets' },
]

const CUSTOMER_NAV = [
  { label: 'Dashboard', href: '/portal/customer' },
  { label: 'Invoices', href: '/portal/customer/invoices' },
  { label: 'Orders', href: '/portal/customer/orders' },
  { label: 'Support Tickets', href: '/portal/tickets' },
]

const SUPPLIER_NAV = [
  { label: 'Dashboard', href: '/portal/supplier' },
  { label: 'Purchase Orders', href: '/portal/supplier/orders' },
  { label: 'RFQs', href: '/portal/supplier/rfqs' },
  { label: 'Support Tickets', href: '/portal/tickets' },
]

function getNav(portalType: string | null) {
  if (portalType === 'employee') return EMPLOYEE_NAV
  if (portalType === 'customer') return CUSTOMER_NAV
  if (portalType === 'supplier') return SUPPLIER_NAV
  return []
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const [branding, setBranding] = useState<Branding | null>(null)
  const [portalMe, setPortalMe] = useState<PortalMe | null>(null)
  const [unread, setUnread] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { router.push('/login'); return }
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('/api/v1/portal/branding', { headers }).then(r => r.json()),
      fetch('/api/v1/portal/me', { headers }).then(r => r.json()),
      fetch('/api/v1/portal/notifications?isRead=false&limit=1', { headers }).then(r => r.json()),
    ]).then(([b, me, notif]) => {
      if (b.success) setBranding(b.data)
      if (me.success) setPortalMe(me.data)
      if (notif.success) setUnread(notif.meta?.unread ?? 0)
    })
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const nav = getNav(portalMe?.portalType ?? null)
  const primary = branding?.primaryColor ?? '#6366f1'
  const portalName = branding?.portalName ?? 'Portal'
  const userName = portalMe?.user?.firstName
    ? `${portalMe.user.firstName} ${portalMe.user.lastName ?? ''}`.trim()
    : portalMe?.user?.email ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dynamic CSS variables */}
      <style>{`
        :root {
          --portal-primary: ${primary};
          --portal-secondary: ${branding?.secondaryColor ?? '#8b5cf6'};
          --portal-accent: ${branding?.accentColor ?? '#10b981'};
        }
      `}</style>

      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Name */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={portalName} className="h-8 w-auto" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${branding?.secondaryColor ?? '#8b5cf6'})` }}
                >
                  <Building className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="font-bold text-gray-900 text-sm hidden sm:block">{portalName}</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {nav.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                    )}
                    style={isActive ? { backgroundColor: primary } : undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right: Notifications + User */}
            <div className="flex items-center gap-2">
              <Link href="/portal/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: primary }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${branding?.secondaryColor ?? '#8b5cf6'})` }}>
                  {userName.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">{userName}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1">
            {nav.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn('block px-3 py-2 rounded-lg text-sm', isActive ? 'text-white font-medium' : 'text-gray-700 hover:bg-gray-100')}
                  style={isActive ? { backgroundColor: primary } : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>{branding?.footerText ?? `© ${new Date().getFullYear()} ${portalName}`}</span>
          <span>Powered by Reno System</span>
        </div>
      </footer>
    </div>
  )
}
