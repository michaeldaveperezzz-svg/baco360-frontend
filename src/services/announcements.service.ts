import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'
import type { Announcement, CommunityEvent } from '../data/types'

export interface AnnouncementRecipient {
  id: number
  name: string
  role: 'resident' | 'staff'
}

export type AnnouncementAudience = 'all_staff' | 'all_residents' | 'specific_users'

function eventDateTime(value: string) {
  return value.length === 16 ? `${value.replace('T', ' ')}:00` : value
}

export const communityEventsService = {
  async getEvents(): Promise<ApiResponse<{ events: CommunityEvent[] }>> {
    return apiRequest({ method: 'GET', url: API_ENDPOINTS.COMMUNITY_EVENTS })
  },

  async create(title: string, description: string, location: string, startsAt: string, endsAt: string): Promise<ApiResponse<{ event: CommunityEvent; audit_warning: boolean }>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.COMMUNITY_EVENTS,
      data: { title, description, location, starts_at: eventDateTime(startsAt), ends_at: endsAt ? eventDateTime(endsAt) : null },
    })
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    return apiRequest({ method: 'DELETE', url: API_ENDPOINTS.COMMUNITY_EVENT_BY_ID(id) })
  },
}

export const announcementsService = {
  async getAnnouncements(): Promise<ApiResponse<{ announcements: Announcement[] }>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.ANNOUNCEMENTS,
    })
  },

  async getRecipients(): Promise<ApiResponse<{ recipients: AnnouncementRecipient[] }>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.ANNOUNCEMENT_RECIPIENTS,
    })
  },

  async publish(title: string, message: string, audience: AnnouncementAudience, recipientIds: number[] = []): Promise<ApiResponse<{ announcement: Announcement; recipient_count: number; audit_warning: boolean }>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.PUBLISH_ANNOUNCEMENT,
      data: { title, message, audience, recipient_ids: recipientIds },
    })
  },

  async update(id: number, title: string, message: string): Promise<ApiResponse<{ announcement: Announcement }>> {
    return apiRequest({
      method: 'PUT',
      url: API_ENDPOINTS.UPDATE_ANNOUNCEMENT(id),
      data: { title, message },
    })
  },

  async delete(id: number): Promise<ApiResponse<{ audit_warning: boolean }>> {
    return apiRequest({
      method: 'DELETE',
      url: API_ENDPOINTS.DELETE_ANNOUNCEMENT(id),
    })
  },

  async archive(id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'PATCH',
      url: API_ENDPOINTS.ARCHIVE_ANNOUNCEMENT(id),
    })
  },

  async restore(id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'PATCH',
      url: API_ENDPOINTS.RESTORE_ANNOUNCEMENT(id),
    })
  },

  async markRead(id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'PATCH',
      url: API_ENDPOINTS.ANNOUNCEMENT_READ(id),
    })
  },
}
