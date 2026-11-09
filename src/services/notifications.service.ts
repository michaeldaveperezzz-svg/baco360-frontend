import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'
import type { Notification } from '../data/types'

export const notificationsService = {
  async getNotifications(): Promise<ApiResponse<{ notifications: Notification[] }>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.NOTIFICATIONS,
    })
  },

  async markRead(id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'PATCH',
      url: API_ENDPOINTS.NOTIFICATION_READ(id),
    })
  },

  async deleteNotification(id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'DELETE',
      url: API_ENDPOINTS.DELETE_NOTIFICATION(id),
    })
  },

  async deleteAllNotifications(): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'DELETE',
      url: API_ENDPOINTS.DELETE_ALL_NOTIFICATIONS,
    })
  },

  async markAllRead(): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'PATCH',
      url: API_ENDPOINTS.NOTIFICATIONS_READ_ALL,
    })
  },
}
