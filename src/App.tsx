import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ResidentBottomNav from './components/ResidentBottomNav'
import Footer from './components/Footer'
import LanguageSelect from './components/LanguageSelect'
import ResidentDashboard from './pages/ResidentDashboard'
import ResidentProfilePage from './pages/ResidentProfilePage'
import ResidentAddressReviewPage from './pages/ResidentAddressReviewPage'
import CommunityReportsPage from './pages/CommunityReportsPage'
import SubmitReportPage from './pages/SubmitReportPage'
import ReportDetailModal from './pages/ReportDetailModal'
import StaffDashboard from './pages/StaffDashboard'
import StaffReportWorkspace from './pages/StaffReportWorkspace'
const MapMonitoringPage = lazy(() => import('./pages/MapMonitoringPage'))
import AdminDashboard from './pages/AdminDashboard'
import UserManagementPage from './pages/UserManagementPage'
import CategoryManagementPage from './pages/CategoryManagementPage'
import ReportAttachmentsPage from './pages/ReportAttachmentsPage'
import AnalyticsReportsPage from './pages/AnalyticsReportsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ResidentEventsPage from './pages/ResidentEventsPage'
import WebsiteContentPage from './pages/WebsiteContentPage'
import TwoFactorAuthPage from './pages/TwoFactorAuthPage'
import LandingPage from './pages/LandingPage.tsx'
import SuccessModal from './components/SuccessModal'
import AnnouncementModal from './components/AnnouncementModal'
import EmergencyContactsModal from './components/EmergencyContactsModal'
import { type Category, type Notification, type Report, type User, type UserRole } from './data/types'
import type { ViewKey } from './types'
import { applyLanguage, type Language } from './i18n'
import { authService } from './services/auth.service'
import { reportsService, type SubmitReportData, type UpdateReportData } from './services/reports.service'
import { categoriesService } from './services/categories.service'
import { userService, type ChangePasswordData, type CreateUserData, type UpdateProfileData, type UpdateUserData } from './services/user.service'
import { notificationsService } from './services/notifications.service'
import { announcementsService } from './services/announcements.service'
import './App.css'

function AppContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading, login, verify2FA, authenticateWithTokens, logout, updateUser: setAuthenticatedUser } = useAuth()
  const [view, setView] = useState<ViewKey>(isAuthenticated ? 'resident-dashboard' : 'landing')
  const websiteSettingsReturnView = useRef<ViewKey>('admin-dashboard')
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('civiconnect-language') === 'tl' ? 'tl' : 'en')
  const [reports, setReports] = useState<Report[]>([])
  const [isReportsLoading, setIsReportsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Notification | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [isAdminAttachmentModalOpen, setIsAdminAttachmentModalOpen] = useState(false)
  const [isEmergencyContactsModalOpen, setIsEmergencyContactsModalOpen] = useState(false)
  const [deepLinkedReportId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get('report')
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    const reportId = Number(value)
    return Number.isSafeInteger(reportId) ? reportId : null
  })
  const [deepLinkedAnnouncementId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get('announcement')
    if (!value || !/^[1-9]\d*$/.test(value)) return null
    const announcementId = Number(value)
    return Number.isSafeInteger(announcementId) ? announcementId : null
  })
  const [hasAnnouncementDeepLink] = useState(() => new URLSearchParams(window.location.search).get('announcements') === '1')
  const [pendingAuthEmail, setPendingAuthEmail] = useState('')
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<{ id: number; message: string } | null>(null)
  const nextSuccessIdRef = useRef(0)
  const deepLinkHandledRef = useRef(false)
  const announcementDeepLinkHandledRef = useRef(false)
  const seenNotificationIdsRef = useRef<Set<number>>(new Set())
  const deletedNotificationIdsRef = useRef<Set<number>>(new Set())
  const notificationSnapshotReadyRef = useRef(false)
  const notificationAudioRef = useRef<AudioContext | null>(null)
  // const [isLoading, setIsLoading] = useState(false)
  
  const selectedReport = reports.find((report) => Number(report.id) === selectedReportId) ?? null
  const role = user?.role || 'resident'

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage)
    localStorage.setItem('civiconnect-language', nextLanguage)
  }

  function showSuccess(message: string) {
    nextSuccessIdRef.current += 1
    setSuccessNotice({ id: nextSuccessIdRef.current, message })
  }

  const dismissSuccess = useCallback(() => setSuccessNotice(null), [])

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    return applyLanguage(root, language)
  }, [language, view])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadInitialData()
      const dashboardView = user.role === 'staff' ? 'staff-dashboard' : user.role === 'admin' ? 'admin-dashboard' : 'resident-dashboard'
      setView(hasAnnouncementDeepLink && user.role !== 'resident' && deepLinkedAnnouncementId === null ? 'announcements' : dashboardView)
      if (hasAnnouncementDeepLink) {
        const url = new URL(window.location.href)
        url.searchParams.delete('announcements')
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      }
    } else if (!isAuthenticated) {
      setView('landing')
      setSelectedReportId(null)
      setReports([])
      setIsReportsLoading(false)
      setCategories([])
      setUsers([])
      setNotifications([])
      setSelectedAnnouncement(null)
      seenNotificationIdsRef.current = new Set()
      deletedNotificationIdsRef.current = new Set()
      notificationSnapshotReadyRef.current = false
    }
  }, [hasAnnouncementDeepLink, isAuthenticated, user?.id, user?.role])

  useEffect(() => {
    if (!isAuthenticated || deepLinkedReportId === null || deepLinkHandledRef.current) return
    deepLinkHandledRef.current = true

    void reportsService.getReportById(deepLinkedReportId).then((response) => {
      if (!response.success || !response.data) {
        throw new Error(response.message || 'The linked report could not be opened.')
      }
      setReports((current) => [...current.filter((report) => Number(report.id) !== deepLinkedReportId), response.data])
      setSelectedReportId(deepLinkedReportId)
      const url = new URL(window.location.href)
      url.searchParams.delete('report')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }).catch((error: unknown) => {
      console.error('Failed to open linked report:', error)
    })
  }, [deepLinkedReportId, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || deepLinkedAnnouncementId === null || announcementDeepLinkHandledRef.current) return
    announcementDeepLinkHandledRef.current = true
    let active = true

    void announcementsService.getAnnouncements().then(async (response) => {
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Could not load the linked announcement.')
      }
      const announcement = response.data.announcements.find((item) => item.id === deepLinkedAnnouncementId)
      if (!announcement) throw new Error('The linked announcement is not available to this account.')
      const readResponse = await announcementsService.markRead(announcement.id)
      if (!readResponse.success) throw new Error(readResponse.message || 'Could not mark the announcement as read.')
      if (!active) return

      setSelectedAnnouncement({
        id: -announcement.id,
        announcement_id: announcement.id,
        announcement_message: announcement.message,
        report_id: null,
        actor_id: announcement.created_by,
        event_type: 'announcement',
        priority: 'medium',
        created_at: announcement.published_at,
        read_at: announcement.read_at ?? new Date().toISOString(),
        reference_number: null,
        report_title: announcement.title,
        actor_name: announcement.author_name,
      })
      setNotifications((current) => current.map((item) =>
        item.announcement_id === announcement.id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
      ))
      const url = new URL(window.location.href)
      url.searchParams.delete('announcement')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }).catch((error: unknown) => {
      if (active) console.error('Failed to open linked announcement:', error)
    })

    return () => { active = false }
  }, [deepLinkedAnnouncementId, isAuthenticated])

  useEffect(() => {
    const unlockNotificationAudio = () => {
      if (!('AudioContext' in window)) return
      if (!notificationAudioRef.current) notificationAudioRef.current = new AudioContext()
      if (notificationAudioRef.current.state === 'suspended') {
        void notificationAudioRef.current.resume().catch((error: unknown) => {
          console.warn('Notification audio could not be enabled:', error)
        })
      }
    }
    document.addEventListener('pointerdown', unlockNotificationAudio, { once: true })
    return () => document.removeEventListener('pointerdown', unlockNotificationAudio)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    let active = true
    let isRefreshing = false
    deletedNotificationIdsRef.current = new Set()

    const playAlert = (isHighPriority: boolean) => {
      const audio = notificationAudioRef.current
      if (!audio || audio.state !== 'running') return
      const playBellPartial = (frequency: number, volume: number, startAt: number, duration: number) => {
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, startAt)
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012)
        gain.gain.exponentialRampToValueAtTime(volume * 0.12, startAt + 0.16)
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
        oscillator.connect(gain)
        gain.connect(audio.destination)
        oscillator.start(startAt)
        oscillator.stop(startAt + duration)
      }
      const now = audio.currentTime
      const loudness = isHighPriority ? 0.28 : 0.22
      playBellPartial(880, loudness, now, 0.62)
      playBellPartial(1320, loudness * 0.42, now, 0.48)
      playBellPartial(1760, loudness * 0.18, now, 0.36)
    }

    const refreshNotifications = async () => {
      if (isRefreshing) return
      isRefreshing = true
      try {
        const response = await notificationsService.getNotifications()
        if (!active) return
        if (!response.success || !response.data) {
          console.error('Failed to refresh notifications:', response.message || 'The server returned no notification data.')
          return
        }
        const latest = response.data.notifications.filter((notification) =>
          !deletedNotificationIdsRef.current.has(notification.id)
        )
        const newNotifications = notificationSnapshotReadyRef.current
          ? latest.filter((notification) => !seenNotificationIdsRef.current.has(notification.id))
          : []
        latest.forEach((notification) => seenNotificationIdsRef.current.add(notification.id))
        notificationSnapshotReadyRef.current = true
        setNotifications(latest)
        if (newNotifications.length > 0) {
          playAlert(newNotifications.some((notification) =>
            ['concern_submitted', 'concern_updated', 'resident_message'].includes(notification.event_type)
            && ['high', 'urgent'].includes(notification.priority)
          ))
        }
      } catch (error) {
        if (active) console.error('Failed to refresh notifications:', error)
      } finally {
        isRefreshing = false
      }
    }

    void refreshNotifications()
    const intervalId = window.setInterval(() => void refreshNotifications(), 15000)
    return () => {
      active = false
      window.clearInterval(intervalId)
      seenNotificationIdsRef.current = new Set()
      notificationSnapshotReadyRef.current = false
    }
  }, [isAuthenticated, user?.id])

  async function loadInitialData() {
    setIsReportsLoading(true)
    try {
      const categoriesResponse = await categoriesService.getCategories(user?.role === 'admin')
      if (categoriesResponse.success) { setCategories(categoriesResponse.data) }
      const reportsResponse = await reportsService.getReports()
      if (reportsResponse.success) { setReports(reportsResponse.data.reports || []) }
      if (user?.role === 'admin') {
        const usersResponse = await userService.getAllUsers()
        if (usersResponse.success) { setUsers(usersResponse.data.users || []) }
      }
    } catch (err) { console.error('Failed to load initial data:', err) }
    finally { setIsReportsLoading(false) }
  }

  function navigate(nextView: ViewKey) {
    setView(nextView === 'staff-workspace' ? 'reports' : nextView)
    setSelectedReportId(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function navigateToWebsiteContent() {
    websiteSettingsReturnView.current = view
    navigate('website-content')
  }
  
  async function submitReport(report: SubmitReportData) {
    try {
      const response = await reportsService.submitReport(report)
      if (response.success) {
        await loadInitialData()
        showSuccess('Report submitted successfully.')
        return { referenceNumber: response.data.reference_number, attachmentWarning: response.data.attachment_upload_warning }
      }
      throw new Error(response.message || 'Failed to submit report')
    } catch (err) { console.error('Failed to submit report:', err); throw err }
  }

  async function updateReport(reportId: number, updates: UpdateReportData) {
    const response = await reportsService.updateReport(reportId, updates)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to update report')
    setReports((current) => current.map((report) => Number(report.id) === Number(reportId) ? response.data : report))
    showSuccess('Report updated successfully.')
  }

  async function deleteReport(reportId: number) {
    const response = await reportsService.deleteReport(reportId)
    if (!response.success) throw new Error(response.message || 'Failed to delete report')
    setReports((current) => current.filter((report) => Number(report.id) !== Number(reportId)))
    setSelectedReportId(null)
    showSuccess('Report deleted successfully.')
  }

  async function selectReport(report: Report) {
    try {
      const response = await reportsService.getReportById(report.id)
      if (response.success) {
        setReports((current) => current.map((item) => Number(item.id) === Number(report.id) ? response.data : item))
        setSelectedReportId(report.id)
      }
    } catch (err) { console.error('Failed to load report details:', err) }
  }

  async function openReportFromAttachments(report: Report) {
    setView('reports')
    await selectReport(report)
  }

  async function openNotification(notification: Notification) {
    if (notification.event_type === 'announcement' && notification.announcement_id !== null && notification.announcement_id !== undefined) {
      const response = await notificationsService.markRead(notification.id)
      if (!response.success) throw new Error(response.message || 'Could not mark announcement as read.')
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
      ))
      setSelectedAnnouncement(notification)
      return
    }
    const response = await notificationsService.markRead(notification.id)
    if (!response.success) throw new Error(response.message || 'Could not mark notification as read.')
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item))
    if (notification.report_id === null) return
    const reportResponse = await reportsService.getReportById(notification.report_id)
    if (!reportResponse.success || !reportResponse.data) throw new Error(reportResponse.message || 'Could not open the report.')
    setReports((current) => [...current.filter((item) => Number(item.id) !== notification.report_id), reportResponse.data])
    setSelectedReportId(notification.report_id)
  }

  async function markAllNotificationsRead() {
    const response = await notificationsService.markAllRead()
    if (!response.success) throw new Error(response.message || 'Could not mark notifications as read.')
    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })))
    showSuccess('Notifications marked as read.')
  }

  async function deleteNotification(notificationId: number) {
    const response = await notificationsService.deleteNotification(notificationId)
    if (!response.success) throw new Error(response.message || 'Could not delete notification.')
    deletedNotificationIdsRef.current.add(notificationId)
    setNotifications((current) => current.filter((item) => item.id !== notificationId))
  }

  async function deleteAllNotifications() {
    const response = await notificationsService.deleteAllNotifications()
    if (!response.success) throw new Error(response.message || 'Could not delete notifications.')
    notifications.forEach((notification) => deletedNotificationIdsRef.current.add(notification.id))
    setNotifications([])
  }

  async function addComment(reportId: number, text: string, internal: boolean, photo?: File) {
    const response = await reportsService.addComment(reportId, { comment: text, is_internal: internal }, photo)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to post report update.')
    setReports((current) => current.map((report) => Number(report.id) === Number(reportId) ? response.data : report))
    showSuccess('Report update posted successfully.')
  }

  async function assignReport(reportId: number, staffId: number) {
    const staffUser = users.find((candidate) => Number(candidate.id) === Number(staffId))
    if (!staffUser) throw new Error('The selected staff member could not be found.')
    const response = await reportsService.assignReport(reportId, { staff_id: staffId, department: 'General', assignment_notes: 'Assigned via dashboard' })
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to assign report')
    setReports((current) => current.map((report) => Number(report.id) === Number(reportId) ? response.data : report))
    showSuccess('Report assignment updated successfully.')
  }

  async function handleLogin(email: string, password: string, remember: boolean, reactivate = false) {
    setPendingAuthEmail('')
    setLoginSuccessMessage(null)
    const result = await login(email, password, remember, reactivate)
    if (result.requires2FA) {
      setPendingAuthEmail(email)
      setView('2fa')
    }
  }
  async function handle2FAVerify(code: string, email: string) { await verify2FA(code, email) }
  async function registerUser(name: string, email: string, phone: string, password: string, passwordConfirmation: string): Promise<void> {
    const response = await authService.register({ name, email, phone, password, password_confirmation: passwordConfirmation })
    if (!response.success) throw new Error(response.message || 'Registration failed')
    setLoginSuccessMessage('Account created. You can now sign in.')
  }
  async function handleGoogleSignIn(idToken: string, intent: 'sign_in' | 'sign_up' | 'reactivate') {
    setLoginSuccessMessage(null)
    const response = await authService.googleSignIn(idToken, intent)
    const result = response.data
    if (!response.success || !result?.user || !result.tokens?.access_token || !result.tokens?.refresh_token) {
      throw new Error(response.message || 'Google sign-in failed. Please try again.')
    }
    authenticateWithTokens(result.user, result.tokens.access_token, result.tokens.refresh_token)
    setView(result.user.role === 'staff' ? 'staff-dashboard' : result.user.role === 'admin' ? 'admin-dashboard' : 'resident-dashboard')
  }
  async function addUser(data: CreateUserData) {
    const response = await userService.createUser(data)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to create user')
    setUsers((current) => [response.data, ...current])
    showSuccess('User created successfully.')
  }
  async function updateUser(userId: number, data: UpdateUserData) {
    const response = await userService.updateUser(userId, data)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to update user')
    setUsers((current) => current.map((user) => Number(user.id) === Number(userId) ? response.data : user))
    showSuccess('User updated successfully.')
  }
  async function deleteUser(userId: number) {
    const response = await userService.deleteUser(userId)
    if (!response.success) throw new Error(response.message || 'Failed to delete user')
    setUsers((current) => current.filter((user) => Number(user.id) !== Number(userId)))
    showSuccess('User deleted successfully.')
  }
  async function toggleUser(userId: number) {
    const target = users.find((candidate) => Number(candidate.id) === Number(userId))
    if (!target) return
    await updateUser(userId, { is_active: !target.is_active })
  }
  async function changeUserRole(userId: number, nextRole: UserRole) {
    await updateUser(userId, { role: nextRole })
  }
  async function addCategory(name: string, description: string) {
    const response = await categoriesService.addCategory({ name, description })
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to add category')
    }
    setCategories((current) => [...current, response.data])
    showSuccess('Category created successfully.')
  }
  async function updateCategory(categoryId: number, name: string, description: string) {
    const response = await categoriesService.updateCategory(categoryId, { name, description })
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to update category')
    setCategories((current) => current.map((category) => category.id === categoryId ? response.data : category))
    showSuccess('Category updated successfully.')
  }
  async function toggleCategory(categoryId: number) {
    const response = await categoriesService.toggleCategory(categoryId)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to update category')
    setCategories((current) => current.map((category) => category.id === categoryId ? response.data : category))
    showSuccess('Category status updated successfully.')
  }
  async function deleteCategory(categoryId: number) {
    const response = await categoriesService.deleteCategory(categoryId)
    if (!response.success) throw new Error(response.message || 'Failed to delete category')
    setCategories((current) => current.filter((category) => category.id !== categoryId))
    showSuccess('Category deleted successfully.')
  }
  async function updateOwnProfile(data: UpdateProfileData) {
    const response = await userService.updateProfile(data)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to update profile')
    setAuthenticatedUser(response.data)
  }
  async function uploadOwnProfilePhoto(file: File) {
    const response = await userService.uploadProfilePhoto(file)
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to upload profile photo')
    setAuthenticatedUser(response.data)
  }
  async function removeOwnProfilePhoto() {
    const response = await userService.removeProfilePhoto()
    if (!response.success || !response.data) throw new Error(response.message || 'Failed to remove profile photo')
    setAuthenticatedUser(response.data)
  }
  async function changeOwnPassword(currentPassword: string, password: string, confirmation: string) {
    const data: ChangePasswordData = { current_password: currentPassword, password, password_confirmation: confirmation }
    const response = await userService.changePassword(data)
    if (!response.success) throw new Error(response.message || 'Failed to change password')
  }
  async function deleteOwnAccount(password: string) {
    const response = await userService.deleteOwnAccount(password)
    if (!response.success) throw new Error(response.message || 'Failed to delete account')
    await logout(false)
    setView('landing')
    setIsEmergencyContactsModalOpen(false)
    setReports([]); setCategories([]); setUsers([]); setNotifications([])
  }
  async function deactivateOwnAccount(reason: string, reasonDetails: string) {
    const response = await userService.deactivateOwnAccount(reason, reasonDetails)
    if (!response.success) throw new Error(response.message || 'Failed to deactivate account')
    await logout(false)
    setView('landing')
    setIsEmergencyContactsModalOpen(false)
    setReports([]); setCategories([]); setUsers([]); setNotifications([])
  }
  async function handleLogout() { await logout(); setView('landing'); setIsEmergencyContactsModalOpen(false); setReports([]); setCategories([]); setUsers([]) }

  if (isAuthLoading) return <div className="auth-loading" role="status">Restoring your session...</div>
  if (view === 'landing') return <LandingPage onLogin={handleLogin} onRegister={registerUser} onGoogleSignIn={handleGoogleSignIn} successMessage={loginSuccessMessage} />
  if (view === '2fa') return <><div className="auth-wrapper"><LanguageSelect language={language} onLanguageChange={changeLanguage} /><TwoFactorAuthPage email={pendingAuthEmail} onVerify={handle2FAVerify} onBack={() => setView('landing')} /></div></>
  return <>
    <div className={`app-shell${role === 'resident' ? ' app-shell--resident' : ''}`}>
      <Header role={role} user={user} language={language} onLanguageChange={changeLanguage} onOpenLogin={handleLogout} reports={reports} categories={categories} users={users} notifications={notifications} onOpenEmergencyContacts={() => setIsEmergencyContactsModalOpen(true)} onOpenNotification={openNotification} onDeleteNotification={deleteNotification} onDeleteAllNotifications={deleteAllNotifications} onMarkAllNotificationsRead={markAllNotificationsRead} onSelectReport={selectReport} onNavigate={navigate} onSearchUsers={setUserSearchQuery} onUpdateProfile={updateOwnProfile} onChangePassword={changeOwnPassword} onDeleteOwnAccount={deleteOwnAccount} onDeactivateOwnAccount={deactivateOwnAccount} onNavigateWebsiteContent={navigateToWebsiteContent} onNavigateResidentProfile={() => navigate('resident-profile')} onUploadProfilePhoto={uploadOwnProfilePhoto} onRemoveProfilePhoto={removeOwnProfilePhoto} />
      <div className="app-body">
        {role !== 'resident' && <Sidebar role={role} view={view} onNavigate={navigate} onOpenEmergencyContacts={() => setIsEmergencyContactsModalOpen(true)} />}
        <main className="main-area">
          {(view === 'resident-dashboard' || view === 'resident-reports') && <ResidentDashboard reports={reports} categories={categories} onNavigate={navigate} onSelectReport={selectReport} showAllReports={view === 'resident-reports'} isLoading={isReportsLoading} />}
          {view === 'resident-profile' && role === 'resident' && user && <ResidentProfilePage user={user} onCancel={() => navigate('resident-dashboard')} />}
          {view === 'address-verification' && (role === 'staff' || role === 'admin') && <ResidentAddressReviewPage />}
          {view === 'community-reports' && role === 'resident' && <CommunityReportsPage />}
          {view === 'resident-events' && role === 'resident' && <ResidentEventsPage language={language} />}
          {view === 'submit-report' && <SubmitReportPage categories={categories} onSubmit={submitReport} onCancel={() => navigate('resident-dashboard')} />}
          {view === 'staff-dashboard' && user?.role === 'staff' && <StaffDashboard reports={reports} categories={categories} userId={user.id} onSelectReport={selectReport} onOpenWorkspace={() => navigate('reports')} isLoading={isReportsLoading} />}
          {(view === 'reports' || view === 'staff-workspace' || view === 'report-attachments') && user && <StaffReportWorkspace key={`${role}-${view}`} reports={reports} categories={categories} role={role} userId={user.id} onSelectReport={role === 'staff' ? openReportFromAttachments : selectReport} onOpenAttachments={role === 'admin' ? () => setIsAdminAttachmentModalOpen(true) : undefined} initialSection={view === 'report-attachments' ? 'attachments' : 'reports'} isLoading={isReportsLoading} />}
          {view === 'map-monitoring' && user && <Suspense fallback={<div className="auth-loading" role="status">Loading map monitoring…</div>}><MapMonitoringPage reports={reports} categories={categories} role={role} userId={user.id} onSelectReport={selectReport} isLoading={isReportsLoading} /></Suspense>}
          {view === 'admin-dashboard' && <AdminDashboard users={users} reports={reports} categories={categories} onNavigate={navigate} />}
          {view === 'users' && user && <UserManagementPage key={`users-${userSearchQuery}`} users={users} currentUserId={user.id} initialQuery={userSearchQuery} onCreate={addUser} onUpdate={updateUser} onDelete={deleteUser} onToggleActive={toggleUser} onRoleChange={changeUserRole} />}
          {view === 'categories' && <CategoryManagementPage categories={categories} reports={reports} onAdd={addCategory} onUpdate={updateCategory} onToggle={toggleCategory} onDelete={deleteCategory} />}
          {(view === 'analytics-reports' && role === 'admin' || view === 'staff-analytics' && role === 'staff') && <AnalyticsReportsPage reports={reports} categories={categories} onSelectReport={selectReport} isLoading={isReportsLoading} {...(role === 'staff' && user ? { staffId: user.id, staffName: user.name } : {})} />}
          {view === 'audit' && <AuditLogsPage />}
          {view === 'announcements' && role !== 'resident' && <AnnouncementsPage role={role} language={language} currentUserId={user?.id ?? 0} />}
          {view === 'website-content' && role === 'admin' && <WebsiteContentPage onClose={() => navigate(websiteSettingsReturnView.current)} />}
          <Footer />
        </main>
      </div>
      {role === 'resident' && <ResidentBottomNav view={view} onNavigate={navigate} />}
      {role === 'admin' && isAdminAttachmentModalOpen && <ReportAttachmentsPage reports={reports} categories={categories} onOpenReport={openReportFromAttachments} isLoading={isReportsLoading} isModal onClose={() => setIsAdminAttachmentModalOpen(false)} />}
      {selectedReport && <ReportDetailModal key={selectedReport.id} report={selectedReport} categories={categories} isStaff={role !== 'resident'} canAssign={role === 'admin'} canDelete={role === 'admin' || (role === 'resident' && selectedReport.status === 'submitted' && Number(selectedReport.resident_id) === Number(user?.id))} canViewCommunityPost={role === 'admin' || role === 'staff'} onClose={() => setSelectedReportId(null)} onAddComment={addComment} onUpdateReport={updateReport} onDeleteReport={deleteReport} onAssignReport={assignReport} staffUsers={users.filter((u) => u.role === 'staff' && u.is_active)} />}
    </div>
    {isEmergencyContactsModalOpen && <EmergencyContactsModal role={role} language={language} onClose={() => setIsEmergencyContactsModalOpen(false)} />}
    {selectedAnnouncement && <AnnouncementModal
      title={selectedAnnouncement.report_title ?? (language === 'tl' ? 'Announcement' : 'Announcement')}
      message={selectedAnnouncement.announcement_message ?? ''}
      author={selectedAnnouncement.actor_name}
      publishedAt={selectedAnnouncement.created_at}
      language={language}
      onClose={() => setSelectedAnnouncement(null)}
    />}
    {successNotice && <SuccessModal key={successNotice.id} message={successNotice.message} onClose={dismissSuccess} />}
  </>
}

function App() { return <AuthProvider><AppContent /></AuthProvider> }

export default App
