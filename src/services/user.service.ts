import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'
import type { AddressVerificationStatus, ResidentProfile, User, UserRole } from '../data/types'

/**
 * Update profile data
 */
export interface UpdateProfileData {
  name?: string
  phone?: string
  email?: string
}

export interface ContactChangeRequest {
  email_verification_required: boolean
  phone_verification_required: boolean
}

export interface CreateUserData {
  name: string
  email: string
  phone?: string
  role: UserRole
  password: string
}

export interface UpdateUserData {
  name?: string
  email?: string
  phone?: string
  role?: UserRole
  is_active?: boolean
  password?: string
}

export interface ChangePasswordData {
  current_password: string
  password: string
  password_confirmation: string
}

export interface UpdateResidentProfileData {
  birth_date: string
  gender: string
  street: string
  barangay: string
  municipality: string
  province: string
  postal_code: string
  landmark: string
  preferred_contact_method: 'Email' | 'SMS' | 'Both' | null
}

export interface ResidentVerificationRecord {
  id: number
  user_id: number
  name: string
  email: string
  phone: string | null
  street: string | null
  barangay: string | null
  municipality: string
  province: string
  postal_code: string | null
  landmark: string | null
  address_verification_status: AddressVerificationStatus
  verified_by: number | null
  verified_by_name: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Users list response
 */
export interface UsersListResponse {
  users: User[]
  pagination?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

function normalizeUser(user: User): User {
  const settings = user.notification_settings
  return {
    ...user,
    id: Number(user.id),
    is_active: Boolean(Number(user.is_active)),
    notification_settings: {
      sms_enabled: Boolean(Number(settings?.sms_enabled)),
      email_enabled: Boolean(Number(settings?.email_enabled)),
      report_updates_enabled: Boolean(Number(settings?.report_updates_enabled)),
      resolution_updates_enabled: Boolean(Number(settings?.resolution_updates_enabled)),
    },
  }
}

/**
 * User service
 */
export const userService = {
  async createUser(data: CreateUserData): Promise<ApiResponse<User>> {
    const response = await apiRequest<User>({
      method: 'POST',
      url: API_ENDPOINTS.USERS,
      data,
    })
    if (response.success && response.data) response.data = normalizeUser(response.data)
    return response
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return apiRequest<User>({
      method: 'GET',
      url: API_ENDPOINTS.ME,
    })
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    return apiRequest<User>({
      method: 'PUT',
      url: API_ENDPOINTS.UPDATE_PROFILE,
      data,
    })
  },

  async requestContactChange(data: { email: string; phone: string }): Promise<ApiResponse<ContactChangeRequest>> {
    return apiRequest<ContactChangeRequest>({
      method: 'POST',
      url: API_ENDPOINTS.REQUEST_CONTACT_CHANGE,
      data,
    })
  },

  async verifyContactChange(data: { account_code?: string; email_code?: string }): Promise<ApiResponse<User>> {
    return apiRequest<User>({
      method: 'POST',
      url: API_ENDPOINTS.VERIFY_CONTACT_CHANGE,
      data,
    })
  },

  async getResidentProfile() {
    return apiRequest<ResidentProfile>({
      method: 'GET',
      url: API_ENDPOINTS.RESIDENT_PROFILE,
    })
  },

  async updateResidentProfile(data: UpdateResidentProfileData) {
    return apiRequest<ResidentProfile>({
      method: 'PUT',
      url: API_ENDPOINTS.RESIDENT_PROFILE,
      data,
    })
  },

  async getResidentProfilesForReview(status?: AddressVerificationStatus) {
    return apiRequest<{ profiles: ResidentVerificationRecord[] }>({
      method: 'GET',
      url: API_ENDPOINTS.RESIDENT_PROFILES_FOR_REVIEW,
      params: status ? { status } : undefined,
    })
  },

  async updateAddressVerification(id: number, status: 'Verified' | 'Rejected') {
    return apiRequest<ResidentVerificationRecord>({
      method: 'PATCH',
      url: API_ENDPOINTS.RESIDENT_PROFILE_VERIFICATION(id),
      data: { status },
    })
  },

  async uploadProfilePhoto(file: File): Promise<ApiResponse<User>> {
    const formData = new FormData()
    formData.append('photo', file)
    const response = await apiRequest<User>({
      method: 'POST',
      url: API_ENDPOINTS.UPLOAD_PROFILE_PHOTO,
      data: formData,
    })
    if (response.success && response.data) response.data = normalizeUser(response.data)
    return response
  },

  async removeProfilePhoto(): Promise<ApiResponse<User>> {
    const response = await apiRequest<User>({
      method: 'DELETE',
      url: API_ENDPOINTS.REMOVE_PROFILE_PHOTO,
    })
    if (response.success && response.data) response.data = normalizeUser(response.data)
    return response
  },

  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    return apiRequest({
      method: 'PUT',
      url: API_ENDPOINTS.CHANGE_PASSWORD,
      data,
    })
  },

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(params?: {
    role?: UserRole
    is_active?: boolean
    page?: number
    per_page?: number
  }): Promise<ApiResponse<UsersListResponse>> {
    const response = await apiRequest<UsersListResponse>({
      method: 'GET',
      url: API_ENDPOINTS.USERS,
      params,
    })
    if (response.success && response.data?.users) {
      response.data.users = response.data.users.map(normalizeUser)
    }
    return response
  },

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(id: number): Promise<ApiResponse<User>> {
    const response = await apiRequest<User>({
      method: 'GET',
      url: API_ENDPOINTS.USER_BY_ID(id),
    })
    if (response.success && response.data) response.data = normalizeUser(response.data)
    return response
  },

  async updateUser(id: number, data: UpdateUserData): Promise<ApiResponse<User>> {
    const response = await apiRequest<User>({
      method: 'PUT',
      url: API_ENDPOINTS.USER_BY_ID(id),
      data,
    })
    if (response.success && response.data) response.data = normalizeUser(response.data)
    return response
  },

  async deleteUser(id: number): Promise<ApiResponse<null>> {
    return apiRequest<null>({
      method: 'DELETE',
      url: API_ENDPOINTS.DELETE_USER(id),
    })
  },

  /**
   * Toggle user active status (Admin only)
   */
  async toggleUserStatus(id: number, is_active: boolean): Promise<ApiResponse<User>> {
    return this.updateUser(id, { is_active })
  },

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(id: number, role: UserRole): Promise<ApiResponse<User>> {
    return this.updateUser(id, { role })
  },
}
