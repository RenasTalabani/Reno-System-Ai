'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Building2, Truck, Settings, Globe, ExternalLink,
  Palette, Bell, Shield, ClipboardList, Eye, Plus,
} from 'lucide-react'

interface Branding {
  portalName: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  welcomeMessage?: string
  footerText?: string
  customDomain?: string
  isEnabled: boolean
  employeePortalEnabled: boolean
  customerPortalEnabled: boolean
  supplierPortalEnabled: boolean
  partnerPortalEnabled: boolean
}

interface PortalUser {
  id: string
  userId: string
  portalType: string
  entityType: string
  isActive: boolean
  lastLoginAt?: string
}

interface AuditLog {
  id: string
  portalType: string
  action: string
  module: string
  occurredAt: string
}

export default function PortalAdminPage() {
  const [branding, setBranding] = useState<Branding | null>(null)
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'branding' | 'users' | 'audit'>('branding')

  const token = () => localStorage.getItem('accessToken') ?? ''

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` }
    Promise.all([
      fetch('/api/v1/portal/branding', { headers }).then(r => r.json()),
      fetch('/api/v1/portal/users', { headers }).then(r => r.json()),
      fetch('/api/v1/portal/audit?limit=20', { headers }).then(r => r.json()),
    ]).then(([b, u, a]) => {
      if (b.success) setBranding(b.data)
      if (u.success) setPortalUsers(u.data)
      if (a.success) setAuditLogs(a.data)
    }).finally(() => setLoading(false))
  }, [])

  const saveBranding = async () => {
    if (!branding) return
    setSaving(true)
    try {
      await fetch('/api/v1/portal/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(branding),
      })
    } finally { setSaving(false) }
  }

  const PORTAL_TYPES = [
    { type: 'employee', label: 'Employee Portal', icon: Users, color: 'bg-indigo-50 text-indigo-600', href: '/portal/employee', enabled: branding?.employeePortalEnabled },
    { type: 'customer', label: 'Customer Portal', icon: Building2, color: 'bg-emerald-50 text-emerald-600', href: '/portal/customer', enabled: branding?.customerPortalEnabled },
    { type: 'supplier', label: 'Supplier Portal', icon: Truck, color: 'bg-amber-50 text-amber-600', href: '/portal/supplier', enabled: branding?.supplierPortalEnabled },
  ]

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Management</h1>
          <p className="text-sm text-gray-500 mt-1">Configure and manage customer, employee, and supplier portals</p>
        </div>
        <Link
          href="/portal"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Preview Portal
        </Link>
      </div>

      {/* Portal Type Cards */}
      <div className="grid grid-cols-3 gap-4">
        {PORTAL_TYPES.map(p => {
          const Icon = p.icon
          return (
            <div key={p.type} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{p.label}</p>
              <p className="text-xs text-gray-500 mt-1">
                {portalUsers.filter(u => u.portalType === p.type).length} users
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Link href={p.href} target="_blank" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Preview
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex items-center gap-1">
          {[
            { key: 'branding', label: 'Branding', icon: Palette },
            { key: 'users', label: 'Portal Users', icon: Users },
            { key: 'audit', label: 'Audit Logs', icon: ClipboardList },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Branding Tab */}
      {activeTab === 'branding' && branding && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Portal Name</label>
              <input
                type="text"
                value={branding.portalName}
                onChange={e => setBranding(b => b ? { ...b, portalName: e.target.value } : b)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Custom Domain (future)</label>
              <input
                type="text"
                value={branding.customDomain ?? ''}
                onChange={e => setBranding(b => b ? { ...b, customDomain: e.target.value } : b)}
                placeholder="portal.yourcompany.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={e => setBranding(b => b ? { ...b, primaryColor: e.target.value } : b)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <span className="text-sm text-gray-600">{branding.primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={e => setBranding(b => b ? { ...b, secondaryColor: e.target.value } : b)}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <span className="text-sm text-gray-600">{branding.secondaryColor}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Welcome Message</label>
              <textarea
                rows={2}
                value={branding.welcomeMessage ?? ''}
                onChange={e => setBranding(b => b ? { ...b, welcomeMessage: e.target.value } : b)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Welcome to our portal..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-2">Portal Visibility</label>
              <div className="flex items-center gap-4">
                {[
                  { key: 'employeePortalEnabled', label: 'Employee' },
                  { key: 'customerPortalEnabled', label: 'Customer' },
                  { key: 'supplierPortalEnabled', label: 'Supplier' },
                ].map(toggle => (
                  <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branding[toggle.key as keyof Branding] as boolean}
                      onChange={e => setBranding(b => b ? { ...b, [toggle.key]: e.target.checked } : b)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{toggle.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={saveBranding}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">{portalUsers.length} portal users</p>
            <button className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
              <Plus className="w-3 h-3" /> Add Portal User
            </button>
          </div>
          {!portalUsers.length ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No portal users configured</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Portal Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {portalUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.userId.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{u.portalType}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{u.entityType}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {!auditLogs.length ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No audit logs yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Portal</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{log.portalType}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.module}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.occurredAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
