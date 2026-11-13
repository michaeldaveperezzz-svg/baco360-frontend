export type UserRole = 'resident' | 'staff' | 'admin'
export type ReportStatus = 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'reopened'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface User {
  id: number
  name: string
  email: string
  phone: string
  role: UserRole
  is_active: boolean
  email_verified_at: string | null
  created_at: string
  has_password?: boolean
  profile_photo?: string | null
  profile_photo_url?: string | null
  notification_settings: { sms_enabled: boolean; email_enabled: boolean; report_updates_enabled: boolean; resolution_updates_enabled: boolean }
}

export type AddressVerificationStatus = 'Pending' | 'Verified' | 'Rejected'
export type PreferredContactMethod = 'Email' | 'SMS' | 'Both'

export interface ResidentProfile {
  id: number
  user_id: number
  name: string
  email: string
  phone: string | null
  birth_date: string | null
  gender: string | null
  street: string | null
  barangay: string | null
  municipality: string
  province: string
  postal_code: string | null
  landmark: string | null
  preferred_contact_method: PreferredContactMethod | null
  is_profile_complete: boolean
  completion_percentage: number
  address_verification_status: AddressVerificationStatus
  verified_by: number | null
  verified_at: string | null
  created_at: string
  updated_at: string
  profile_photo: string | null
  profile_photo_url: string | null
}

export interface Category {
  id: number
  name: string
  description: string
  is_active: boolean
}

export interface Attachment {
  id: number
  file_path: string
  original_name: string
  mime_type: string
  file_size: number
  attachment_type: 'report_photo' | 'report_video' | 'progress_photo' | 'resolution_evidence' | 'other'
}

export interface StatusHistory {
  id: number
  old_status: ReportStatus | null
  new_status: ReportStatus
  notes: string
  changed_at: string
  changed_by: string
}

export interface ReportComment {
  id: number
  user_name: string
  comment: string
  is_internal: boolean
  created_at: string
  attachments?: Attachment[]
}

export interface Report {
  id: number
  reference_number: string
  resident_id: number
  category_id: number
  title: string
  description: string
  status: ReportStatus
  priority: Priority
  latitude: number | null
  longitude: number | null
  location_address: string
  submitted_at: string
  rejection_reason: string | null
  resolution_description: string | null
  resolved_at: string | null
  attachments: Attachment[]
  assignments: { staff_id: number; staff_name: string; department: string; assigned_at: string; assignment_notes: string }[]
  status_history: StatusHistory[]
  comments: ReportComment[]
  assignment_history: {
    staff_id: number
    staff_name: string
    department: string
    assigned_at: string
    unassigned_at: string | null
    assignment_notes: string
  }[]
}

export interface Notification {
  id: number
  announcement_id?: number | null
  announcement_message?: string | null
  report_id: number | null
  actor_id: number | null
  event_type: 'concern_submitted' | 'concern_updated' | 'resident_message' | 'report_updated' | 'report_message' | 'report_assigned' | 'announcement' | 'address_verified' | 'address_rejected' | 'community_comment' | 'community_reaction'
  priority: Priority
  created_at: string
  read_at: string | null
  reference_number: string | null
  report_title: string | null
  actor_name: string
}

export interface Announcement {
  id: number
  created_by: number
  author_name: string
  title: string
  message: string
  published_at: string
  created_at: string
  read_at: string | null
  archived_at: string | null
}

export interface CommunityEvent {
  id: number
  created_by: number
  author_name: string
  title: string
  description: string
  location: string | null
  starts_at: string
  ends_at: string | null
  created_at: string
}

// Helper function to get status label
export const statusLabel: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  reopened: 'Reopened',
}

// Helper function to get category name by ID
export const categoryName = (id: number, categories: Category[] = []) => 
  categories.find((category) => category.id === id)?.name ?? 'Other'

export const attachmentTypeLabel = (type: Attachment['attachment_type']) => {
  switch (type) {
    case 'report_photo': return 'Report photo'
    case 'report_video': return 'Report video'
    case 'progress_photo': return 'Progress photo'
    case 'resolution_evidence': return 'Resolution evidence'
    default: return 'Other'
  }
}
