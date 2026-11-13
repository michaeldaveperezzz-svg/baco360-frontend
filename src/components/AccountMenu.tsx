import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Accessibility, Camera, ChevronDown, ChevronLeft, CircleHelp, Globe2, ImagePlus, LogOut, Moon, Palette, PanelsTopLeft, Shield, Sun, Trash2, UserRound, X } from 'lucide-react'
import type { Language } from '../i18n'
import type { User } from '../data/types'
import { userService, type ActiveSession, type LoginHistoryEntry, type UpdateProfileData } from '../services/user.service'
import ProfilePhoto from './ProfilePhoto'

type SettingsPage = 'home' | 'profile' | 'password' | 'language' | 'accessibility' | 'theme' | 'security' | 'sessions' | 'history' | 'help' | 'about'
type AccountAction = 'choose' | 'delete' | 'deactivate' | 'confirm-deactivation'

const deactivationReasons = [
  ['no_longer_needed', 'I no longer need this account', 'Hindi ko na kailangan ang account na ito'],
  ['taking_a_break', 'I am taking a break', 'Magpapahinga muna ako sa paggamit nito'],
  ['privacy_concerns', 'Privacy concerns', 'May alalahanin ako tungkol sa privacy'],
  ['too_many_notifications', 'Too many notifications', 'Masyadong maraming notification'],
  ['difficulty_using_app', 'Difficulty using Baco360', 'Nahihirapan akong gamitin ang Baco360'],
  ['other', 'Other reason', 'Iba pang dahilan'],
] as const

interface AccountMenuProps {
  user: User
  language: Language
  isClosing: boolean
  onCloseComplete: () => void
  onLanguageChange: (language: Language) => void
  onClose: () => void
  onSignOut: () => void
  onUpdateProfile: (data: UpdateProfileData) => Promise<void>
  onChangePassword: (currentPassword: string, password: string, confirmation: string) => Promise<void>
  onDeleteOwnAccount: (password: string) => Promise<void>
  onDeactivateOwnAccount: (reason: string, reasonDetails: string) => Promise<void>
  onNavigateWebsiteContent: () => void
  onNavigateResidentProfile: () => void
  onUploadProfilePhoto: (file: File) => Promise<void>
  onRemoveProfilePhoto: () => Promise<void>
}

function getErrorMessage(reason: unknown, fallback: string) {
  if (typeof reason === 'object' && reason !== null && 'message' in reason && typeof reason.message === 'string') {
    return reason.message
  }
  return fallback
}

