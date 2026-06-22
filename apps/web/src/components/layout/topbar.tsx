'use client'

import { Search, Bell, Plus, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Users',
  '/roles': 'Roles & Permissions',
  '/organization': 'Organization',
  '/settings': 'Settings',
  '/audit-logs': 'Audit Logs',
  '/notifications': 'Notifications',
}

export function Topbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const title = pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] ??
    'Reno System'

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const ThemeIcon = theme === 'light' ? Moon : theme === 'dark' ? Monitor : Sun

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0 sticky top-0 z-30">
      {/* Page Title */}
      <h1 className="text-base font-semibold text-foreground flex-1">{title}</h1>

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search... (⌘K)"
          className="bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56 transition"
        />
      </div>

      {/* Quick actions */}
      <button className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition">
        <Plus className="w-4 h-4" />
        New
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(nextTheme)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition"
        title="Toggle theme"
      >
        <ThemeIcon className="w-4 h-4" />
      </button>

      {/* Notifications */}
      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition relative">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
    </header>
  )
}
