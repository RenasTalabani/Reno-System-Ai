'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, GitBranch, FolderOpen,
  Shield, Settings, ClipboardList, Bell, LogOut, ChevronDown,
  Building, UsersRound, Boxes, Brain, BarChart3, Workflow, Package, ShoppingCart, Factory, PieChart,
  FileText, BookOpen, Globe, Headphones, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'

interface NavItem { label: string; href: string; icon: any; disabled?: boolean; badge?: string | number }
interface NavSection { group: string; items: NavItem[] }

const navigation: NavSection[] = [
  {
    group: 'Core',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    group: 'Identity',
    items: [
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Roles & Permissions', href: '/roles', icon: Shield },
      { label: 'Organization', href: '/organization', icon: Building2 },
    ],
  },
  {
    group: 'Business',
    items: [
      { label: 'HR', href: '/hr', icon: UsersRound },
      { label: 'Projects', href: '/projects', icon: GitBranch },
      { label: 'CRM', href: '/crm', icon: FolderOpen },
      { label: 'Sales', href: '/sales', icon: Boxes },
      { label: 'Finance', href: '/finance', icon: BarChart3 },
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Procurement', href: '/procurement', icon: ShoppingCart },
      { label: 'Manufacturing', href: '/manufacturing', icon: Factory },
      { label: 'Analytics', href: '/analytics', icon: PieChart },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { label: 'Communication', href: '/communication', icon: MessageSquare },
      { label: 'Documents', href: '/documents', icon: FileText },
      { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { label: 'Reno Brain', href: '/brain', icon: Brain },
      { label: 'Automation', href: '/automation', icon: Workflow },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Service Desk', href: '/helpdesk', icon: Headphones },
      { label: 'Portal Admin', href: '/portal-admin', icon: Globe },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Audit Logs', href: '/audit-logs', icon: ClipboardList },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <aside className="flex flex-col w-60 bg-sidebar border-r border-sidebar-border min-h-screen shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
          <Building className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sidebar-foreground font-bold text-sm">Reno System</span>
          <span className="block text-xs text-sidebar-foreground/50">v16.0.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.group} className="mb-4">
            <p className="px-5 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">
              {section.group}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.disabled ? '#' : item.href}
                  className={cn(
                    'flex items-center gap-3 px-5 py-2 text-sm transition-colors mx-2 rounded-lg',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="text-xs bg-sidebar-foreground/10 text-sidebar-foreground/50 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.firstName?.charAt(0) ?? user?.email?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-sidebar-foreground font-medium truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 text-sidebar-foreground/50"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
