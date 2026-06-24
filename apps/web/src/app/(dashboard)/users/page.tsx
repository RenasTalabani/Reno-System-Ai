'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { getInitials, formatDate } from '@/lib/utils'
import { Plus, Search, ChevronLeft, ChevronRight, MoreHorizontal, UserX, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().optional(),
  role: z.string().optional(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

const statusBadge = (status: string) => {
  if (status === 'active') return <Badge variant="success">Active</Badge>
  if (status === 'suspended') return <Badge variant="danger">Suspended</Badge>
  if (status === 'pending') return <Badge variant="warning">Pending</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () =>
      api.get(`/users?page=${page}&limit=15${search ? `&search=${encodeURIComponent(search)}` : ''}`)
        .then(r => r.data),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then(r => r.data.data ?? []),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => api.post('/users', {
      email: data.email,
      password: data.password,
      profile: { firstName: data.firstName, lastName: data.lastName },
      roles: data.role ? [{ roleId: data.role }] : [],
    }),
    onSuccess: () => {
      toast.success('User created successfully')
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      reset()
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message ?? 'Failed to create user'),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/status`, { status: 'suspended' }),
    onSuccess: () => {
      toast.success('User suspended')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to suspend user'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  })

  const users = data?.data ?? []
  const pagination = data?.meta?.pagination

  const handleSearch = () => setSearch(searchInput)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">Manage tenant users and their access</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          New User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>Search</Button>
        {search && (
          <Button variant="ghost" onClick={() => { setSearch(''); setSearchInput('') }}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6">
                  <TableSkeleton rows={5} cols={5} />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {getInitials(user.profile?.firstName ?? user.email, user.profile?.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {(user.profile?.displayName ?? `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim()) || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.profile?.jobTitle ?? 'No title'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{user.email}</td>
                  <td className="px-4 py-3">{statusBadge(user.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/users/${user.id}`}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
                        title="View user"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {user.status === 'active' && (
                        <button
                          onClick={() => suspendMutation.mutate(user.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 transition"
                          title="Suspend user"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {pagination.total} users · page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset() }}
        title="Create New User"
        description="Add a user to your tenant. They will receive an invitation email."
        size="md"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              placeholder="John"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              {...register('lastName')}
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            placeholder="john@company.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="Min 8 characters"
            {...register('password')}
            error={errors.password?.message}
          />
          {rolesData && (
            <Select
              label="Assign Role"
              options={(rolesData as any[]).map((r: any) => ({ value: r.id, label: r.name }))}
              placeholder="Select a role (optional)"
              {...register('role')}
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => { setShowCreate(false); reset() }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
