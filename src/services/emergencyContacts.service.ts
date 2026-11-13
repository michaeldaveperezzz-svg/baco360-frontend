import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest, type ApiResponse } from '../lib/api.client'

export interface EmergencyContact {
  id: number
  name: string
  description: string | null
  phone_number: string
  sort_order: number
}

export type EmergencyContactInput = Pick<EmergencyContact, 'name' | 'description' | 'phone_number'>

interface EmergencyContactsResult {
  contacts: EmergencyContact[]
}

export const emergencyContactsService = {
  async getContacts(): Promise<ApiResponse<EmergencyContactsResult>> {
    const response = await apiRequest<EmergencyContactsResult>({
      method: 'GET',
      url: API_ENDPOINTS.EMERGENCY_CONTACTS,
    })
    if (response.success && response.data) {
      response.data.contacts = response.data.contacts.map((contact) => ({
        ...contact,
        id: Number(contact.id),
        sort_order: Number(contact.sort_order),
      }))
    }
    return response
  },

  createContact(contact: EmergencyContactInput): Promise<ApiResponse<{ contact: EmergencyContact }>> {
    return apiRequest({
      method: 'POST',
      url: API_ENDPOINTS.ADMIN_EMERGENCY_CONTACTS,
      data: contact,
    })
  },

  updateContact(id: number, contact: EmergencyContactInput): Promise<ApiResponse<{ contact: EmergencyContact }>> {
    return apiRequest({
      method: 'PUT',
      url: API_ENDPOINTS.ADMIN_EMERGENCY_CONTACT(id),
      data: contact,
    })
  },

  deleteContact(id: number): Promise<ApiResponse<null>> {
    return apiRequest({
      method: 'DELETE',
      url: API_ENDPOINTS.ADMIN_EMERGENCY_CONTACT(id),
    })
  },
}
