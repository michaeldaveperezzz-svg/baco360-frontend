import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Bell, CheckCheck, FileText, LogOut, MapPin, Menu, Phone, Search, Trash2, UserRound, X } from 'lucide-react'
import Brand from './Brand'
import type { Language } from '../i18n'
import type { Category, Notification, Report, User, UserRole } from '../data/types'
import type { ViewKey } from '../types'
import AccountMenu from './AccountMenu'
import ProfilePhoto from './ProfilePhoto'
import type { UpdateNotificationSettingsData, UpdateProfileData } from '../services/user.service'

interface HeaderProps {
  role: UserRole
  user: User | null
  language: Language
  onLanguageChange: (language: Language) => void
  onOpenLogin: () => void
  reports: Report[]
  categories: Category[]
  users: User[]
  notifications: Notification[]
  onOpenNotification: (notification: Notification) => Promise<void>
  onDeleteNotification: (notificationId: number) => Promise<void>
  onDeleteAllNotifications: () => Promise<void>
  onMarkAllNotificationsRead: () => Promise<void>
  onSelectReport: (report: Report) => void
  onNavigate: (view: ViewKey) => void
  onSearchUsers: (query: string) => void
  onUpdateProfile: (data: UpdateProfileData) => Promise<void>
  onUpdateNotifications: (data: UpdateNotificationSettingsData) => Promise<void>
  onChangePassword: (currentPassword: string, password: string, confirmation: string) => Promise<void>
  onNavigateWebsiteContent: () => void
  onNavigateResidentProfile: () => void
  onUploadProfilePhoto: (file: File) => Promise<void>
  onRemoveProfilePhoto: () => Promise<void>
}

