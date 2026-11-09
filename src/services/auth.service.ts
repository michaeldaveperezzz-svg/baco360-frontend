import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'
import type { User } from '../data/types'

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

/**
 * Registration data
 */
export interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  email_enabled?: boolean
  sms_enabled?: boolean
}

/**
 * Login response
 */
export interface LoginResponse {
  requires_2fa: boolean
  token?: string
  user?: User
}

export interface RegisterResponse {
  email: string
  verification_required: boolean
}

export interface EmailVerificationResponse {
  user: User
  tokens: {
    access_token: string
    refresh_token: string
  }
}

/**
 * 2FA verification data
 */
export interface Verify2FAData {
  code: string
  email: string
}

/**
 * Authentication service
 */
export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return apiRequest<LoginResponse>({
      method: 'POST',
      url: API_ENDPOINTS.LOGIN,
      data: credentials,
    })
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<ApiResponse<RegisterResponse>> {
    return apiRequest<RegisterResponse>({
      method: 'POST',
      url: API_ENDPOINTS.REGISTER,
      data,
    })
  },

  /**
   * Verify the email address used to register
   */
  async verifyEmail(email: string, code: string): Promise<ApiResponse<EmailVerificationResponse>> {
    return apiRequest<EmailVerificationResponse>({
      method: 'POST',
      url: API_ENDPOINTS.VERIFY_EMAIL,
      data: { email, code },
    })
  },

  /**
   * Resend a pending email verification code
   */
  async resendVerification(email: string): Promise<ApiResponse> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.RESEND_VERIFICATION,
      data: { email },
    })
  },

  /**
   * Verify 2FA code
   */
  async verify2FA(data: Verify2FAData): Promise<ApiResponse<{ token: string; user: User }>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.VERIFY_2FA,
      data,
    })
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.LOGOUT,
    })
  },

  /**
   * Get current user
   */
  async me(): Promise<ApiResponse<User>> {
    return apiRequest<User>({
      method: 'GET',
      url: API_ENDPOINTS.ME,
    })
  },

  /**
   * Refresh token
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.REFRESH_TOKEN,
    })
  },

  /**
   * Forgot password
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.FORGOT_PASSWORD,
      data: { email },
    })
  },

  /**
   * Reset password
   */
  async resetPassword(email: string, code: string, password: string, password_confirmation: string): Promise<ApiResponse> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.RESET_PASSWORD,
      data: { email, code, password, password_confirmation },
    })
  },
}
