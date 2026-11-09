import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'

/**
 * Audit log entry
 */
export interface AuditLog {
  id: number
  user_id: number
  user_name: string
  action: string
  table_name: string
  record_id: number | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string
  user_agent: string
  created_at: string
}

/**
 * Audit logs list response
 */
export interface AuditLogsListResponse {
  logs: AuditLog[]
  pagination?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  total_reports: number
  pending_reports: number
  in_progress_reports: number
  resolved_reports: number
  total_users: number
  active_users: number
  total_categories: number
  reports_by_status: Record<string, number>
  reports_by_category: Record<string, number>
  recent_activity: Array<{
    id: number
    type: string
    description: string
    created_at: string
  }>
}

/**
 * Admin service
 */
export const adminService = {
  /**
   * Get audit logs (Admin only)
   */
  async getAuditLogs(params?: {
    user_id?: number
    action?: string
    table_name?: string
    date_from?: string
    date_to?: string
    page?: number
    per_page?: number
  }): Promise<ApiResponse<AuditLogsListResponse>> {
    return apiRequest<AuditLogsListResponse>({
      method: 'GET',
      url: API_ENDPOINTS.AUDIT_LOGS,
      params,
    })
  },

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return apiRequest<DashboardStats>({
      method: 'GET',
      url: API_ENDPOINTS.DASHBOARD_STATS,
    })
  },
}