function formatLoginDate(value: string, language: Language) {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(language === 'tl' ? 'fil-PH' : 'en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AccountMenu({ user, language, isClosing, onCloseComplete, onLanguageChange, onClose, onSignOut, onUpdateProfile, onChangePassword, onDeleteOwnAccount, onDeactivateOwnAccount, onNavigateWebsiteContent, onNavigateResidentProfile, onUploadProfilePhoto, onRemoveProfilePhoto }: AccountMenuProps) {
  const [page, setPage] = useState<SettingsPage>('home')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: user.phone ?? '' })
  const [currentPassword, setCurrentPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(user.has_password ?? true)
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null)
  const [deletionPassword, setDeletionPassword] = useState('')
  const [deactivationReason, setDeactivationReason] = useState('')
  const [deactivationDetails, setDeactivationDetails] = useState('')
  const [accountActionError, setAccountActionError] = useState('')
  const [accountActionBusy, setAccountActionBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [largeText, setLargeText] = useState(localStorage.getItem('baco360-large-text') === 'true')
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('baco360-reduce-motion') === 'true')
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('baco360-theme')
    const explicitlySelected = localStorage.getItem('baco360-theme-selected') === 'true'
    return savedTheme === 'system' && !explicitlySelected ? 'light' : savedTheme ?? 'light'
  })
  const isTl = language === 'tl'
  const text = (en: string, tl: string) => isTl ? tl : en

  useEffect(() => {
    localStorage.setItem('baco360-large-text', String(largeText))
    localStorage.setItem('baco360-reduce-motion', String(reduceMotion))
    document.documentElement.classList.toggle('large-text', largeText)
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [largeText, reduceMotion])

  useEffect(() => {
    if (!photoPreview) return
    return () => URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  useEffect(() => {
    const validTheme = theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'light'
    localStorage.setItem('baco360-theme', validTheme)
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      document.documentElement.dataset.theme = validTheme === 'system'
        ? colorScheme.matches ? 'dark' : 'light'
        : validTheme
    }
    applyTheme()
    if (validTheme !== 'system') return
    colorScheme.addEventListener('change', applyTheme)
    return () => colorScheme.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (accountAction && !accountActionBusy) setAccountAction(null)
        else onClose()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountAction, accountActionBusy, onClose])

  function navigate(next: SettingsPage) {
    setPage(next)
    setError('')
    setNotice('')
    if (next === 'history') void loadLoginHistory()
    if (next === 'sessions') void loadActiveSessions()
  }

  async function loadActiveSessions() {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const response = await userService.getActiveSessions()
      if (!response.success || !response.data) {
        throw new Error(response.message || text('Unable to load active sessions.', 'Hindi ma-load ang mga aktibong session.'))
      }
      setActiveSessions(response.data.sessions)
    } catch (reason) {
      setSessionsError(getErrorMessage(reason, text('Unable to load active sessions.', 'Hindi ma-load ang mga aktibong session.')))
    } finally {
      setSessionsLoading(false)
    }
  }

  async function revokeActiveSession(session: ActiveSession) {
    setRevokingSessionId(session.session_id)
    setSessionsError('')
    try {
      if (session.is_current) {
        onSignOut()
        return
      }
      const response = await userService.revokeActiveSession(session.session_id)
      if (!response.success) {
        throw new Error(response.message || text('Unable to end this session.', 'Hindi maisara ang session na ito.'))
      }
      await loadActiveSessions()
    } catch (reason) {
      setSessionsError(getErrorMessage(reason, text('Unable to end this session.', 'Hindi maisara ang session na ito.')))
    } finally {
      setRevokingSessionId(null)
    }
  }

  async function loadLoginHistory() {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const response = await userService.getLoginHistory()
      if (!response.success || !response.data) {
        throw new Error(response.message || text('Unable to load login history.', 'Hindi ma-load ang kasaysayan ng pag-login.'))
      }
      setLoginHistory(response.data.logs)
    } catch (reason) {
      setHistoryError(getErrorMessage(reason, text('Unable to load login history.', 'Hindi ma-load ang kasaysayan ng pag-login.')))
    } finally {
      setHistoryLoading(false)
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await onUpdateProfile(profile)
      if (selectedPhoto) {
        await onUploadProfilePhoto(selectedPhoto)
        setSelectedPhoto(null)
        setPhotoPreview(null)
        setNotice(text('Profile and photo updated.', 'Na-update ang profile at larawan.'))
      } else {
        setNotice(text('Profile updated.', 'Na-update ang profile.'))
      }
    } catch (reason) {
      setError(getErrorMessage(reason, text('Unable to update profile.', 'Hindi ma-update ang profile.')))
    } finally { setBusy(false) }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await onChangePassword(currentPassword, newPassword, passwordConfirmation)
      setCurrentPassword(''); setNewPassword(''); setPasswordConfirmation('')
      setHasPassword(true)
      setNotice(text('Password changed successfully.', 'Matagumpay na napalitan ang password.'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text('Unable to change password.', 'Hindi mapalitan ang password.'))
    } finally { setBusy(false) }
  }

  function openAccountActions() {
    setDeletionPassword('')
    setDeactivationReason('')
    setDeactivationDetails('')
    setAccountActionError('')
    setAccountAction('choose')
  }

  async function submitAccountDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccountActionBusy(true)
    setAccountActionError('')
    try {
      await onDeleteOwnAccount(deletionPassword)
    } catch (reason) {
      setAccountActionError(getErrorMessage(reason, text('Unable to delete your account.', 'Hindi ma-delete ang iyong account.')))
    } finally {
      setAccountActionBusy(false)
    }
  }

  function continueDeactivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deactivationReason || (deactivationReason === 'other' && !deactivationDetails.trim())) {
      setAccountActionError(text('Choose a reason and provide details if you select Other.', 'Pumili ng dahilan at magbigay ng detalye kung Iba pa ang pinili.'))
      return
    }
    setAccountActionError('')
    setAccountAction('confirm-deactivation')
  }

  async function confirmDeactivation() {
    setAccountActionBusy(true)
    setAccountActionError('')
    try {
      await onDeactivateOwnAccount(deactivationReason, deactivationDetails.trim())
    } catch (reason) {
      setAccountActionError(getErrorMessage(reason, text('Unable to deactivate your account.', 'Hindi ma-deactivate ang iyong account.')))
    } finally {
      setAccountActionBusy(false)
    }
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(text('Choose a JPG, PNG, or WebP image.', 'Pumili ng JPG, PNG, o WebP na larawan.'))
      return
    }
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      setError(text('Profile photos must be no larger than 5 MB.', 'Hindi dapat lumampas sa 5 MB ang larawan.'))
      return
    }
    setPhotoPreview(URL.createObjectURL(file))
    setSelectedPhoto(file)
    setError('')
    setNotice('')
  }

  async function savePhoto() {
    if (!selectedPhoto) return
    setPhotoBusy(true); setError(''); setNotice('')
    try {
      await onUploadProfilePhoto(selectedPhoto)
      setSelectedPhoto(null); setPhotoPreview(null)
      setNotice(text('Profile photo updated.', 'Na-update ang larawan sa profile.'))
    } catch (reason) {
      setError(getErrorMessage(reason, text('Unable to upload profile photo.', 'Hindi ma-upload ang larawan.')))
    } finally { setPhotoBusy(false) }
  }

  async function removePhoto() {
    setPhotoBusy(true); setError(''); setNotice('')
    try {
      await onRemoveProfilePhoto()
      setSelectedPhoto(null); setPhotoPreview(null)
      setNotice(text('Profile photo removed.', 'Naalis ang larawan sa profile.'))
    } catch (reason) {
      setError(getErrorMessage(reason, text('Unable to remove profile photo.', 'Hindi maalis ang larawan.')))
    } finally { setPhotoBusy(false) }
  }

  function updateAccessibility(key: 'largeText' | 'reduceMotion', value: boolean) {
    if (key === 'largeText') setLargeText(value)
    else setReduceMotion(value)
  }

  function updateTheme(value: string) {
    localStorage.setItem('baco360-theme-selected', 'true')
    setTheme(value)
  }

  const row = (icon: ReactNode, label: string, target: SettingsPage, detail?: string) => (
    <button className="account-menu-row" type="button" onClick={() => navigate(target)}>
      <span className="account-menu-row-icon">{icon}</span><span>{label}{detail && <small>{detail}</small>}</span><ChevronLeft className="account-menu-row-arrow" size={16} />
    </button>
  )

  const accordion = <Target extends string>(id: string, icon: ReactNode, label: string, items: Array<[string, Target]>, onSelect: (target: Target) => void) => (
    <section className={`account-menu-group ${expanded === id ? 'is-expanded' : ''}`}>
      <button className="account-menu-row" type="button" aria-expanded={expanded === id} aria-controls={`account-menu-${id}-submenu`} onClick={() => setExpanded(expanded === id ? null : id)}>
        <span className="account-menu-row-icon">{icon}</span><span>{label}</span><ChevronDown className="account-menu-chevron" size={16} />
      </button>
      <div className="account-menu-subrows" id={`account-menu-${id}-submenu`} aria-hidden={expanded !== id}><div>{items.map(([labelText, target]) => <button key={target} type="button" tabIndex={expanded === id ? 0 : -1} onClick={() => onSelect(target)}>{labelText}<ChevronLeft size={14} /></button>)}</div></div>
    </section>
  )

  const pageTitles: Record<SettingsPage, string> = {
    home: text('Account & settings', 'Account at mga setting'), profile: text('My Profile', 'Aking Profile'),
    password: text('Change Password', 'Palitan ang Password'),
    language: text('Language and Region', 'Wika at Rehiyon'), accessibility: text('Accessibility', 'Accessibility'),
    theme: text('Theme and Appearance', 'Tema at Itsura'), security: text('Security Settings', 'Mga Setting ng Seguridad'),
    sessions: text('Active Sessions', 'Mga Aktibong Session'), history: text('Login History', 'Kasaysayan ng Pag-login'),
    help: text('Help', 'Tulong'), about: text('About Baco360', 'Tungkol sa Baco360'),
  }

  function pageContent() {
    if (page === 'home') return <>
      <div className="account-menu-user"><ProfilePhoto user={user} name={user.name} className="account-menu-avatar" /><div><strong>{user.name}</strong><small>{user.email}</small><small className="account-role-name">{user.role}</small></div></div>
      <div className="account-menu-section-label">{text('ACCOUNT', 'ACCOUNT')}</div>
      {user.role === 'resident'
        ? <button className="account-menu-row" type="button" onClick={onNavigateResidentProfile}><span className="account-menu-row-icon"><UserRound size={18} /></span><span>{text('My Profile', 'Aking Profile')}</span><ChevronLeft className="account-menu-row-arrow" size={16} /></button>
        : row(<UserRound size={18} />, text('My Profile', 'Aking Profile'), 'profile')}
      {row(<Accessibility size={18} />, text('Accessibility', 'Accessibility'), 'accessibility')}
      {row(<Globe2 size={18} />, text('Language and Region', 'Wika at Rehiyon'), 'language')}
      <div className="account-menu-section-label">{text('PREFERENCES & SUPPORT', 'PREFERENCE AT SUPORTA')}</div>
      {accordion('appearance', <Palette size={18} />, text('Appearance', 'Itsura'), [[text('Theme and Appearance', 'Tema at Itsura'), 'theme']], navigate)}
      {accordion('security', <Shield size={18} />, text('Security and Privacy', 'Seguridad at Privacy'), [[text('Security Settings', 'Mga Setting ng Seguridad'), 'security'], [text('Active Sessions', 'Mga Aktibong Session'), 'sessions'], [text('Login History', 'Kasaysayan ng Pag-login'), 'history']], navigate)}
      {user.role === 'admin' && <button className="account-menu-row" type="button" onClick={onNavigateWebsiteContent}>
        <span className="account-menu-row-icon"><PanelsTopLeft size={18} /></span><span>{text('Website Settings', 'Mga Setting ng Website')}</span><ChevronLeft className="account-menu-row-arrow" size={16} />
      </button>}
      {accordion('help', <CircleHelp size={18} />, text('Help and Support', 'Tulong at Suporta'), [[text('Help', 'Tulong'), 'help'], [text('About Baco360', 'Tungkol sa Baco360'), 'about']], navigate)}
    </>
    if (page === 'profile') return <form className="account-settings-form" onSubmit={(event) => void submitProfile(event)}>
      <section className="account-photo-settings">
        <ProfilePhoto user={user} name={user.name} className="account-menu-avatar" previewUrl={photoPreview} />
        <div><strong>{text('Profile picture', 'Larawan sa profile')}</strong><small>{text('JPG, PNG, or WebP · up to 5 MB', 'JPG, PNG, o WebP · hanggang 5 MB')}</small></div>
        <input ref={photoInput} className="resident-profile-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />
        <button className="account-photo-button" type="button" aria-label={text('Choose a profile photo', 'Pumili ng larawan sa profile')} onClick={() => photoInput.current?.click()} disabled={photoBusy}><ImagePlus size={16} /></button>
        {selectedPhoto && <button className="account-photo-button" type="button" onClick={() => void savePhoto()} disabled={photoBusy || busy} aria-label={text('Upload profile photo', 'I-upload ang larawan')} title={text('Upload profile photo', 'I-upload ang larawan')}><Camera size={16} /></button>}
        {(user.profile_photo || selectedPhoto) && <button className="account-photo-button is-danger" type="button" onClick={() => void removePhoto()} disabled={photoBusy} aria-label={text('Remove profile photo', 'Alisin ang larawan')}><Trash2 size={16} /></button>}
      </section>
      <label>{text('Full name', 'Buong pangalan')}<input required maxLength={150} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
      <label>{text('Email address', 'Email address')}<input required type="email" maxLength={150} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
      <label>{text('Phone number', 'Numero ng telepono')}<input maxLength={30} value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
      <button className="account-primary-button" type="submit" disabled={busy}>{busy ? text('Saving…', 'Sine-save…') : text('Save changes', 'I-save ang mga pagbabago')}</button>
    </form>
    if (page === 'password') return <form className="account-settings-form" onSubmit={(event) => void submitPassword(event)}>
      {hasPassword
        ? <label>{text('Current password', 'Kasalukuyang password')}<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        : <p>{text('You signed in with Google and have not set a password yet. Enter a new password below.', 'Gumamit ka ng Google sa pag-sign in at wala ka pang password. Maglagay ng bagong password sa ibaba.')}</p>}
      <label>{text('New password (at least 8 characters)', 'Bagong password (hindi bababa sa 8 karakter)')}<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
      <label>{text('Confirm new password', 'Kumpirmahin ang bagong password')}<input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
      <button className="account-primary-button" type="submit" disabled={busy}>{busy ? text('Updating…', 'Ina-update…') : text('Update password', 'I-update ang password')}</button>
    </form>
    if (page === 'language') return <div className="account-settings-form">
      <label>{text('Language', 'Wika')}<select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}><option value="en">English</option><option value="tl">Filipino</option></select></label>
      <label>{text('Region', 'Rehiyon')}<input readOnly value="Baco, Oriental Mindoro · Philippines (UTC+8)" /></label>
    </div>
    if (page === 'accessibility') return <div className="account-toggle-list">
      <label><span>{text('Larger text', 'Mas malaking teksto')}<small>{text('Increase text size throughout the app.', 'Palakihin ang teksto sa buong app.')}</small></span><input type="checkbox" checked={largeText} onChange={(event) => updateAccessibility('largeText', event.target.checked)} /></label>
      <label><span>{text('Reduce motion', 'Bawasan ang galaw')}<small>{text('Limit interface animations.', 'Limitahan ang animation ng interface.')}</small></span><input type="checkbox" checked={reduceMotion} onChange={(event) => updateAccessibility('reduceMotion', event.target.checked)} /></label>
    </div>
    if (page === 'theme') return <div className="account-theme-options">
      {(['light', 'dark', 'system'] as const).map((value) => <button key={value} type="button" className={theme === value ? 'selected' : ''} onClick={() => updateTheme(value)}>{value === 'light' ? <Sun size={18} /> : value === 'dark' ? <Moon size={18} /> : <Palette size={18} />}{text(value[0].toUpperCase() + value.slice(1), value === 'light' ? 'Maliwanag' : value === 'dark' ? 'Madilim' : 'Ayon sa device')}</button>)}
    </div>
    if (page === 'security') return <>
      <div className="account-info-card"><Shield size={22} /><strong>{text('Keep your account secure', 'Panatilihing ligtas ang iyong account')}</strong><p>{text('Use a unique password and never share your sign-in details. Change your password regularly.', 'Gumamit ng natatanging password at huwag ibahagi ang iyong mga detalye sa pag-login. Palitan ito nang regular.')}</p><button type="button" onClick={() => navigate('password')}>{text('Change password', 'Palitan ang password')}</button></div>
      {user.role === 'resident' && <div className="account-danger-card">
        <strong>{text('Manage your account', 'Pamahalaan ang account')}</strong>
        <p>{text('Deactivate your account temporarily or request permanent deletion.', 'Pansamantalang i-deactivate o hilinging permanenteng burahin ang iyong account.')}</p>
        <button type="button" onClick={openAccountActions}>{text('Deactivate or delete account', 'I-deactivate o burahin ang account')}</button>
      </div>}
    </>
    if (page === 'sessions') {
      if (sessionsLoading) return <p className="account-menu-message" role="status">{text('Loading active sessions…', 'Nilo-load ang mga aktibong session…')}</p>
      if (sessionsError && activeSessions.length === 0) return <div className="account-info-card"><Shield size={22} /><strong>{text('Could not load active sessions', 'Hindi ma-load ang mga aktibong session')}</strong><p role="alert">{sessionsError}</p><button type="button" onClick={() => void loadActiveSessions()}>{text('Try again', 'Subukan muli')}</button></div>
      if (activeSessions.length === 0) return <div className="account-info-card"><Shield size={22} /><strong>{text('No active sessions found', 'Walang nahanap na aktibong session')}</strong><p>{text('Sign in again to create an active session for this device.', 'Mag-sign in muli upang gumawa ng aktibong session para sa device na ito.')}</p></div>
      return <section className="account-active-sessions">
        <div className="account-login-history-toolbar"><p>{text('Revoke any session you do not recognize.', 'I-revoke ang session na hindi mo nakikilala.')}</p><button type="button" onClick={() => void loadActiveSessions()} disabled={revokingSessionId !== null}>{text('Refresh', 'I-refresh')}</button></div>
        {sessionsError && <p className="account-menu-message is-error" role="alert">{sessionsError}</p>}
        {activeSessions.map((session) => <article className="account-active-session-item" key={session.session_id}>
          <div className="account-login-history-heading">
            <strong>{session.is_current ? text('This device', 'Device na ito') : text('Active device', 'Aktibong device')}</strong>
            <time dateTime={(session.created_at || '').replace(' ', 'T')}>{text('Started:', 'Nagsimula:')} {session.created_at ? formatLoginDate(session.created_at, language) : text('Unknown', 'Hindi alam')}</time>
          </div>
          <div className="account-login-history-details">
            <span><b>{text('Device', 'Device')}</b><span title={session.user_agent || ''}>{session.user_agent || text('Unavailable', 'Hindi available')}</span></span>
            <span><b>{text('IP address', 'IP address')}</b>{session.ip_address || text('Unavailable', 'Hindi available')}</span>
            <span><b>{text('Refresh token expires', 'Mag-e-expire ang session sa')}</b>{formatLoginDate(session.expires_at, language)}</span>
          </div>
          <button type="button" className="account-active-session-revoke" onClick={() => void revokeActiveSession(session)} disabled={revokingSessionId !== null}>
            {revokingSessionId === session.session_id
              ? text('Ending…', 'Isinasara…')
              : session.is_current ? text('Sign out this device', 'Mag-sign out sa device na ito') : text('Revoke session', 'I-revoke ang session')}
          </button>
        </article>)}
      </section>
    }
    if (page === 'history') {
      if (historyLoading) return <p className="account-menu-message" role="status">{text('Loading login history…', 'Nilo-load ang kasaysayan ng pag-login…')}</p>
      if (historyError) return <div className="account-info-card"><Shield size={22} /><strong>{text('Could not load login history', 'Hindi ma-load ang kasaysayan ng pag-login')}</strong><p role="alert">{historyError}</p><button type="button" onClick={() => void loadLoginHistory()}>{text('Try again', 'Subukan muli')}</button></div>
      if (loginHistory.length === 0) return <div className="account-info-card"><Shield size={22} /><strong>{text('No login history yet', 'Wala pang kasaysayan ng pag-login')}</strong><p>{text('Successful sign-ins from now on will appear here with their time, IP address, and device.', 'Lalabas dito ang mga susunod na matagumpay na pag-login kasama ang oras, IP address, at device.')}</p><button type="button" onClick={() => void loadLoginHistory()}>{text('Refresh', 'I-refresh')}</button></div>
      return <section className="account-login-history">
        <div className="account-login-history-toolbar"><p>{text('Your 50 most recent successful sign-ins.', 'Ang 50 pinakahuling matagumpay na pag-login mo.')}</p><button type="button" onClick={() => void loadLoginHistory()}>{text('Refresh', 'I-refresh')}</button></div>
        {loginHistory.map((entry) => <article className="account-login-history-item" key={entry.id}>
          <div className="account-login-history-heading"><strong>{entry.description || text('Successful sign-in', 'Matagumpay na pag-login')}</strong><time dateTime={entry.created_at.replace(' ', 'T')}>{formatLoginDate(entry.created_at, language)}</time></div>
          <div className="account-login-history-details">
            <span><b>{text('IP address', 'IP address')}</b>{entry.ip_address || text('Unavailable', 'Hindi available')}</span>
            <span><b>{text('Device', 'Device')}</b><span title={entry.user_agent || ''}>{entry.user_agent || text('Unavailable', 'Hindi available')}</span></span>
          </div>
        </article>)}
      </section>
    }
    if (page === 'help') return <div className="account-info-card"><CircleHelp size={22} /><strong>{text('Need help?', 'Kailangan ng tulong?')}</strong><p>{text('For assistance with community concerns or reports, contact the Baco Municipal Office.', 'Para sa tulong tungkol sa mga concern o report, makipag-ugnayan sa Munisipyo ng Baco.')}</p></div>
    return <div className="account-info-card"><span className="account-about-mark">B</span><strong>Baco360</strong><p>{text('A community reporting and engagement platform for the Municipality of Baco, Oriental Mindoro.', 'Isang platform para sa pag-uulat at pakikilahok ng komunidad sa Bayan ng Baco, Oriental Mindoro.')}</p><small>{text('Community. Connected.', 'Komunidad. Konektado.')}</small></div>
  }

  return <>
    {createPortal(<div className={`account-menu-backdrop${isClosing ? ' is-closing' : ''}`} onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === 'account-menu-backdrop-out') onCloseComplete()
    }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className={`account-menu-drawer${isClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="account-menu-title">
        <header className="account-menu-header">
          {page !== 'home' && <button className="icon-button" type="button" aria-label={text('Back to settings', 'Bumalik sa settings')} onClick={() => navigate('home')}><ChevronLeft size={20} /></button>}
          <h2 id="account-menu-title">{pageTitles[page]}</h2><button className="icon-button" type="button" aria-label={text('Close menu', 'Isara ang menu')} onClick={onClose}><X size={20} /></button>
        </header>
        <div className="account-menu-content">{error && <p className="account-menu-message is-error" role="alert">{error}</p>}{notice && <p className="account-menu-message" role="status">{notice}</p>}{pageContent()}</div>
        <footer className="account-menu-footer"><button type="button" onClick={onSignOut}><LogOut size={18} />{text('Sign out', 'Mag-sign out')}</button></footer>
      </aside>
    </div>, document.body)}
    {accountAction && createPortal(<div className="account-action-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !accountActionBusy) setAccountAction(null) }}>
      <section className="account-action-dialog" role="dialog" aria-modal="true" aria-labelledby="account-action-title">
        <header><h2 id="account-action-title">{accountAction === 'choose'
          ? text('Account options', 'Mga opsyon sa account')
          : accountAction === 'delete'
            ? text('Delete account', 'Burahin ang account')
            : accountAction === 'deactivate'
              ? text('Deactivate account', 'I-deactivate ang account')
              : text('Confirm deactivation', 'Kumpirmahin ang pag-deactivate')}</h2>
          <button type="button" className="icon-button" aria-label={text('Close dialog', 'Isara ang dialog')} disabled={accountActionBusy} onClick={() => setAccountAction(null)}><X size={18} /></button>
        </header>
        {accountActionError && <p className="account-menu-message is-error" role="alert">{accountActionError}</p>}
        {accountAction === 'choose' && <>
          <p>{text('Choose what you would like to do with your account.', 'Piliin kung ano ang gusto mong gawin sa iyong account.')}</p>
          <div className="account-action-buttons">
            <button type="button" className="account-action-danger" onClick={() => { setAccountActionError(''); setAccountAction('delete') }}>{text('Delete account', 'Burahin ang account')}</button>
            <button type="button" className="account-action-secondary" onClick={() => { setAccountActionError(''); setAccountAction('deactivate') }}>{text('Deactivate account', 'I-deactivate ang account')}</button>
          </div>
        </>}
        {accountAction === 'delete' && <form className="account-action-form" onSubmit={(event) => void submitAccountDeletion(event)}>
          <p>{text('Deletion is permanent. Accounts with reports or comments cannot be deleted; deactivate your account instead.', 'Permanenteng mabubura ang account. Hindi mabubura ang account na may reports o comments; i-deactivate na lang ito.')}</p>
          {user.has_password === false
            ? <div className="account-action-password-note"><p>{text('Set a password before deleting your Google account.', 'Magtakda muna ng password bago burahin ang Google account.')}</p><button type="button" className="account-action-secondary" onClick={() => { setAccountAction(null); navigate('password') }}>{text('Set a password', 'Magtakda ng password')}</button></div>
            : <>
              <label>{text('Password', 'Password')}<input required type="password" autoComplete="current-password" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} disabled={accountActionBusy} /></label>
              <button type="submit" className="account-action-danger" disabled={accountActionBusy}>{accountActionBusy ? text('Deleting…', 'Binubura…') : text('Permanently delete account', 'Burahin nang permanente ang account')}</button>
            </>}
        </form>}
        {accountAction === 'deactivate' && <form className="account-action-form" onSubmit={continueDeactivation}>
          <p>{text('Why do you want to deactivate your account?', 'Bakit mo gustong i-deactivate ang account?')}</p>
          <label>{text('Choose a reason', 'Pumili ng dahilan')}<select required value={deactivationReason} onChange={(event) => setDeactivationReason(event.target.value)} disabled={accountActionBusy}>
            <option value="">{text('Select a reason', 'Pumili ng dahilan')}</option>
            {deactivationReasons.map(([value, en, tl]) => <option key={value} value={value}>{text(en, tl)}</option>)}
          </select></label>
          {deactivationReason === 'other' && <label>{text('Tell us more', 'Magbigay ng detalye')}<textarea required maxLength={500} value={deactivationDetails} onChange={(event) => setDeactivationDetails(event.target.value)} disabled={accountActionBusy} /></label>}
          <div className="account-action-buttons">
            <button type="button" className="account-action-secondary" onClick={() => setAccountAction('choose')} disabled={accountActionBusy}>{text('Back', 'Bumalik')}</button>
            <button type="submit" className="account-action-danger" disabled={accountActionBusy}>{text('Continue', 'Magpatuloy')}</button>
          </div>
        </form>}
        {accountAction === 'confirm-deactivation' && <>
          <p>{text('Your account will be deactivated and you will be signed out. You can sign in again and confirm to reactivate it.', 'Madi-deactivate ang account at masa-sign out ka. Maaari kang mag-sign in muli at magkumpirma para i-reactivate ito.')}</p>
          <p className="account-action-reason">{text('Reason:', 'Dahilan:')} {deactivationReasons.find(([value]) => value === deactivationReason)?.[language === 'tl' ? 2 : 1]}{deactivationDetails.trim() ? ` — ${deactivationDetails.trim()}` : ''}</p>
          <div className="account-action-buttons">
            <button type="button" className="account-action-secondary" onClick={() => { setAccountActionError(''); setAccountAction('deactivate') }} disabled={accountActionBusy}>{text('Back', 'Bumalik')}</button>
            <button type="button" className="account-action-danger" onClick={() => void confirmDeactivation()} disabled={accountActionBusy}>{accountActionBusy ? text('Deactivating…', 'Dini-deactivate…') : text('Confirm deactivation', 'Kumpirmahin')}</button>
          </div>
        </>}
      </section>
    </div>, document.body)}
  </>
}
