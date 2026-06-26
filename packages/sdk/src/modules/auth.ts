import type { RenoClient } from '../client.js'

export interface LoginRequest {
  email: string
  password: string
  tenantSlug: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    fullName: string
    role: string
  }
}

export interface RefreshResponse {
  accessToken: string
}

export class AuthModule {
  constructor(private client: RenoClient) {}

  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await this.client.post<LoginResponse>('/auth/login', data)
    this.client.setBearerToken(res.accessToken)
    return res
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const res = await this.client.post<RefreshResponse>('/auth/refresh', { refreshToken })
    this.client.setBearerToken(res.accessToken)
    return res
  }

  async me(): Promise<LoginResponse['user']> {
    return this.client.get('/auth/me')
  }
}
