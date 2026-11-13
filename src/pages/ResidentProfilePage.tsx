import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Check, Clock3, ImagePlus, MapPin, Trash2, UserRound, X } from 'lucide-react'
import ProfilePhoto from '../components/ProfilePhoto'
import SuccessModal from '../components/SuccessModal'
import type { ResidentProfile, User } from '../data/types'
import { useAuth } from '../contexts/AuthContext'
import { userService, type UpdateResidentProfileData } from '../services/user.service'

interface ResidentProfilePageProps {
  user: User
  onCancel: () => void
}

type ProfileForm = UpdateResidentProfileData
const TODAY_DATE = new Date().toISOString().slice(0, 10)
const DEFAULT_POSTAL_CODE = '5201'

const EMPTY_FORM: ProfileForm = {
  birth_date: '',
  gender: '',
  street: '',
  barangay: '',
  municipality: 'Baco',
  province: 'Oriental Mindoro',
  postal_code: DEFAULT_POSTAL_CODE,
  landmark: '',
  preferred_contact_method: null,
}

function formFromProfile(profile: ResidentProfile): ProfileForm {
  return {
    birth_date: profile.birth_date ?? '',
    gender: profile.gender ?? '',
    street: profile.street ?? '',
    barangay: profile.barangay ?? '',
    municipality: profile.municipality || 'Baco',
    province: profile.province || 'Oriental Mindoro',
    postal_code: DEFAULT_POSTAL_CODE,
    landmark: profile.landmark ?? '',
    preferred_contact_method: profile.preferred_contact_method,
  }
}

function verificationLabel(status: ResidentProfile['address_verification_status']) {
  if (status === 'Verified') return 'Verified'
  if (status === 'Rejected') return 'Rejected'
  return 'Pending review'
}

function getErrorMessage(reason: unknown, fallback: string) {
  if (typeof reason === 'object' && reason !== null && 'message' in reason && typeof reason.message === 'string') {
    return reason.message
  }
  return fallback
}

