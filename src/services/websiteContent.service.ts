import { API_CONFIG, API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'

export type WebsiteContentCollection = 'competencies' | 'announcements' | 'gallery' | 'faqs'
export type WebsiteContentSection = 'hero' | 'competencies' | 'announcements' | 'maintenance' | 'gallery' | 'faqs' | 'branding' | 'about' | 'contact' | 'footer'

export interface WebsiteContentSettings {
  site_name: string
  logo_path: string | null
  primary_color: string | null
  hero_title: string | null
  hero_description: string | null
  hero_image_path: string | null
  maintenance_enabled: boolean
  maintenance_message: string | null
  maintenance_starts_at: string | null
  maintenance_ends_at: string | null
  about_title: string | null
  about_content: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  footer_text: string | null
  copyright_text: string | null
  updated_at: string | null
}

export interface WebsiteContentItem {
  id: number
  name?: string
  title?: string
  question?: string
  message?: string
  description?: string | null
  icon_name?: string | null
  image_path?: string | null
  alt_text?: string
  caption?: string | null
  answer?: string
  starts_at?: string | null
  ends_at?: string | null
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string | null
}

export interface WebsiteContentItemInput {
  name?: string
  title?: string
  question?: string
  message?: string
  description?: string | null
  icon_name?: string | null
  image_path?: string | null
  alt_text?: string
  caption?: string | null
  answer?: string
  starts_at?: string | null
  ends_at?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface WebsiteContentData {
  settings: WebsiteContentSettings
  competencies: WebsiteContentItem[]
  announcements: WebsiteContentItem[]
  gallery: WebsiteContentItem[]
  faqs: WebsiteContentItem[]
}

export function websiteContentImageUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/website-content/media/')) {
    return `${API_CONFIG.BASE_URL.replace(/\/+$/, '')}${path}`
  }
  return path
}

export const websiteContentService = {
  async getPublicContent(): Promise<ApiResponse<WebsiteContentData>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.WEBSITE_CONTENT,
    })
  },

  async getAdminContent(): Promise<ApiResponse<WebsiteContentData>> {
    return apiRequest({
      method: 'GET',
      url: API_ENDPOINTS.ADMIN_WEBSITE_CONTENT,
    })
  },

  async updateSettings(settings: Partial<WebsiteContentSettings>): Promise<ApiResponse<{ settings: WebsiteContentSettings }>> {
    return apiRequest({
      method: 'PUT',
      url: API_ENDPOINTS.UPDATE_WEBSITE_CONTENT_SETTINGS,
      data: settings,
    })
  },

  async uploadImage(file: File): Promise<ApiResponse<{ path: string; mime_type: string; file_size: number }>> {
    const formData = new FormData()
    formData.append('image', file)
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.UPLOAD_WEBSITE_CONTENT_IMAGE,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  async createItem(collection: WebsiteContentCollection, item: WebsiteContentItemInput): Promise<ApiResponse<{ item: WebsiteContentItem }>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.CREATE_WEBSITE_CONTENT_ITEM(collection),
      data: item,
    })
  },

  async updateItem(collection: WebsiteContentCollection, id: number, item: WebsiteContentItemInput): Promise<ApiResponse<{ item: WebsiteContentItem }>> {
    return apiRequest({
      method: 'PUT',
      url: API_ENDPOINTS.UPDATE_WEBSITE_CONTENT_ITEM(collection, id),
      data: item,
    })
  },

  async deleteItem(collection: WebsiteContentCollection, id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'DELETE',
      url: API_ENDPOINTS.DELETE_WEBSITE_CONTENT_ITEM(collection, id),
    })
  },
}
