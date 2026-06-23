'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Building2, Truck, ArrowRight } from 'lucide-react'

export default function PortalLandingPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { router.push('/login'); return }

    // Auto-redirect based on portal type
    fetch('/api/v1/portal/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.portalType) {
          router.push(`/portal/${data.data.portalType}`)
        }
      })
  }, [])

  const portals = [
    {
      type: 'employee',
      title: 'Employee Portal',
      description: 'View payslips, request leave, access documents, and manage HR tasks',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      href: '/portal/employee',
    },
    {
      type: 'customer',
      title: 'Customer Portal',
      description: 'View invoices, track orders, and submit support tickets',
      icon: Building2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      href: '/portal/customer',
    },
    {
      type: 'supplier',
      title: 'Supplier Portal',
      description: 'View purchase orders, respond to RFQs, and track deliveries',
      icon: Truck,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      href: '/portal/supplier',
    },
  ]

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to the Portal</h1>
        <p className="text-gray-500 max-w-md">Select your portal type to continue, or you will be automatically redirected based on your account.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        {portals.map((p) => {
          const Icon = p.icon
          return (
            <a
              key={p.type}
              href={p.href}
              className={`block border-2 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all ${p.color}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon className="w-6 h-6" />
                <span className="font-bold text-lg">{p.title}</span>
              </div>
              <p className="text-sm opacity-80 mb-4">{p.description}</p>
              <div className="flex items-center gap-1 text-sm font-medium">
                Enter portal <ArrowRight className="w-4 h-4" />
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