export default function ResidentProfilePage({ user, onCancel }: ResidentProfilePageProps) {
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState<ResidentProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [accountDetails, setAccountDetails] = useState({ name: user.name, email: user.email, phone: user.phone ?? '' })
  const [contactVerification, setContactVerification] = useState<{ phone_verification_required: boolean } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const photoInput = useRef<HTMLInputElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  const dismissSuccess = useCallback(() => setSuccessMessage(''), [])

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onCancelRef.current()
    }
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    let active = true
    void userService.getResidentProfile().then((response) => {
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load your resident profile.')
      if (!active) return
      setProfile(response.data)
      setForm(formFromProfile(response.data))
      setAccountDetails({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? '',
      })
    }).catch((reason: unknown) => {
      if (active) setError(getErrorMessage(reason, 'Unable to load your resident profile.'))
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [])

  function updateField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setNotice('')
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      if (contactVerification) {
        await verifyPendingContact()
        return
      }

      const emailChanged = accountDetails.email.trim().toLowerCase() !== profile?.email.toLowerCase()
      const phoneValue = accountDetails.phone.trim()
      const phoneChanged = (phoneValue || null) !== profile?.phone
      const response = await userService.updateResidentProfile({
        ...form,
        birth_date: form.birth_date ?? '',
        gender: form.gender ?? '',
        street: form.street ?? '',
        barangay: form.barangay ?? '',
        postal_code: form.postal_code ?? '',
        landmark: form.landmark ?? '',
      })
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to save your resident profile.')
      const saved = response.data
      setProfile(saved)
      setForm(formFromProfile(saved))

      const updatedProfile = await userService.updateProfile({ name: accountDetails.name.trim() })
      if (!updatedProfile.success || !updatedProfile.data) {
        throw new Error(updatedProfile.message || 'Your resident details were saved, but your name could not be updated.')
      }
      updateUser(updatedProfile.data)
      setProfile((current) => current ? { ...current, name: updatedProfile.data.name } : current)
      setAccountDetails((current) => ({ ...current, name: updatedProfile.data.name }))
      const photoWasSelected = selectedPhoto !== null
      if (selectedPhoto) {
        const photoResponse = await userService.uploadProfilePhoto(selectedPhoto)
        if (!photoResponse.success || !photoResponse.data) {
          throw new Error(photoResponse.message || 'Your profile details were saved, but your photo could not be uploaded.')
        }
        updateUser(photoResponse.data)
        setSelectedPhoto(null)
        setPreviewUrl(null)
      }

      if (emailChanged || phoneChanged) {
        const requestResponse = await userService.requestContactChange({
          email: accountDetails.email.trim(),
          phone: phoneValue,
        })
        if (!requestResponse.success || !requestResponse.data) {
          throw new Error(requestResponse.message || 'Unable to save your contact changes.')
        }
        const updatedUser = requestResponse.data.user
        updateUser(updatedUser)
        setProfile((current) => current ? {
          ...current,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
        } : current)
        if (requestResponse.data.phone_verification_required) {
          setAccountDetails((current) => ({
            ...current,
            name: updatedUser.name,
            email: updatedUser.email,
          }))
          setContactVerification({ phone_verification_required: true })
          setVerificationCode('')
          setNotice(emailChanged
            ? 'Your email was updated. A phone verification code was sent to your previous email address.'
            : 'A verification code was sent to your current email. Enter it to confirm your phone change.')
          return
        }
        setAccountDetails({
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone ?? '',
        })
        setSuccessMessage(emailChanged
          ? 'Your email and resident profile have been saved.'
          : photoWasSelected
            ? 'Your resident profile and photo have been saved.'
            : 'Your resident profile has been saved.')
        return
      }

      setSuccessMessage(photoWasSelected
        ? 'Your resident profile and photo have been saved.'
        : 'Your resident profile has been saved.')
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to save your resident profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function verifyPendingContact() {
    if (!contactVerification) return
    setIsSaving(true)
    setError('')
    try {
      const verificationResponse = await userService.verifyContactChange({
        account_code: verificationCode,
      })
      if (!verificationResponse.success || !verificationResponse.data) {
        throw new Error(verificationResponse.message || 'Unable to verify your contact changes.')
      }
      updateUser(verificationResponse.data)
      setProfile((current) => current ? {
        ...current,
        name: verificationResponse.data.name,
        email: verificationResponse.data.email,
        phone: verificationResponse.data.phone,
      } : current)
      setAccountDetails({
        name: verificationResponse.data.name,
        email: verificationResponse.data.email,
        phone: verificationResponse.data.phone ?? '',
      })
      setContactVerification(null)
      setVerificationCode('')
      setNotice('')
      setSuccessMessage('Your phone number has been verified and updated.')
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to verify your contact changes.'))
    } finally {
      setIsSaving(false)
    }
  }

  function cancelContactVerification() {
    setContactVerification(null)
    setVerificationCode('')
    setAccountDetails((current) => ({
      ...current,
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    }))
    setError('')
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      setError('Profile photos must be no larger than 5 MB.')
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    setSelectedPhoto(file)
    setError('')
    setNotice('')
  }

  async function uploadPhoto() {
    if (!selectedPhoto) return
    setPhotoBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await userService.uploadProfilePhoto(selectedPhoto)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to upload your profile photo.')
      updateUser(response.data)
      setSelectedPhoto(null)
      setPreviewUrl(null)
      setSuccessMessage('Your profile photo has been updated.')
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to upload your profile photo.'))
    } finally {
      setPhotoBusy(false)
    }
  }

  async function removePhoto() {
    setPhotoBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await userService.removeProfilePhoto()
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to remove your profile photo.')
      updateUser(response.data)
      setSelectedPhoto(null)
      setPreviewUrl(null)
      setSuccessMessage('Your profile photo has been removed.')
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to remove your profile photo.'))
    } finally {
      setPhotoBusy(false)
    }
  }

  return createPortal(<div className="resident-profile-modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onCancelRef.current()
  }}>
    <section className="resident-profile-modal" role="dialog" aria-modal="true" aria-labelledby="resident-profile-title">
      <div className="page-content resident-profile-page">
        <div className="resident-profile-heading">
          <div><span className="eyebrow">YOUR ACCOUNT</span><h1 id="resident-profile-title">Resident profile</h1><p>Keep your personal details and residential address up to date.</p></div>
          {profile && <div className="profile-completion-card" aria-label={`Profile ${profile.completion_percentage}% complete`}>
            <span>Profile completion</span><strong>{profile.completion_percentage}%</strong>
            <div className="profile-completion-track" role="progressbar" aria-valuenow={profile.completion_percentage} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${profile.completion_percentage}%` }} /></div>
          </div>}
          <button ref={closeButton} className="icon-button resident-profile-modal-close" type="button" onClick={onCancel} aria-label="Close resident profile"><X size={20} /></button>
        </div>

        {error && <p className="resident-profile-message is-error" role="alert">{error}</p>}
        {notice && <p className="resident-profile-message is-success" role="status"><Check size={16} />{notice}</p>}
        {isLoading && !profile && <p className="empty-state" role="status">Loading your profile…</p>}
        {!isLoading && !profile && !error && <p className="empty-state" role="status">Your profile could not be loaded.</p>}

        {profile && <form className="resident-profile-form" onSubmit={(event) => void submitProfile(event)}>
      <section className="content-panel resident-profile-section">
        <header className="resident-profile-section-heading"><span><UserRound size={18} /></span><div><h2>Personal information</h2><p>Your name and contact details come from your account.</p></div></header>
        <div className="resident-profile-grid">
          <label>Full name<input maxLength={150} value={accountDetails.name} onChange={(event) => setAccountDetails((current) => ({ ...current, name: event.target.value }))} required disabled={Boolean(contactVerification)} /></label>
          <label>Email address<input type="email" maxLength={150} value={accountDetails.email} onChange={(event) => setAccountDetails((current) => ({ ...current, email: event.target.value }))} required disabled={Boolean(contactVerification)} /></label>
          <label>Phone number<input type="tel" maxLength={30} value={accountDetails.phone} onChange={(event) => setAccountDetails((current) => ({ ...current, phone: event.target.value }))} disabled={Boolean(contactVerification)} /></label>
          <label>Birth date<input type="date" max={TODAY_DATE} value={form.birth_date ?? ''} onChange={(event) => updateField('birth_date', event.target.value)} required /></label>
          <label>Gender <span className="optional-label">Optional</span>
            <select value={form.gender ?? ''} onChange={(event) => updateField('gender', event.target.value)}>
              <option value="">Select gender</option>
              {form.gender && !['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'].includes(form.gender) && <option value={form.gender}>{form.gender}</option>}
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
              <option value="Other">Other</option>
            </select>
          </label>
          {contactVerification?.phone_verification_required && <label>Phone change verification code (sent to your current email)<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} required /></label>}
        </div>
        {contactVerification?.phone_verification_required && <p className="resident-contact-verification-note" role="status">Enter the code sent to your current email to confirm your phone change.</p>}
      </section>

      <section className="content-panel resident-profile-section">
        <header className="resident-profile-section-heading"><span><MapPin size={18} /></span><div><h2>Residential address</h2><p>Your address status is updated by authorized municipal staff.</p></div></header>
        <div className={`address-verification-banner status-${profile.address_verification_status.toLowerCase()}`}>
          <Clock3 size={17} /><div><strong>{verificationLabel(profile.address_verification_status)}</strong><small>{profile.verified_at ? `Last reviewed ${new Date(profile.verified_at).toLocaleString()}` : 'Your address will be reviewed after you submit it.'}</small></div>
        </div>
        <div className="resident-profile-grid">
          <label className="resident-profile-wide">Street<input maxLength={255} value={form.street ?? ''} onChange={(event) => updateField('street', event.target.value)} /></label>
          <label>Barangay<input maxLength={150} value={form.barangay ?? ''} onChange={(event) => updateField('barangay', event.target.value)} /></label>
          <label>Postal code<input maxLength={20} value={form.postal_code ?? ''} disabled /></label>
          <label>Municipality<input maxLength={150} value={form.municipality} disabled /></label>
          <label>Province<input maxLength={150} value={form.province} disabled /></label>
          <label className="resident-profile-wide">Landmark <span className="optional-label">Optional</span><input maxLength={255} value={form.landmark ?? ''} onChange={(event) => updateField('landmark', event.target.value)} /></label>
        </div>
      </section>

      <section className="content-panel resident-profile-section">
        <header className="resident-profile-section-heading"><span><Camera size={18} /></span><div><h2>Profile picture</h2><p>Upload a JPG, PNG, or WebP image, up to 5 MB.</p></div></header>
        <div className="resident-profile-photo-row">
          <ProfilePhoto user={user} name={user.name} className="resident-profile-photo" previewUrl={previewUrl} />
          <div className="resident-profile-photo-actions">
            <input ref={photoInput} className="resident-profile-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />
            <button type="button" className="button button-quiet" onClick={() => photoInput.current?.click()} disabled={photoBusy}><ImagePlus size={16} />{selectedPhoto ? 'Choose another photo' : 'Choose photo'}</button>
            {selectedPhoto && <button type="button" className="button button-primary" onClick={() => void uploadPhoto()} disabled={photoBusy}>{photoBusy ? 'Uploading…' : 'Upload photo'}</button>}
            {(user.profile_photo || selectedPhoto) && <button type="button" className="button button-quiet" onClick={() => void removePhoto()} disabled={photoBusy}><Trash2 size={15} />Remove photo</button>}
            {selectedPhoto && <small>{selectedPhoto.name}</small>}
          </div>
        </div>
      </section>

      <section className="content-panel resident-profile-section">
        <header className="resident-profile-section-heading"><span><Check size={18} /></span><div><h2>Contact preference</h2><p>Choose how municipal staff should contact you.</p></div></header>
        <label className="resident-contact-preference">Preferred contact method
          <select required value={form.preferred_contact_method ?? ''} onChange={(event) => updateField('preferred_contact_method', (event.target.value || null) as ProfileForm['preferred_contact_method'])}>
            <option value="" disabled>Select a contact preference</option>
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="Both">Both</option>
          </select>
        </label>
      </section>

          <div className="resident-profile-form-actions">
            {contactVerification?.phone_verification_required
              ? <button type="button" className="button button-quiet" onClick={cancelContactVerification}>Cancel verification</button>
              : <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>}
            <button type="submit" className="button button-primary" disabled={isSaving}>{isSaving ? (contactVerification ? 'Verifying…' : 'Saving…') : contactVerification?.phone_verification_required ? 'Verify phone change' : 'Save changes'}</button>
          </div>
        </form>}
      </div>
    </section>
    {successMessage && <SuccessModal message={successMessage} onClose={dismissSuccess} />}
  </div>, document.body)
}
