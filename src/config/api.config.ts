/**
 * API Configuration
 * Centralized configuration for Lavalust backend connection
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api',
  TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Baco360',
} as const

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  VERIFY_2FA: '/auth/verify-2fa',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFICATION: '/auth/resend-verification',
  REFRESH_TOKEN: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  
  // User
  ME: '/user/me',
  UPDATE_PROFILE: '/user/profile',
  REQUEST_CONTACT_CHANGE: '/user/profile/contact-change',
  VERIFY_CONTACT_CHANGE: '/user/profile/contact-change/verify',
  CHANGE_PASSWORD: '/user/password',
  UPDATE_NOTIFICATION_SETTINGS: '/user/notification-settings',
  RESIDENT_PROFILE: '/user/resident-profile',
  RESIDENT_PROFILES_FOR_REVIEW: '/admin/resident-profiles',
  RESIDENT_PROFILE_VERIFICATION: (id: number) => `/admin/resident-profiles/${id}/verification`,
  PROFILE_PHOTO: (id: number) => `/user/profile-photo/${id}`,
  UPLOAD_PROFILE_PHOTO: '/user/profile-photo',
  REMOVE_PROFILE_PHOTO: '/user/profile-photo',
  
  // Reports
  REPORTS: '/reports',
  REPORT_BY_ID: (id: number) => `/reports/${id}`,
  SUBMIT_REPORT: '/reports',
  UPDATE_REPORT: (id: number) => `/reports/${id}`,
  REPORT_COMMENTS: (id: number) => `/reports/${id}/comments`,
  REPORT_ASSIGN: (id: number) => `/reports/${id}/assign`,
  REPORT_ATTACHMENTS: (id: number) => `/reports/${id}/attachments`,
  REPORT_ATTACHMENT: (reportId: number, attachmentId: number) => `/reports/${reportId}/attachments/${attachmentId}`,

  // Resident community reports
  COMMUNITY_REPORTS: '/community/reports',
  COMMUNITY_REPORT_COMMENTS: (id: number) => `/community/reports/${id}/comments`,
  COMMUNITY_REPORT_HEART: (id: number) => `/community/reports/${id}/heart`,
  
  // Categories
  CATEGORIES: '/categories',
  CATEGORY_BY_ID: (id: number) => `/categories/${id}`,
  TOGGLE_CATEGORY: (id: number) => `/categories/${id}/toggle`,
  
  // Users (Admin)
  USERS: '/admin/users',
  USER_BY_ID: (id: number) => `/admin/users/${id}`,
  DELETE_USER: (id: number) => `/admin/users/${id}`,
  TOGGLE_USER: (id: number) => `/admin/users/${id}/toggle`,
  UPDATE_USER_ROLE: (id: number) => `/admin/users/${id}/role`,
  
  // Audit Logs
  AUDIT_LOGS: '/admin/audit-logs',
  EMAIL_DELIVERIES: '/admin/email-deliveries',
  
  // Stats
  DASHBOARD_STATS: '/dashboard/stats',

  // Website content
  WEBSITE_CONTENT: '/website-content',
  ADMIN_WEBSITE_CONTENT: '/admin/website-content',
  UPDATE_WEBSITE_CONTENT_SETTINGS: '/admin/website-content/settings',
  UPLOAD_WEBSITE_CONTENT_IMAGE: '/admin/website-content/images',
  CREATE_WEBSITE_CONTENT_ITEM: (collection: string) => `/admin/website-content/${collection}`,
  UPDATE_WEBSITE_CONTENT_ITEM: (collection: string, id: number) => `/admin/website-content/${collection}/${id}`,
  DELETE_WEBSITE_CONTENT_ITEM: (collection: string, id: number) => `/admin/website-content/${collection}/${id}`,

  // Notifications
  ANNOUNCEMENTS: '/announcements',
  ANNOUNCEMENT_RECIPIENTS: '/announcements/recipients',
  PUBLISH_ANNOUNCEMENT: '/announcements',
  UPDATE_ANNOUNCEMENT: (id: number) => `/announcements/${id}`,
  DELETE_ANNOUNCEMENT: (id: number) => `/announcements/${id}`,
  ARCHIVE_ANNOUNCEMENT: (id: number) => `/announcements/${id}/archive`,
  RESTORE_ANNOUNCEMENT: (id: number) => `/announcements/${id}/restore`,
  ANNOUNCEMENT_READ: (id: number) => `/announcements/${id}/read`,
  COMMUNITY_EVENTS: '/community-events',
  COMMUNITY_EVENT_BY_ID: (id: number) => `/community-events/${id}`,
  NOTIFICATIONS: '/notifications',
  DELETE_ALL_NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (id: number) => `/notifications/${id}/read`,
  DELETE_NOTIFICATION: (id: number) => `/notifications/${id}`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
} as const