export default function Header({ role, user, language, onLanguageChange, onOpenLogin, reports, categories, users, notifications, onOpenNotification, onDeleteNotification, onDeleteAllNotifications, onMarkAllNotificationsRead, onSelectReport, onNavigate, onSearchUsers, onUpdateProfile, onUpdateNotifications, onChangePassword, onNavigateWebsiteContent, onNavigateResidentProfile, onUploadProfilePhoto, onRemoveProfilePhoto }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSignoutConfirmation, setShowSignoutConfirmation] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signoutError, setSignoutError] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [deletingNotificationId, setDeletingNotificationId] = useState<number | null>(null)
  const [clearingNotificationId, setClearingNotificationId] = useState<number | null>(null)
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [clearingNotifications, setClearingNotifications] = useState<Notification[] | null>(null)
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [skipDeleteAllConfirmation, setSkipDeleteAllConfirmation] = useState(() => user
    ? localStorage.getItem(`baco360-skip-delete-all-notifications-confirmation-${user.id}`) === 'true'
    : false)
  const deleteAllPreferenceKey = user ? `baco360-skip-delete-all-notifications-confirmation-${user.id}` : null
  const displayNotifications = clearingNotifications ?? notifications
  const unreadCount = notifications.filter((notification) => !notification.read_at).length

  useEffect(() => {
    if (!showNotifications) return
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setShowNotifications(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showNotifications])

  useEffect(() => {
    if (!showEmergencyContacts) return
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setShowEmergencyContacts(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showEmergencyContacts])

  const searchResults = useMemo(() => {
    const queryParts = searchQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    if (queryParts.length === 0) return []

    const matchingReports = reports
      .filter((report) => {
        const category = categories.find((item) => Number(item.id) === Number(report.category_id))?.name ?? ''
        const searchableText = `${report.title} ${report.reference_number} ${report.location_address} ${report.description} ${category}`.toLocaleLowerCase()
        return queryParts.every((part) => searchableText.includes(part))
      })
      .slice(0, 5)
      .map((report) => ({ type: 'report' as const, report }))

    const matchingUsers = role === 'admin'
      ? users
        .filter((user) => {
          const searchableText = `${user.name} ${user.email} ${user.role}`.toLocaleLowerCase()
          return queryParts.every((part) => searchableText.includes(part))
        })
        .slice(0, 3)
        .map((user) => ({ type: 'user' as const, user }))
      : []

    return [...matchingReports, ...matchingUsers].slice(0, 7)
  }, [categories, reports, role, searchQuery, users])

  // Get role display info
  const roleInfo = {
    resident: { avatar: 'MC', label: 'Resident' },
    staff: { avatar: 'AO', label: 'Staff' },
    admin: { avatar: 'MP', label: 'Administrator' }
  }[role]

  async function confirmSignout() {
    setIsSigningOut(true)
    setSignoutError(null)
    try {
      await onOpenLogin()
      setShowSignoutConfirmation(false)
    } catch (error) {
      setSignoutError(error instanceof Error ? error.message : 'Sign out failed. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  function closeSearch() {
    setIsSearchFocused(false)
  }

  function selectSearchResult(result: (typeof searchResults)[number]) {
    setSearchQuery('')
    closeSearch()
    if (result.type === 'report') onSelectReport(result.report)
    else {
      onSearchUsers(searchQuery.trim())
      onNavigate('users')
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (searchResults[0]) selectSearchResult(searchResults[0])
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSearchQuery('')
      closeSearch()
    }
  }

  function notificationTitle(notification: Notification) {
    if (notification.event_type === 'announcement') {
      return language === 'tl' ? 'Bagong announcement' : 'Community announcement'
    }
    const titles: Record<Exclude<Notification['event_type'], 'announcement'>, Record<Language, string>> = {
      concern_submitted: { en: 'New community concern', tl: 'Bagong alalahanin ng komunidad' },
      concern_updated: { en: 'Concern details updated', tl: 'Na-update ang detalye ng concern' },
      resident_message: { en: 'New resident message', tl: 'Bagong mensahe mula sa residente' },
      report_updated: { en: 'Report updated', tl: 'Na-update ang ulat' },
      report_message: { en: 'New municipal team message', tl: 'Bagong mensahe mula sa munisipyo' },
      report_assigned: { en: 'Report assigned', tl: 'Na-atasan ang ulat' },
      address_verified: { en: 'Address verified', tl: 'Na-verify ang address' },
      address_rejected: { en: 'Address needs an update', tl: 'Kailangang i-update ang address' },
      community_comment: { en: 'New resident comment', tl: 'Bagong komento ng residente' },
      community_reaction: { en: 'New resident reaction', tl: 'Bagong reaction ng residente' },
    }
    return titles[notification.event_type][language]
  }

  function notificationDescription(notification: Notification) {
    const actor = notification.actor_name
    if (notification.event_type === 'announcement') {
      return language === 'tl' ? `Ipinadala ni ${actor} ang announcement.` : `${actor} shared an announcement.`
    }
    const descriptions: Record<Exclude<Notification['event_type'], 'announcement'>, Record<Language, string>> = {
      concern_submitted: { en: `${actor} submitted a new concern.`, tl: `Nagsumite si ${actor} ng bagong concern.` },
      concern_updated: { en: `${actor} updated the concern details.`, tl: `In-update ni ${actor} ang detalye ng concern.` },
      resident_message: { en: `${actor} sent a message about this concern.`, tl: `Nagpadala si ${actor} ng mensahe tungkol sa concern na ito.` },
      report_updated: { en: `${actor} updated this report.`, tl: `In-update ni ${actor} ang ulat na ito.` },
      report_message: { en: `${actor} sent an update about this report.`, tl: `Nagpadala si ${actor} ng update tungkol sa ulat na ito.` },
      report_assigned: { en: `${actor} assigned this report.`, tl: `Itinalaga ni ${actor} ang ulat na ito.` },
      address_verified: { en: `${actor} verified your submitted address.`, tl: `Na-verify ni ${actor} ang isinumite mong address.` },
      address_rejected: { en: `${actor} reviewed your address. Please check your profile for updates.`, tl: `Sinuri ni ${actor} ang address mo. Tingnan ang profile mo para sa detalye.` },
      community_comment: { en: `${actor} commented on a resolved report.`, tl: `Nagkomento si ${actor} sa isang resolved report.` },
      community_reaction: { en: `${actor} reacted to a resolved report.`, tl: `Nag-react si ${actor} sa isang resolved report.` },
    }
    return descriptions[notification.event_type][language]
  }

  function formatNotificationDate(date: string) {
    return new Intl.DateTimeFormat(language === 'tl' ? 'fil-PH' : 'en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  }

  async function openNotification(notification: Notification) {
    setNotificationError(null)
    try {
      await onOpenNotification(notification)
      setShowNotifications(false)
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to open this notification.')
    }
  }

  async function markAllNotificationsRead() {
    setNotificationError(null)
    try {
      await onMarkAllNotificationsRead()
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to update notifications.')
    }
  }

  async function deleteNotification(notificationId: number) {
    if (deletingNotificationId !== null) return
    setNotificationError(null)
    setClearingNotifications(notifications)
    setDeletingNotificationId(notificationId)
    setClearingNotificationId(notificationId)
    try {
      await onDeleteNotification(notificationId)
      await new Promise((resolve) => window.setTimeout(resolve, 260))
      setClearingNotifications(null)
      setClearingNotificationId(null)
    } catch (error) {
      setClearingNotifications(null)
      setClearingNotificationId(null)
      setNotificationError(error instanceof Error ? error.message : 'Unable to delete this notification.')
    } finally {
      setDeletingNotificationId(null)
    }
  }

  function requestDeleteAllNotifications() {
    setNotificationError(null)
    setDontAskAgain(false)
    if (skipDeleteAllConfirmation) {
      void confirmDeleteAllNotifications()
      return
    }
    setShowDeleteAllConfirmation(true)
  }

  async function confirmDeleteAllNotifications() {
    if (isDeletingAll || notifications.length === 0) return
    setNotificationError(null)
    setClearingNotifications(notifications)
    setIsDeletingAll(true)
    try {
      await onDeleteAllNotifications()
      setShowDeleteAllConfirmation(false)
      setIsClearingAll(true)
      if (dontAskAgain && deleteAllPreferenceKey) {
        try {
          localStorage.setItem(deleteAllPreferenceKey, 'true')
          setSkipDeleteAllConfirmation(true)
        } catch {
          setNotificationError(language === 'tl' ? 'Nabura ang mga abiso, pero hindi na-save ang preference.' : 'Notifications were deleted, but your confirmation preference could not be saved.')
        }
      }
      window.setTimeout(() => {
        setClearingNotifications(null)
        setIsClearingAll(false)
      }, 260)
    } catch (error) {
      setClearingNotifications(null)
      setNotificationError(error instanceof Error ? error.message : 'Unable to delete notifications.')
    } finally {
      setIsDeletingAll(false)
    }
  }

  return (
    <>
    <header className="topbar">
      <Brand />
      <form className="global-search-wrap" role="search" onSubmit={handleSearchSubmit}>
        <label className="global-search"><Search size={17} /><input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => window.setTimeout(closeSearch, 120)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search reports, places, people"
          aria-label="Search reports, places, or people"
          aria-expanded={isSearchFocused && Boolean(searchQuery.trim())}
          aria-controls="global-search-results"
          autoComplete="off"
        />{searchQuery && <button className="global-search-clear" type="button" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={() => setSearchQuery('')}><X size={14} /></button>}</label>
        {isSearchFocused && searchQuery.trim() && <div className="global-search-results" id="global-search-results" role="listbox">
          {searchResults.length > 0 ? searchResults.map((result) => result.type === 'report'
            ? <button className="global-search-result" type="button" role="option" key={`report-${result.report.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(result)}>
              <span className="global-search-result-icon"><FileText size={15} /></span>
              <span><strong>{result.report.title}</strong><small><MapPin size={11} />{result.report.location_address || result.report.reference_number}</small></span>
              <span className="global-search-result-type">Report</span>
            </button>
            : <button className="global-search-result" type="button" role="option" key={`user-${result.user.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(result)}>
              <span className="global-search-result-icon"><UserRound size={15} /></span>
              <span><strong>{result.user.name}</strong><small>{result.user.email}</small></span>
              <span className="global-search-result-type">Person</span>
            </button>)
            : <p className="global-search-empty" role="status">No reports, places, or people found.</p>}
        </div>}
      </form>
      <div className="topbar-actions">
        {role === 'resident' && <button className="icon-button emergency-contacts-button" type="button" aria-label={language === 'tl' ? 'Mga emergency contact' : 'Emergency contacts'} aria-expanded={showEmergencyContacts} onClick={() => setShowEmergencyContacts(true)}><Phone size={19} /></button>}
        <button className="icon-button notification-button" type="button" aria-label={language === 'tl' ? `Mga abiso, ${unreadCount} hindi pa nababasa` : `Notifications, ${unreadCount} unread`} aria-expanded={showNotifications} onClick={() => {
          setNotificationError(null)
          setShowNotifications(true)
        }}><Bell size={19} />{unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
        <div className="role-display" title={`Logged in as ${roleInfo.label}`}>
          {user ? <ProfilePhoto user={user} name={user.name} className="role-avatar" /> : <span className="role-avatar">{roleInfo.avatar}</span>}
          <span className="role-label">{roleInfo.label}</span>
        </div>
        <button className="icon-button account-menu-trigger" type="button" aria-label={language === 'tl' ? 'Buksan ang menu ng account' : 'Open account menu'} aria-expanded={showAccountMenu} onClick={() => setShowAccountMenu(true)}><Menu size={21} /></button>
      </div>
    </header>
    {showAccountMenu && user && <AccountMenu user={user} language={language} onLanguageChange={onLanguageChange} onClose={() => setShowAccountMenu(false)} onNavigateWebsiteContent={() => {
      onNavigateWebsiteContent()
      setShowAccountMenu(false)
    }} onNavigateResidentProfile={() => {
      onNavigateResidentProfile()
      setShowAccountMenu(false)
    }} onSignOut={() => {
      setShowAccountMenu(false)
      setSignoutError(null)
      setShowSignoutConfirmation(true)
    }} onUpdateProfile={onUpdateProfile} onUpdateNotifications={onUpdateNotifications} onChangePassword={onChangePassword} onUploadProfilePhoto={onUploadProfilePhoto} onRemoveProfilePhoto={onRemoveProfilePhoto} />}
    {showEmergencyContacts && createPortal(<div className="emergency-contacts-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setShowEmergencyContacts(false)
    }}>
      <section className="emergency-contacts-modal" role="dialog" aria-modal="true" aria-labelledby="emergency-contacts-title">
        <header>
          <div><span className="eyebrow">{language === 'tl' ? 'TULONG PARA SA BACO' : 'BACO EMERGENCY HELP'}</span><h2 id="emergency-contacts-title">{language === 'tl' ? 'Mga emergency contact sa Baco' : 'Baco emergency contacts'}</h2></div>
          <button className="icon-button" type="button" aria-label={language === 'tl' ? 'Isara ang emergency contacts' : 'Close emergency contacts'} onClick={() => setShowEmergencyContacts(false)}><X size={19} /></button>
        </header>
        <p>{language === 'tl' ? 'Para sa emergency sa Baco, tawagan ang pambansang hotline at ibigay ang barangay at eksaktong lokasyon.' : 'For emergencies in Baco, call a national hotline and provide your barangay and exact location.'}</p>
        <a className="emergency-contact-link" href="tel:911"><span><strong>National Emergency Hotline</strong><small>{language === 'tl' ? 'Pulis, bumbero, at medikal na saklolo' : 'Police, fire, and medical emergencies'}</small></span><b>911</b></a>
        <a className="emergency-contact-link" href="tel:143"><span><strong>Philippine Red Cross</strong><small>{language === 'tl' ? 'Red Cross hotline' : 'Red Cross hotline'}</small></span><b>143</b></a>
        <small className="emergency-contacts-note">{language === 'tl' ? 'Maaaring mag-iba ang availability depende sa lugar at network.' : 'Availability may vary by location and network.'}</small>
      </section>
    </div>, document.body)}
    {showNotifications && createPortal(<div className="notification-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setShowNotifications(false)
    }}>
      <section className="notification-panel" role="dialog" aria-modal="true" aria-labelledby="notification-panel-title">
        <header className="notification-panel-header">
          <div><span className="eyebrow">{language === 'tl' ? 'MGA UPDATE SA KOMUNIDAD' : 'COMMUNITY UPDATES'}</span><h2 id="notification-panel-title">{language === 'tl' ? 'Mga abiso' : 'Notifications'}</h2></div>
          <div className="notification-panel-actions">
            <button className="icon-button" type="button" aria-label={language === 'tl' ? 'Isara ang mga abiso' : 'Close notifications'} onClick={() => setShowNotifications(false)}><X size={19} /></button>
          </div>
        </header>
        {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
        <div className="notification-list">
          {notifications.length > 0 && <div className="notification-list-actions">
            <button className="notification-mark-all" type="button" onClick={() => void markAllNotificationsRead()} disabled={unreadCount === 0}><CheckCheck size={14} />{language === 'tl' ? 'Markahang nabasa lahat' : 'Mark all read'}</button>
            <button className="notification-delete-all" type="button" onClick={requestDeleteAllNotifications} disabled={isDeletingAll}><Trash2 size={14} />{language === 'tl' ? 'Burahin lahat' : 'Delete all'}</button>
          </div>}
          {displayNotifications.length > 0 ? displayNotifications.map((notification) => <div className={`notification-item${notification.read_at ? '' : ' is-unread'}${isClearingAll || clearingNotificationId === notification.id ? ' is-clearing' : ''}`} key={notification.id}>
            <button className="notification-item-open" type="button" onClick={() => void openNotification(notification)}>
              <span className={`notification-item-icon${['high', 'urgent'].includes(notification.priority) ? ' is-high-priority' : ''}`}><Bell size={16} /></span>
              <span className="notification-item-content">
                <span className="notification-item-topline"><strong>{notificationTitle(notification)}</strong>{!notification.read_at && <i aria-label={language === 'tl' ? 'Hindi pa nababasa' : 'Unread'} />}</span>
                <span className="notification-item-description">{notificationDescription(notification)}</span>
                {notification.report_title && <span className="notification-report-title">{notification.report_title}</span>}
                <span className="notification-item-meta">{notification.reference_number && <span>{notification.reference_number}</span>}{['high', 'urgent'].includes(notification.priority) && <b className={`notification-priority priority-${notification.priority}`}>{language === 'tl' ? (notification.priority === 'urgent' ? 'Apurahan' : 'Mataas') : notification.priority}</b>}<time dateTime={notification.created_at}>{formatNotificationDate(notification.created_at)}</time></span>
              </span>
            </button>
            {notification.event_type !== 'announcement' && <button className="notification-delete" type="button" disabled={deletingNotificationId === notification.id} aria-label={language === 'tl' ? 'Burahin ang abiso' : 'Delete notification'} title={language === 'tl' ? 'Burahin ang abiso' : 'Delete notification'} onClick={() => void deleteNotification(notification.id)}><Trash2 size={15} /></button>}
          </div>) : <div className="notification-empty"><Bell size={25} /><strong>{language === 'tl' ? 'Wala pang abiso' : 'You’re all caught up'}</strong><span>{language === 'tl' ? 'Dito lalabas ang mga bagong concern at update.' : 'New concerns and report updates will appear here.'}</span></div>}
        </div>
      </section>
    </div>, document.body)}
    {showSignoutConfirmation && <div className="modal-backdrop signout-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSigningOut) setShowSignoutConfirmation(false)
    }}>
      <section className="signout-modal" role="alertdialog" aria-modal="true" aria-labelledby="signout-title" aria-describedby="signout-description">
        <span className="signout-modal-icon"><LogOut size={22} /></span>
        <h2 id="signout-title">Sign out?</h2>
        <p id="signout-description">{language === 'tl' ? 'Sigurado ka bang gusto mong mag-sign out sa iyong account?' : 'Are you sure you want to sign out of your account?'}</p>
        {signoutError && <p className="signout-error" role="alert">{signoutError}</p>}
        <div className="signout-modal-actions">
          <button type="button" className="button button-quiet" onClick={() => setShowSignoutConfirmation(false)} disabled={isSigningOut}>{language === 'tl' ? 'Kanselahin' : 'Cancel'}</button>
          <button type="button" className="button button-primary" onClick={() => void confirmSignout()} disabled={isSigningOut}>{isSigningOut ? (language === 'tl' ? 'Nag-sign out…' : 'Signing out…') : (language === 'tl' ? 'Mag-sign out' : 'Sign out')}</button>
        </div>
      </section>
    </div>}
    {showDeleteAllConfirmation && createPortal(<div className="modal-backdrop delete-confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isDeletingAll) setShowDeleteAllConfirmation(false)
    }}>
      <section className="delete-confirm-modal notification-delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-notification-title" aria-describedby="delete-notification-description">
        <span className="delete-confirm-icon"><Trash2 size={22} /></span>
        <h2 id="delete-notification-title">{language === 'tl' ? 'Burahin ang lahat ng abiso?' : 'Delete all notifications?'}</h2>
        <p id="delete-notification-description">{language === 'tl' ? 'Permanenteng mabubura ang lahat ng iyong abiso, kasama ang mga announcement.' : 'All your notifications, including announcements, will be permanently deleted.'}</p>
        <label className="notification-delete-confirm-option"><input type="checkbox" checked={dontAskAgain} onChange={(event) => setDontAskAgain(event.target.checked)} /><span>{language === 'tl' ? 'Huwag mo na akong tanungin muli' : 'Don’t ask me again'}</span></label>
        {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
        <div className="delete-confirm-actions">
          <button type="button" className="button button-quiet" onClick={() => setShowDeleteAllConfirmation(false)} disabled={isDeletingAll}>{language === 'tl' ? 'Kanselahin' : 'Cancel'}</button>
          <button type="button" className="button button-delete" onClick={() => void confirmDeleteAllNotifications()} disabled={isDeletingAll}>{isDeletingAll ? (language === 'tl' ? 'Binubura...' : 'Deleting...') : (language === 'tl' ? 'Burahin' : 'Delete')}</button>
        </div>
      </section>
    </div>, document.body)}
    </>
  )
}
