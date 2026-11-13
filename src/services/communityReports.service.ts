import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'
import type { Attachment } from '../data/types'

export type CommunityAttachment = Pick<Attachment, 'id' | 'original_name' | 'mime_type' | 'file_size' | 'attachment_type'>

export interface CommunityReport {
  id: number
  reference_number: string
  category_id: number
  category_name: string
  title: string
  description: string
  status: 'resolved'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location_address: string
  submitted_at: string
  resolved_at: string | null
  resolution_description: string | null
  attachments: CommunityAttachment[]
  heart_count: number
  hearted_by_me: boolean
  comment_count: number
}

export interface CommunityComment {
  id: number
  author: string
  comment: string
  created_at: string
}

export interface CommunityPost extends Omit<CommunityReport, 'hearted_by_me'> {
  comments: CommunityComment[]
}

interface CommunityListResult {
  reports: CommunityReport[]
  pagination: { current_page: number; per_page: number; total: number; last_page: number }
}

interface CommunityCommentsResult {
  comments: CommunityComment[]
  pagination: { current_page: number; per_page: number; total: number; last_page: number }
}

export const communityReportsService = {
  viewPost(reportId: number): Promise<ApiResponse<CommunityPost>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.COMMUNITY_REPORT_POST(reportId),
    })
  },

  async list(page = 1, perPage = 12): Promise<ApiResponse<CommunityListResult>> {
    const response = await apiRequest<CommunityListResult>({
      method: 'GET',
      url: API_ENDPOINTS.COMMUNITY_REPORTS,
      params: { page, per_page: perPage },
    })
    if (response.success && response.data) {
      response.data.reports = response.data.reports.map((report) => ({
        ...report,
        id: Number(report.id),
        category_id: Number(report.category_id),
        heart_count: Number(report.heart_count),
        comment_count: Number(report.comment_count),
        hearted_by_me: Boolean(report.hearted_by_me),
        attachments: report.attachments.map((attachment) => ({
          ...attachment,
          id: Number(attachment.id),
          file_size: Number(attachment.file_size),
        })),
      }))
    }
    return response
  },

  getComments(reportId: number): Promise<ApiResponse<CommunityCommentsResult>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.COMMUNITY_REPORT_COMMENTS(reportId),
      params: { page: 1, per_page: 100 },
    })
  },

  addComment(reportId: number, comment: string): Promise<ApiResponse<CommunityComment>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.COMMUNITY_REPORT_COMMENTS(reportId),
      data: { comment },
    })
  },

  setHeart(reportId: number, hearted: boolean): Promise<ApiResponse<{ hearted: boolean; heart_count: number }>> {
    return apiRequest({
      method: 'PUT',
      url: API_ENDPOINTS.COMMUNITY_REPORT_HEART(reportId),
      data: { hearted },
    })
  },
}
