import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Clock3, MapPin, RotateCw, X } from 'lucide-react'
import SuccessModal from '../components/SuccessModal'
import type { AddressVerificationStatus } from '../data/types'
import { userService, type ResidentVerificationRecord } from '../services/user.service'

type StatusFilter = 'All' | AddressVerificationStatus

const filters: StatusFilter[] = ['All', 'Pending', 'Verified', 'Rejected']

export default function ResidentAddressReviewPage() {
  const [filter, setFilter] = useState<StatusFilter>('Pending')
  const [profiles, setProfiles] = useState<ResidentVerificationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyProfileId, setBusyProfileId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const dismissSuccess = useCallback(() => setSuccessMessage(''), [])

  const loadProfiles = useCallback(async () => {
    try {
      const response = await userService.getResidentProfilesForReview(filter === 'All' ? undefined : filter)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load address submissions.')
      setProfiles(response.data.profiles)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load address submissions.')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  function refreshProfiles() {
    setIsLoading(true)
    void loadProfiles()
  }

  async function review(profile: ResidentVerificationRecord, status: 'Verified' | 'Rejected') {
    setBusyProfileId(profile.id)
    setError('')
    setSuccessMessage('')
    try {
      const response = await userService.updateAddressVerification(profile.id, status)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to update address verification.')
      setProfiles((current) => filter === 'All'
        ? current.map((item) => item.id === profile.id ? response.data : item)
        : current.filter((item) => item.id !== profile.id))
      setSuccessMessage(`${profile.name}'s address was marked ${status.toLowerCase()}.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update address verification.')
    } finally {
      setBusyProfileId(null)
    }
  }

  return <div className="page-content address-review-page">
    <div className="resident-profile-heading">
      <div><span className="eyebrow">RESIDENT SERVICES</span><h1>Address verification</h1><p>Review submitted resident addresses and record a verification decision.</p></div>
      <button className="button button-quiet" type="button" onClick={refreshProfiles} disabled={isLoading}><RotateCw size={15} /> Refresh</button>
    </div>

    {error && <p className="resident-profile-message is-error" role="alert">{error}</p>}
    <section className="content-panel address-review-panel">
      <div className="address-review-toolbar">
        <div><h2>Resident submissions</h2><p>{isLoading ? 'Loading submissions…' : `${profiles.length} submission${profiles.length === 1 ? '' : 's'}`}</p></div>
        <label>Filter by status<select value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}>{filters.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      </div>
      {isLoading && <p className="empty-state" role="status">Loading resident addresses…</p>}
      {!isLoading && !error && profiles.length === 0 && <p className="empty-state" role="status">No resident address submissions match this filter.</p>}
      {!isLoading && profiles.length > 0 && <div className="address-review-list">
        {profiles.map((profile) => <article className="address-review-card" key={profile.id}>
          <div className="address-review-card-heading"><div><strong>{profile.name}</strong><span>{profile.email}{profile.phone ? ` · ${profile.phone}` : ''}</span></div><span className={`address-review-status status-${profile.address_verification_status.toLowerCase()}`}><Clock3 size={14} />{profile.address_verification_status}</span></div>
          <div className="address-review-address"><MapPin size={16} /><p>{[profile.street, profile.barangay, profile.municipality, profile.province, profile.postal_code].filter(Boolean).join(', ') || 'Address details not provided'}{profile.landmark ? <><br /><small>Landmark: {profile.landmark}</small></> : null}</p></div>
          {profile.verified_at && <p className="address-review-meta">Reviewed by {profile.verified_by_name || 'authorized staff'} · {new Date(profile.verified_at).toLocaleString()}</p>}
          <div className="address-review-actions">
            <button type="button" className="button button-primary" disabled={busyProfileId === profile.id || profile.address_verification_status === 'Verified'} onClick={() => void review(profile, 'Verified')}><Check size={15} />Verify</button>
            <button type="button" className="button button-quiet address-reject-button" disabled={busyProfileId === profile.id || profile.address_verification_status === 'Rejected'} onClick={() => void review(profile, 'Rejected')}><X size={15} />Reject</button>
          </div>
        </article>)}
      </div>}
    </section>
    {successMessage && createPortal(<SuccessModal message={successMessage} onClose={dismissSuccess} />, document.body)}
  </div>
}
