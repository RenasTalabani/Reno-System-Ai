'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, setAccessToken, clearAuth } from './api'

interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  roles: string[]
  tenantId: string
}

interface AuthState {
  user: AuthUser | null
  tenantSlug: string | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, tenantSlug: string) => Promise<{ mfaRequired?: boolean; tempToken?: string }>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
  setTenantSlug: (slug: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenantSlug: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, tenantSlug) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password, tenantSlug })
          const data = response.data.data

          if (data.mfaRequired) {
            set({ isLoading: false })
            return { mfaRequired: true, tempToken: data.tempToken }
          }

          setAccessToken(data.accessToken)
          set({
            token: data.accessToken,
            user: {
              id: data.user.id,
              email: data.user.email,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              avatarUrl: data.user.avatarUrl,
              roles: data.user.roles,
              tenantId: data.user.tenantId,
            },
            tenantSlug,
            isAuthenticated: true,
            isLoading: false,
          })

          return {}
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        clearAuth()
        set({ user: null, token: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
      setTenantSlug: (slug) => set({ tenantSlug: slug }),
    }),
    {
      name: 'reno-auth',
      partialize: (state) => ({
        tenantSlug: state.tenantSlug,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
