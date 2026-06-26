export interface RenoClientOptions {
  baseUrl: string
  apiKey?: string
  bearerToken?: string
  tenantId?: string
  timeout?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export class RenoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'RenoApiError'
  }
}

export class RenoClient {
  private baseUrl: string
  private headers: Record<string, string>
  private timeout: number

  constructor(options: RenoClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '') + '/v1'
    this.timeout = options.timeout ?? 30_000
    this.headers = { 'Content-Type': 'application/json' }

    if (options.apiKey) {
      this.headers['X-API-Key'] = options.apiKey
    } else if (options.bearerToken) {
      this.headers['Authorization'] = `Bearer ${options.bearerToken}`
    }
    if (options.tenantId) {
      this.headers['X-Tenant-ID'] = options.tenantId
    }
  }

  setTenantId(tenantId: string) {
    this.headers['X-Tenant-ID'] = tenantId
  }

  setBearerToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`
    delete this.headers['X-API-Key']
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`
    if (queryParams) {
      const params = new URLSearchParams(
        Object.entries(queryParams)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      )
      url += `?${params}`
    }

    const response = await fetch(url, {
      method,
      headers: this.headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      let message = `HTTP ${response.status}`
      let code = 'API_ERROR'
      try {
        const err = (await response.json()) as { error?: string; message?: string; code?: string }
        message = err.message ?? err.error ?? message
        code = err.code ?? code
      } catch {
        // ignore parse error
      }
      throw new RenoApiError(response.status, code, message)
    }

    return response.json() as Promise<T>
  }

  get<T = unknown>(path: string, query?: Record<string, string | number | boolean>) {
    return this.request<T>('GET', path, undefined, query)
  }
  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }
  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body)
  }
  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body)
  }
  delete<T = unknown>(path: string) {
    return this.request<T>('DELETE', path)
  }
}
