/**
 * API Configuration
 * Centralized configuration for Lavalust backend connection
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Baco360',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
} as const

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  GOOGLE_SIGN_IN: '/auth/google',
  LOGOUT: '/auth/logout',
  VERIFY_2FA: '/auth/verify-2fa',
  REFRESH_TOKEN: '/auth/refresh',
  
  // User
  ME: '/user/me',
  LOGIN_HISTORY: '/user/login-history',
  ACTIVE_SESSIONS: '/user/sessions',
  REVOKE_SESSION: (sessionId: string) => `/user/sessions/${encodeURIComponent(sessionId)}`,
  UPDATE_PROFILE: '/user/profile',
  REQUEST_CONTACT_CHANGE: '/user/profile/contact-change',
  VERIFY_CONTACT_CHANGE: '/user/profile/contact-change/verify',
  CHANGE_PASSWORD: '/user/password',
  DELETE_ACCOUNT: '/user/account',
  DEACTIVATE_ACCOUNT: '/user/account/deactivate',
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
  COMMUNITY_REPORT_POST: (id: number) => `/community/reports/${id}/view`,
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
  EMERGENCY_CONTACTS: '/emergency-contacts',
  ADMIN_EMERGENCY_CONTACTS: '/admin/emergency-contacts',
  ADMIN_EMERGENCY_CONTACT: (id: number) => `/admin/emergency-contacts/${id}`,
  COMMUNITY_EVENTS: '/community-events',
  COMMUNITY_EVENT_BY_ID: (id: number) => `/community-events/${id}`,
  NOTIFICATIONS: '/notifications',
  DELETE_ALL_NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (id: number) => `/notifications/${id}/read`,
  DELETE_NOTIFICATION: (id: number) => `/notifications/${id}`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
} as const
