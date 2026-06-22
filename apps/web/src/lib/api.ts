import axios from 'axios'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const tenantId = getTenantId()
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }
  return config
})

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const response = await axios.post(`${API_URL}/v1/auth/refresh`, {}, { withCredentials: true })
        const { accessToken } = response.data.data
        setAccessToken(accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        clearAuth()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

// Token storage helpers (memory-first, localStorage fallback)
let memoryToken: string | null = null

export function setAccessToken(token: string) {
  memoryToken = token
  // Also store tenant from token
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    if (payload.tid) localStorage.setItem('reno_tenant_id', payload.tid)
  } catch {}
}

export function getAccessToken(): string | null {
  return memoryToken
}

export function getTenantId(): string | null {
  return localStorage.getItem('reno_tenant_id')
}

export function clearAuth() {
  memoryToken = null
  localStorage.removeItem('reno_tenant_id')
}

export function setTenantSlug(slug: string) {
  localStorage.setItem('reno_tenant_slug', slug)
}

export function getTenantSlug(): string | null {
  return localStorage.getItem('reno_tenant_slug')
}
