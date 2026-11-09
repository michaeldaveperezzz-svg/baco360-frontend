import { API_ENDPOINTS } from '../config/api.config'
import { apiClient, apiRequest, type ApiResponse } from '../lib/api.client'
import type { Report, Priority, ReportStatus } from '../data/types'

/**
 * Submit report data
 */
export interface SubmitReportData {
  category_id: number
  title: string
  description: string
  location_address: string
  latitude?: number | null
  longitude?: number | null
  priority?: Priority
  attachments?: File[]
}

export interface SubmitReportResult {
  message: string
  reference_number: string
  report: Report
  attachment_upload_warning?: string
}

/**
 * Update report data
 */
export interface UpdateReportData {
  category_id?: number
  title?: string
  description?: string
  location_address?: string
  latitude?: number | null
  longitude?: number | null
  status?: ReportStatus
  priority?: Priority
  rejection_reason?: string
  resolution_description?: string
  notes?: string
}

/**
 * Add comment data
 */
export interface AddCommentData {
  comment: string
  is_internal?: boolean
}

/**
 * Assign report data
 */
export interface AssignReportData {
  staff_id: number
  department: string
  assignment_notes: string
}

/**
 * Reports list response
 */
export interface ReportsListResponse {
  reports: Report[]
  pagination?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

function normalizeReport(report: Report): Report {
  return {
    ...report,
    id: Number(report.id),
    resident_id: Number(report.resident_id),
    category_id: Number(report.category_id),
    latitude: report.latitude === null || report.latitude === undefined ? null : Number(report.latitude),
    longitude: report.longitude === null || report.longitude === undefined ? null : Number(report.longitude),
    attachments: (report.attachments ?? []).map((attachment) => ({ ...attachment, id: Number(attachment.id) })),
    assignments: (report.assignments ?? []).map((assignment) => ({ ...assignment, staff_id: Number(assignment.staff_id) })),
    assignment_history: (report.assignment_history ?? []).map((assignment) => ({
      ...assignment,
      staff_id: Number(assignment.staff_id),
      unassigned_at: assignment.unassigned_at ?? null,
    })),
    status_history: (report.status_history ?? []).map((entry) => ({
      ...entry,
      id: Number(entry.id),
      changed_by: String(entry.changed_by),
    })),
    comments: (report.comments ?? []).map((comment) => ({
      ...comment,
      id: Number(comment.id),
      is_internal: Boolean(Number(comment.is_internal)),
      attachments: (comment.attachments ?? []).map((attachment) => ({ ...attachment, id: Number(attachment.id) })),
    })),
  }
}

/**
 * Reports service
 */
export const reportsService = {
  /**
   * Get all reports (with optional filters)
   */
  async getReports(params?: {
    status?: ReportStatus
    category_id?: number
    resident_id?: number
    page?: number
    per_page?: number
  }): Promise<ApiResponse<ReportsListResponse>> {
    const response = await apiRequest<ReportsListResponse>({
      method: 'GET',
      url: API_ENDPOINTS.REPORTS,
      params,
    })
    if (response.success && response.data?.reports) {
      response.data.reports = response.data.reports.map(normalizeReport)
    }
    return response
  },

  /**
   * Get single report by ID
   */
  async getReportById(id: number): Promise<ApiResponse<Report>> {
    const response = await apiRequest<Report>({
      method: 'GET',
      url: API_ENDPOINTS.REPORT_BY_ID(id),
    })
    if (response.success && response.data) response.data = normalizeReport(response.data)
    return response
  },

  /**
   * Submit new report
   */
  async submitReport(data: SubmitReportData): Promise<ApiResponse<SubmitReportResult>> {
    const { attachments = [], ...reportData } = data
    const response = await apiRequest<Omit<SubmitReportResult, 'attachment_upload_warning'>>({
      method: 'POST',
      url: API_ENDPOINTS.SUBMIT_REPORT,
      data: reportData,
    })

    if (!response.success || attachments.length === 0) return response
    response.data.report = normalizeReport(response.data.report)

    try {
      const uploadResponse = await this.uploadAttachments(response.data.report.id, attachments)
      if (uploadResponse.success && uploadResponse.data.count === attachments.length) return response
    } catch (error) {
      console.error('Report was created, but attachment upload failed:', error)
    }

    return {
      ...response,
      data: {
        ...response.data,
        attachment_upload_warning: 'Your report was submitted, but one or more attachments could not be uploaded. Contact the municipal team with your reference number.',
      },
    }
  },

  async uploadAttachments(reportId: number, files: File[]): Promise<ApiResponse<{ attachments: Report['attachments']; count: number }>> {
    const formData = new FormData()
    files.forEach((file) => formData.append('attachments[]', file))

    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.REPORT_ATTACHMENTS(reportId),
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Update report
   */
  async updateReport(id: number, data: UpdateReportData): Promise<ApiResponse<Report>> {
    const response = await apiRequest<Report>({
      method: 'PATCH',
      url: API_ENDPOINTS.UPDATE_REPORT(id),
      data,
    })
    if (response.success && response.data) response.data = normalizeReport(response.data)
    return response
  },

  async deleteReport(id: number): Promise<ApiResponse<null>> {
    return apiRequest<null>({
      method: 'DELETE',
      url: API_ENDPOINTS.REPORT_BY_ID(id),
    })
  },

  /**
   * Add comment to report
   */
  async addComment(reportId: number, data: AddCommentData, photo?: File): Promise<ApiResponse<Report>> {
    let requestData: AddCommentData | FormData = data
    if (photo) {
      const formData = new FormData()
      formData.append('comment', data.comment)
      formData.append('is_internal', String(data.is_internal ?? false))
      formData.append('photo', photo)
      requestData = formData
    }
    const response = await apiRequest<Report>({
      method: 'POST',
      url: API_ENDPOINTS.REPORT_COMMENTS(reportId),
      data: requestData,
      ...(photo ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
    })
    if (response.success && response.data) response.data = normalizeReport(response.data)
    return response
  },

  /**
   * Assign report to staff
   */
  async assignReport(reportId: number, data: AssignReportData): Promise<ApiResponse<Report>> {
    const response = await apiRequest<Report>({
      method: 'POST',
      url: API_ENDPOINTS.REPORT_ASSIGN(reportId),
      data,
    })
    if (response.success && response.data) response.data = normalizeReport(response.data)
    return response
  },

/**
     * Update report status
     */
    async updateStatus(reportId: number, status: ReportStatus, notes?: string): Promise<ApiResponse<Report>> {
      const response = await apiRequest<Report>({
            method: 'PATCH',
            url: API_ENDPOINTS.UPDATE_REPORT(reportId),
            data: { status, notes },
        })
      if (response.success && response.data) response.data = normalizeReport(response.data)
      return response
    },

  /**
   * Upload attachment to report
   */
  async uploadAttachment(reportId: number, file: File, attachmentType: string): Promise<ApiResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('attachment_type', attachmentType)

    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.REPORT_ATTACHMENTS(reportId),
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  async downloadAttachment(reportId: number, attachmentId: number): Promise<Blob> {
    const response = await apiClient.get(API_ENDPOINTS.REPORT_ATTACHMENT(reportId, attachmentId), { responseType: 'blob' })
    return response.data as Blob
  },
}
