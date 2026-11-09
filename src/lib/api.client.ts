import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config'

/**
 * API Response wrapper type
 */
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

/**
 * API Error type
 */
export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
}

function normalizeApiResponse<T>(payload: any): ApiResponse<T> {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return {
      success: Boolean(payload.success),
      data: (payload.data ?? null) as T,
      message: payload.message,
      errors: payload.errors,
    }
  }

  if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
    return {
      success: false,
      data: null as T,
      message: payload.message,
      errors: payload.errors,
    }
  }

  if (payload && typeof payload === 'object' && 'error' in payload) {
    return {
      success: false,
      data: null as T,
      message: payload.error,
      errors: payload.errors,
    }
  }

  return {
    success: false,
    data: payload ?? null,
    message: 'Unexpected API response from server.',
  }
}

type RetriableRequestConfig = InternalAxiosRequestConfig & { _authRetry?: boolean }

function serializeFormData(data: Record<string, unknown>): string {
  const form = new URLSearchParams()

  const appendValue = (name: string, value: unknown) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach((item, index) => appendValue(`${name}[${index}]`, item))
      return
    }

    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
        appendValue(`${name}[${nestedKey}]`, nestedValue)
      })
      return
    }

    form.append(name, String(value))
  }

  Object.entries(data).forEach(([key, value]) => appendValue(key, value))
  return form.toString()
}

let refreshRequest: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
    refresh_token: refreshToken,
  }, {
    timeout: API_CONFIG.TIMEOUT,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    withCredentials: true,
  })
  const tokens = response.data?.tokens ?? response.data?.data?.tokens
  if (!tokens?.access_token || !tokens?.refresh_token) return null

  localStorage.setItem('auth_token', tokens.access_token)
  localStorage.setItem('refresh_token', tokens.refresh_token)
  return tokens.access_token as string
}

async function getAccessTokenAfterUnauthorized(failedAccessToken: string | null): Promise<string | null> {
  const refreshWithLock = async () => {
    const currentAccessToken = localStorage.getItem('auth_token')
    if (currentAccessToken && failedAccessToken && currentAccessToken !== failedAccessToken) {
      return currentAccessToken
    }

    refreshRequest ??= refreshAccessToken().finally(() => { refreshRequest = null })
    return refreshRequest
  }

  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('civiconnect-auth-refresh', { mode: 'exclusive' }, refreshWithLock)
  }

  return refreshWithLock()
}

function clearAuthSession() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  localStorage.removeItem('refresh_token')
  window.dispatchEvent(new CustomEvent('auth:logout'))
}

/**
 * Create axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    withCredentials: true,
  })

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const method = (config.method ?? 'GET').toUpperCase()
      const hasRequestBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        config.headers.delete('Content-Type')
      } else if (hasRequestBody && config.data && typeof config.data === 'object' && !(config.data instanceof URLSearchParams)) {
        config.data = serializeFormData(config.data as Record<string, unknown>)
        config.headers.set?.('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
      }

      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<any>) => {
      if (error.response) {
        if (error.response.status === 401) {
          const originalRequest = error.config as RetriableRequestConfig | undefined
          const isAuthEndpoint = originalRequest?.url?.includes('/auth/') ?? false

          if (originalRequest && !originalRequest._authRetry && !isAuthEndpoint) {
            originalRequest._authRetry = true
            try {
              const authorization = originalRequest.headers.get('Authorization')
              const failedAccessToken = typeof authorization === 'string'
                ? authorization.replace(/^Bearer\s+/i, '')
                : null
              const accessToken = await getAccessTokenAfterUnauthorized(failedAccessToken)
              if (accessToken) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return instance.request(originalRequest)
              }
            } catch {
              clearAuthSession()
              return Promise.reject(error)
            }
          }

          if (!isAuthEndpoint) clearAuthSession()
        }

        if (error.response.status === 403) {
          console.error('Access forbidden:', error.response.data?.message ?? error.response.data?.error ?? 'Forbidden')
        }

        if (error.response.status >= 500) {
          console.error('Server error:', error.response.data?.message ?? error.response.data?.error ?? 'Server error')
        }
      }

      return Promise.reject(error)
    },
  )

  return instance
}

/**
 * Main API client instance
 */
export const apiClient = createApiClient()

/**
 * Helper function to handle API requests
 */
export async function apiRequest<T = any>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.request<any>(config)
    return normalizeApiResponse<T>(response.data)
  } catch (error) {
    throw handleApiError(error)
  }
}

/**
 * Handle API errors and convert to ApiError type
 */
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>

    if (axiosError.response) {
      const payload = axiosError.response.data ?? {}
      const normalized = normalizeApiResponse(payload)
      const responseMessage = normalized.message === 'Unexpected API response from server.'
        ? getUnexpectedResponseMessage(payload, axiosError.response.status)
        : normalized.message

      if ([502, 503, 504].includes(axiosError.response.status)) {
        return {
          message: payload?.error ?? payload?.message ?? responseMessage,
          status: axiosError.response.status,
        }
      }

      return {
        message: responseMessage || 'An error occurred',
        errors: normalized.errors,
        status: axiosError.response.status,
      }
    }

    if (axiosError.request) {
      return {
        message: 'No response from server. Please check your connection.',
        status: 0,
      }
    }

    function getUnexpectedResponseMessage(payload: unknown, status: number) {
      if (typeof payload === 'string' && typeof DOMParser !== 'undefined') {
        const document = new DOMParser().parseFromString(payload, 'text/html')
        const databaseError = document.querySelector('.exc-msg')?.textContent?.trim()
        if (databaseError) return databaseError
      }
      return `The server returned an unexpected response (HTTP ${status}). Please try again.`
    }
  }

  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  }
}

/**
 * Utility to set auth token
 */
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

/**
 * Utility to get auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}
