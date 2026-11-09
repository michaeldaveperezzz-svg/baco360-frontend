import { lazy, Suspense, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, Check, ImagePlus, LoaderCircle, MapPin, Paperclip, Search, X } from 'lucide-react'
import type { Category } from '../data/types'
import { PageIntro } from '../components/Common'
import type { SubmitReportData } from '../services/reports.service'

const LocationPicker = lazy(() => import('../components/LocationPicker'))

interface GeocodingResult {
  lat: string
  lon: string
  display_name: string
  place_id: number
}

interface ReverseGeocodingResult {
  display_name: string
}

interface Props { 
  categories: Category[]
  onSubmit: (report: SubmitReportData) => Promise<{ referenceNumber: string; attachmentWarning?: string }>
  onCancel: () => void 
}

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Report submission failed. Please try again.'
}

export default function SubmitReportPage({ categories, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState(13.3551)
  const [longitude, setLongitude] = useState(121.0992)
  const [files, setFiles] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [reference, setReference] = useState('')
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([])
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const locationRequestIdRef = useRef(0)
  const nextGeocodingRequestAtRef = useRef(0)
  const activeCategories = categories.filter((category) => category.is_active)

  async function requestGeocoding(url: string, requestId: number) {
    const scheduledAt = Math.max(Date.now(), nextGeocodingRequestAtRef.current)
    nextGeocodingRequestAtRef.current = scheduledAt + 1100
    const delay = scheduledAt - Date.now()
    if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay))
    if (requestId !== locationRequestIdRef.current) return null

    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Location lookup failed (${response.status}). Please try again.`)
    return response
  }

  function handleAddressChange(value: string) {
    locationRequestIdRef.current += 1
    setAddress(value)
    setLocationResults([])
    setIsLocationConfirmed(false)
    setIsLocating(false)
    setLocationError(null)
  }

  async function searchAddress() {
    const searchTerm = address.trim()
    if (!searchTerm) {
      setLocationError('Enter an address, barangay, or landmark to search.')
      return
    }

    const requestId = ++locationRequestIdRef.current
    setIsLocating(true)
    setLocationError(null)
    setLocationResults([])
    setIsLocationConfirmed(false)
    const normalizedSearchTerm = searchTerm.replace(/^(?:barangay|brgy\.?)\s+/i, '').trim()
    const query = /baco|oriental mindoro/i.test(normalizedSearchTerm)
      ? normalizedSearchTerm
      : `${normalizedSearchTerm}, Baco, Oriental Mindoro, Philippines`
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ph',
      viewbox: '120.55,13.75,121.65,12.95',
    })

    try {
      const response = await requestGeocoding(`https://nominatim.openstreetmap.org/search?${params}`, requestId)
      if (!response) return
      const results = await response.json() as GeocodingResult[]
      if (requestId !== locationRequestIdRef.current) return
      if (results.length === 0) {
        setLocationError('No matching places found. Try a more specific street, barangay, or landmark in Baco.')
        return
      }
      setLocationResults(results)
    } catch (error) {
      if (requestId === locationRequestIdRef.current) {
        setLocationError(error instanceof Error ? error.message : 'Location search failed. Please try again.')
      }
    } finally {
      if (requestId === locationRequestIdRef.current) setIsLocating(false)
    }
  }

  function chooseLocation(result: GeocodingResult) {
    const nextLatitude = Number(result.lat)
    const nextLongitude = Number(result.lon)
    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) {
      setLocationError('The location service returned invalid coordinates. Please search again.')
      setLocationResults([])
      return
    }

    locationRequestIdRef.current += 1
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
    setAddress(result.display_name.slice(0, 255))
    setLocationResults([])
    setIsLocationConfirmed(true)
    setLocationError(null)
  }

  async function updateAddressFromPin(nextLatitude: number, nextLongitude: number) {
    const requestId = ++locationRequestIdRef.current
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
    setAddress('')
    setLocationResults([])
    setIsLocationConfirmed(false)
    setIsLocating(true)
    setLocationError(null)
    const params = new URLSearchParams({
      lat: String(nextLatitude),
      lon: String(nextLongitude),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
    })

    try {
      const response = await requestGeocoding(`https://nominatim.openstreetmap.org/reverse?${params}`, requestId)
      if (!response) return
      const result = await response.json() as ReverseGeocodingResult
      if (requestId !== locationRequestIdRef.current) return
      if (!result.display_name) throw new Error('No address was found for this pin. Search for a nearby place instead.')
      setAddress(result.display_name.slice(0, 255))
      setIsLocationConfirmed(true)
    } catch (error) {
      if (requestId === locationRequestIdRef.current) {
        setLocationError(error instanceof Error ? error.message : 'Address lookup failed. Search for a nearby place instead.')
      }
    } finally {
      if (requestId === locationRequestIdRef.current) setIsLocating(false)
    }
  }

  function handleAddressKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (locationResults.length > 0) chooseLocation(locationResults[0])
      else void searchAddress()
    } else if (event.key === 'Escape') {
      setLocationResults([])
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    if (!isLocationConfirmed) {
      setErrorMessage('Search for the location and choose the correct result before submitting.')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await onSubmit({ category_id: Number(categoryId), title, description, location_address: address, latitude, longitude, priority: 'medium', attachments: files })
      setReference(result.referenceNumber)
      setAttachmentWarning(result.attachmentWarning ?? null)
      setSubmitted(true)
    } catch (err) {
      setErrorMessage(getSubmitErrorMessage(err))
    } finally { setIsSubmitting(false) }
  }
  if (submitted) return <div className="page-content"><section className="success-panel"><div className="success-mark"><Check size={30} /></div><span className="eyebrow">REPORT RECEIVED</span><h1>Thanks for looking out.</h1><p>Your report is in the municipality’s queue. We’ll send updates to your notification preferences as the team reviews it.</p>{attachmentWarning && <p className="form-error" role="alert">{attachmentWarning}</p>}<div className="success-reference">Reference number <strong>{reference}</strong></div><button className="button button-primary" onClick={onCancel}>Back to your overview <ArrowLeft size={16} /></button></section></div>
  return <div className="page-content form-page"><button className="back-link" onClick={onCancel}><ArrowLeft size={15} /> Back to overview</button><PageIntro eyebrow="COMMUNITY REPORT" title="Tell us what needs attention." description="Share a few details and the right municipal team will take it from here." />
    <form className="report-form" onSubmit={handleSubmit}><div className="form-main"><section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>What’s the issue?</h2><p>Give your report a clear title and choose a category.</p></div></div><label className="field-label">Report title <span>Required</span><input required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Large pothole near the school crossing" /></label><label className="field-label">Issue category <span>Required</span><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Choose a category</option>{activeCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label className="field-label">Description <span>Required</span><textarea required minLength={20} maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What did you notice? Include details that could help the municipal team understand the issue." /><small className="field-hint">{description.length}/2,000 characters</small></label></section>
      <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Where is it?</h2><p>Search by street, barangay, or landmark, or place the pin on the map.</p></div></div><label className="field-label">Street address, barangay, or landmark <span>Required</span><div className="location-search-control"><div className="input-with-icon"><MapPin size={17} /><input required maxLength={255} value={address} onChange={(event) => handleAddressChange(event.target.value)} onKeyDown={handleAddressKeyDown} placeholder="e.g. Brgy. San Andres or a landmark in Baco" aria-expanded={locationResults.length > 0} aria-controls="location-search-results" /><button type="button" title="Search for this place" aria-label="Search for this place" disabled={isLocating || !address.trim()} onClick={() => void searchAddress()}>{isLocating ? <LoaderCircle size={16} className="location-search-spinner" /> : <Search size={16} />}</button></div>{locationResults.length > 0 && <div className="location-search-results" id="location-search-results" role="listbox" aria-label="Matching places">{locationResults.map((result) => <button className="location-search-result" type="button" role="option" aria-selected="false" key={result.place_id} onClick={() => chooseLocation(result)}><MapPin size={15} /><span>{result.display_name}</span></button>)}</div>}</div></label>{locationError && <p className="location-message location-message-error" role="alert">{locationError}</p>}{isLocating && <p className="location-message" role="status">Finding address…</p>}<Suspense fallback={<div className="location-map location-map-loading">Loading map…</div>}><LocationPicker latitude={latitude} longitude={longitude} onLocationChange={(nextLatitude, nextLongitude) => { void updateAddressFromPin(nextLatitude, nextLongitude) }} /></Suspense><div className="location-confirm"><span className="location-pin"><MapPin size={16} /></span><span><strong>Selected location</strong><small>{isLocationConfirmed ? 'Address and coordinates are ready' : 'Search for a place or set a pin and confirm its address'}</small></span><span className="location-coordinates">{latitude.toFixed(5)}° N<br />{longitude.toFixed(5)}° E</span></div></section>
      <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Add photos or video <small>Optional</small></h2><p>Photos and short videos give the municipal team helpful context.</p></div></div><button className="upload-zone" type="button" onClick={() => inputRef.current?.click()}><ImagePlus size={22} /><strong>Choose media to upload</strong><span>JPG, PNG, GIF, MP4, MOV or WebM · photos up to 5 MB, videos up to 50 MB · 5 files maximum</span></button><input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm" multiple onChange={(event) => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; const imageTypes = ['image/jpeg', 'image/png', 'image/gif']; const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm']; if (files.length + selected.length > 5) { setErrorMessage('You can attach up to 5 files.'); return } if (selected.some((file) => (imageTypes.includes(file.type) && file.size > 5 * 1024 * 1024) || (videoTypes.includes(file.type) && file.size > 50 * 1024 * 1024) || (!imageTypes.includes(file.type) && !videoTypes.includes(file.type)))) { setErrorMessage('Choose JPG, PNG, GIF, MP4, MOV or WebM files within the listed size limits.'); return } setErrorMessage(null); setFiles((current) => [...current, ...selected]) }} />{files.length > 0 && <div className="file-list">{files.map((file, index) => <span key={`${file.name}-${index}`}><Paperclip size={14} />{file.name}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><X size={14} /></button></span>)}</div>}</section>
      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}<div className="form-submit-row"><p>Submitting means municipal staff may contact you about this issue.</p><button className="button button-primary" type="submit" disabled={isSubmitting || isLocating}>{isSubmitting ? 'Submitting…' : isLocating ? 'Finding location…' : 'Submit report'} {!isSubmitting && !isLocating && <ArrowLeft className="submit-arrow" size={16} />}</button></div></div>
      <aside className="form-aside"><div className="aside-note"><span className="aside-note-mark">i</span><h3>What happens next?</h3><ol><li><span>1</span><p><strong>We’ll review it</strong><small>A municipal team checks the details and location.</small></p></li><li><span>2</span><p><strong>It gets assigned</strong><small>The right department takes ownership.</small></p></li><li><span>3</span><p><strong>You’ll get updates</strong><small>Track progress from your report list.</small></p></li></ol></div><div className="privacy-note"><strong>Your information is protected</strong><p>Your contact details are only shared with the municipal team responsible for resolving this report.</p></div></aside></form></div>
}
