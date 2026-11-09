import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'
import type { Category } from '../data/types'

/**
 * Add category data
 */
export interface AddCategoryData {
  name: string
  description: string
}

/**
 * Update category data
 */
export interface UpdateCategoryData {
  name?: string
  description?: string
  is_active?: boolean
}

function normalizeCategory(category: Category): Category {
  return { ...category, id: Number(category.id), is_active: Boolean(Number(category.is_active)) }
}

/**
 * Categories service
 */
export const categoriesService = {
  /**
   * Get all categories
   */
  async getCategories(includeInactive = false): Promise<ApiResponse<Category[]>> {
    const response = await apiRequest<Category[]>({
      method: 'GET',
      url: API_ENDPOINTS.CATEGORIES,
      params: { include_inactive: includeInactive },
    })
    if (response.success && Array.isArray(response.data)) response.data = response.data.map(normalizeCategory)
    return response
  },

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<ApiResponse<Category>> {
    const response = await apiRequest<Category>({
      method: 'GET',
      url: API_ENDPOINTS.CATEGORY_BY_ID(id),
    })
    if (response.success && response.data) response.data = normalizeCategory(response.data)
    return response
  },

  /**
   * Add new category (Admin only)
   */
  async addCategory(data: AddCategoryData): Promise<ApiResponse<Category>> {
    const response = await apiRequest<Category>({
      method: 'POST',
      url: API_ENDPOINTS.CATEGORIES,
      data,
    })
    if (response.success && response.data) response.data = normalizeCategory(response.data)
    return response
  },

  /**
   * Update category (Admin only)
   */
  async updateCategory(id: number, data: UpdateCategoryData): Promise<ApiResponse<Category>> {
    const response = await apiRequest<Category>({
      method: 'PUT',
      url: API_ENDPOINTS.CATEGORY_BY_ID(id),
      data,
    })
    if (response.success && response.data) response.data = normalizeCategory(response.data)
    return response
  },

  /**
   * Toggle category active status (Admin only)
   */
  async toggleCategory(id: number): Promise<ApiResponse<Category>> {
    const response = await apiRequest<Category>({
      method: 'PUT',
      url: API_ENDPOINTS.TOGGLE_CATEGORY(id),
    })
    if (response.success && response.data) response.data = normalizeCategory(response.data)
    return response
  },

  async deleteCategory(id: number): Promise<ApiResponse<null>> {
    return apiRequest<null>({
      method: 'DELETE',
      url: API_ENDPOINTS.CATEGORY_BY_ID(id),
    })
  },
}
