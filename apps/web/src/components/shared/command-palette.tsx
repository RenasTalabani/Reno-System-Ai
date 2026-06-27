'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from 'cmdk'
import {
  LayoutDashboard, Users, FolderKanban, Handshake, ShoppingCart, Wallet,
  Package, Truck, Factory, BarChart3, Brain, Zap, Headphones, FileText,
  BookOpen, MessageSquare, Globe, Store, Code2, Settings, Search,
  Plus, Moon, Sun, Keyboard, LogOut, Star, Clock, Sparkles,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useT } from '@/lib/i18n/use-translations'
import { useFavorites } from '@/hooks/use-favorites'
import { useRecentlyViewed } from '@/hooks/use-recently-viewed'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAskAI?: (query: string) => void
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'navigation' },
  { label: 'HR', href: '/hr', icon: Users, group: 'navigation' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, group: 'navigation' },
  { label: 'CRM', href: '/crm', icon: Handshake, group: 'navigation' },
  { label: 'Sales', href: '/sales', icon: ShoppingCart, group: 'navigation' },
  { label: 'Finance', href: '/finance', icon: Wallet, group: 'navigation' },
  { label: 'Inventory', href: '/inventory', icon: Package, group: 'navigation' },
  { label: 'Procurement', href: '/procurement', icon: Truck, group: 'navigation' },
  { label: 'Manufacturing', href: '/manufacturing', icon: Factory, group: 'navigation' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, group: 'navigation' },
  { label: 'AI Brain', href: '/brain', icon: Brain, group: 'navigation' },
  { label: 'Automation', href: '/automation', icon: Zap, group: 'navigation' },
  { label: 'Helpdesk', href: '/helpdesk', icon: Headphones, group: 'navigation' },
  { label: 'Documents', href: '/documents', icon: FileText, group: 'navigation' },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, group: 'navigation' },
  { label: 'Communications', href: '/comm', icon: MessageSquare, group: 'navigation' },
  { label: 'Portal', href: '/portal', icon: Globe, group: 'navigation' },
  { label: 'Marketplace', href: '/marketplace', icon: Store, group: 'navigation' },
  { label: 'Developer', href: '/developer', icon: Code2, group: 'navigation' },
  { label: 'Settings', href: '/settings', icon: Settings, group: 'navigation' },
]

const QUICK_ACTIONS = [
  { label: 'New Employee', href: '/hr/employees/new', icon: Plus },
  { label: 'New Ticket', href: '/helpdesk/tickets/new', icon: Plus },
  { label: 'New Invoice', href: '/sales/invoices/new', icon: Plus },
  { label: 'New Task', href: '/projects/tasks/new', icon: Plus },
  { label: 'New Contact', href: '/crm/contacts/new', icon: Plus },
]

export function CommandPalette({ open, onOpenChange, onAskAI }: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { t } = useT()
  const { favorites } = useFavorites()
  const { recent } = useRecentlyViewed()
  const [query, setQuery] = useState('')

  const runCommand = useCallback(
    (fn: () => void) => {
      onOpenChange(false)
      fn()
    },
    [onOpenChange],
  )

  const handleAskAI = useCallback(() => {
    if (query.trim()) {
      runCommand(() => onAskAI?.(query.trim()))
    }
  }, [query, runCommand, onAskAI])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b border-border px-3" role="search">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <CommandInput
          placeholder={String(t('cmd.placeholder'))}
          value={query}
          onValueChange={setQuery}
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Command palette search"
        />
      </div>
      <CommandList className="max-h-[420px] overflow-y-auto" aria-label="Command results">
        <CommandEmpty>
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>{String(t('cmd.noResults'))} &ldquo;{query}&rdquo;</p>
            {query && (
              <button
                onClick={handleAskAI}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors"
                aria-label={`Ask AI: ${query}`}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ask Reno Brain: &ldquo;{query}&rdquo;
              </button>
            )}
          </div>
        </CommandEmpty>

        {/* Ask AI — always at top when typing */}
        {query.length > 2 && (
          <CommandGroup heading={String(t('cmd.ai'))}>
            <CommandItem
              onSelect={handleAskAI}
              className="gap-3 cursor-pointer"
              aria-label={`Ask AI: ${query}`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />
              </div>
              <span className="flex-1">
                <span className="text-muted-foreground">Ask Brain: </span>
                &ldquo;{query}&rdquo;
              </span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                ↵
              </kbd>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Favorites */}
        {favorites.length > 0 && !query && (
          <CommandGroup heading={String(t('cmd.recent'))}>
            {favorites.slice(0, 3).map((fav) => (
              <CommandItem
                key={fav.href}
                onSelect={() => runCommand(() => router.push(fav.href))}
                className="gap-3 cursor-pointer"
              >
                <Star className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                {fav.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recently viewed */}
        {recent.length > 0 && !query && (
          <CommandGroup heading={String(t('cmd.recent'))}>
            {recent.slice(0, 4).map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
                className="gap-3 cursor-pointer"
              >
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading={String(t('cmd.navigation'))}>
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={item.label}
              onSelect={() => runCommand(() => router.push(item.href))}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading={String(t('cmd.actions'))}>
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.href}
              value={action.label}
              onSelect={() => runCommand(() => router.push(action.href))}
              className="gap-3 cursor-pointer"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* System Actions */}
        <CommandGroup heading="System">
          <CommandItem
            onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
            className="gap-3 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              : <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings/shortcuts'))}
            className="gap-3 cursor-pointer"
          >
            <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Keyboard Shortcuts
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/settings'))}
            className="gap-3 cursor-pointer"
          >
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>

      <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span><kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navigate</span>
        <span><kbd className="rounded border border-border bg-muted px-1">↵</kbd> select</span>
        <span><kbd className="rounded border border-border bg-muted px-1">esc</kbd> close</span>
      </div>
    </CommandDialog>
  )
}
