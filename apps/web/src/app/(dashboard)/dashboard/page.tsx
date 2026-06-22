'use client'

import { useAuthStore } from '@/lib/auth-store'
import { Users, Shield, Building2, ClipboardList, ArrowUpRight, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const statCards = [
  { label: 'Total Users', icon: Users, color: 'from-indigo-500 to-purple-600', value: 'users' },
  { label: 'Active Roles', icon: Shield, color: 'from-emerald-500 to-teal-600', value: 'roles' },
  { label: 'Departments', icon: Building2, color: 'from-orange-500 to-amber-600', value: 'departments' },
  { label: 'Audit Events', icon: ClipboardList, color: 'from-pink-500 to-rose-600', value: 'audit' },
]

const upcomingPhases = [
  { phase: 1, name: 'Reno HR', features: ['Employees', 'Attendance', 'Payroll', 'Leave', 'Recruitment'], status: 'next' },
  { phase: 2, name: 'Reno Projects', features: ['Projects', 'Tasks', 'Kanban', 'Gantt', 'Time Tracking'], status: 'planned' },
  { phase: 3, name: 'Reno CRM', features: ['Leads', 'Contacts', 'Opportunities', 'Pipeline'], status: 'planned' },
  { phase: 4, name: 'Reno Sales', features: ['Quotes', 'Orders', 'Invoices', 'Subscriptions'], status: 'planned' },
]

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: usersData } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => api.get('/users?limit=1').then(r => r.data.meta?.pagination?.total ?? 0),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles-count'],
    queryFn: () => api.get('/roles').then(r => r.data.data?.length ?? 0),
  })

  const { data: deptsData } = useQuery({
    queryKey: ['depts-count'],
    queryFn: () => api.get('/org/departments').then(r => r.data.data?.length ?? 0),
  })

  const { data: auditData } = useQuery({
    queryKey: ['audit-count'],
    queryFn: () => api.get('/audit-logs?limit=1').then(r => r.data.meta?.pagination?.total ?? 0),
  })

  const stats = [usersData, rolesData, deptsData, auditData]

  const firstName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {firstName} 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          Reno System Phase 0 — Core Foundation is live. Here&apos;s your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', card.color)}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats[i] ?? '—'}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Phase 0 Completed Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Phase 0 — Completed Features</h3>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-1 rounded-full">Live</span>
          </div>
          <div className="space-y-2">
            {[
              'Multi-Tenant Architecture',
              'Authentication (JWT + Refresh Tokens)',
              'MFA Support (TOTP)',
              'Role-Based Access Control (RBAC)',
              'Multi-Company / Multi-Branch',
              'Department & Team Management',
              'User Management',
              'Audit Log System',
              'Settings & Branding Engine',
              'Event-Driven Architecture',
              'White-Label Support',
              'Feature Flags System',
              'Plugin-Ready Architecture',
              'API Keys Management',
              'Multi-Language Infrastructure',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Phases */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Upcoming Phases</h3>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {upcomingPhases.map((phase) => (
              <div key={phase.phase} className="flex gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                  phase.status === 'next'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {phase.phase}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{phase.name}</p>
                    {phase.status === 'next' && (
                      <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                        Up next <ArrowUpRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phase.features.join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-1">Reno System v0.1.0 — Phase 0 Complete</h3>
        <p className="text-indigo-200 text-sm">
          The foundation is built. Multi-tenant, event-driven, RBAC-secured, white-label ready.
          Awaiting Phase 1 approval to begin Reno HR.
        </p>
      </div>
    </div>
  )
}
