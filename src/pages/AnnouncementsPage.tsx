import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Archive, Bell, CalendarDays, Megaphone, Pencil, Plus, RotateCcw, Send, Trash2, UserRound, Users, X } from 'lucide-react'
import { PageIntro } from '../components/Common'
import CommunityCalendar from '../components/CommunityCalendar'
import { calendarDateKey } from '../utils/communityCalendar'
import SuccessModal from '../components/SuccessModal'
import type { Announcement, CommunityEvent, UserRole } from '../data/types'
import type { Language } from '../i18n'
import { announcementsService, communityEventsService, type AnnouncementAudience, type AnnouncementRecipient } from '../services/announcements.service'

interface Props {
  role: UserRole
  language: Language
  currentUserId: number
}

export default function AnnouncementsPage({ role, language, currentUserId }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [recipientModalOpen, setRecipientModalOpen] = useState(false)
  const [eventCalendarOpen, setEventCalendarOpen] = useState(false)
  const [eventMonth, setEventMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedEventDate, setSelectedEventDate] = useState(() => calendarDateKey(new Date()))
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventStartsAt, setEventStartsAt] = useState(() => `${calendarDateKey(new Date())}T09:00`)
  const [eventEndsAt, setEventEndsAt] = useState('')
  const [isSavingEvent, setIsSavingEvent] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [deleteEventCandidate, setDeleteEventCandidate] = useState<number | null>(null)
  const [eventError, setEventError] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Announcement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [recipients, setRecipients] = useState<AnnouncementRecipient[]>([])
  const [audience, setAudience] = useState<AnnouncementAudience | null>(null)
  const [selectedRecipientRole, setSelectedRecipientRole] = useState<'resident' | 'staff'>(role === 'admin' ? 'resident' : 'staff')
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([])
  const [recipientLoadError, setRecipientLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const dismissSuccess = useCallback(() => setSuccessMessage(null), [])
  const isTagalog = language === 'tl'
  const canPublish = role === 'admin' || role === 'staff'

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message
    }
    return fallback
  }

  useEffect(() => {
    void loadAnnouncements()
    void loadEvents()
  }, [])

  useEffect(() => {
    if ((!recipientModalOpen && !eventCalendarOpen) || isPublishing || isSavingEvent) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRecipientModalOpen(false)
        setEventCalendarOpen(false)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [recipientModalOpen, eventCalendarOpen, isPublishing, isSavingEvent])

  useEffect(() => {
    if (!recipientModalOpen && !eventCalendarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [recipientModalOpen, eventCalendarOpen])

  const eventDates = useMemo(() => new Set(events.map((event) => calendarDateKey(new Date(`${event.starts_at.replace(' ', 'T')}`)))), [events])
  const selectedDayEvents = useMemo(() => events
    .filter((event) => calendarDateKey(new Date(event.starts_at.replace(' ', 'T'))) === selectedEventDate)
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at)), [events, selectedEventDate])

  async function loadAnnouncements() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await announcementsService.getAnnouncements()
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Hindi makuha ang mga announcement.')
      }
      setAnnouncements(response.data.announcements)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Hindi makuha ang mga announcement.'))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadEvents() {
    try {
      const response = await communityEventsService.getEvents()
      if (!response.success || !response.data) throw new Error(response.message || 'Hindi makuha ang mga event.')
      setEvents(response.data.events)
    } catch (loadError) {
      setEventError(getErrorMessage(loadError, 'Hindi makuha ang mga event.'))
    }
  }

  function selectEventDate(date: string) {
    setSelectedEventDate(date)
    const time = eventStartsAt.slice(11, 16) || '09:00'
    setEventStartsAt(`${date}T${time}`)
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEventError(null)
    setIsSavingEvent(true)
    try {
      const response = await communityEventsService.create(eventTitle.trim(), eventDescription.trim(), eventLocation.trim(), eventStartsAt, eventEndsAt)
      if (!response.success || !response.data) throw new Error(response.message || 'Hindi na-save ang event.')
      setEvents((current) => [...current, response.data.event].sort((left, right) => left.starts_at.localeCompare(right.starts_at)))
      setEventTitle('')
      setEventDescription('')
      setEventLocation('')
      setEventEndsAt('')
      setSuccessMessage(response.data.audit_warning
        ? (isTagalog
          ? 'Naidagdag ang event sa calendar ng residents, pero hindi na-save ang activity log.'
          : 'Event added to the residents’ calendar, but its activity log could not be saved.')
        : (isTagalog ? 'Naidagdag ang event sa calendar ng residents.' : 'Event added to the residents’ calendar.'))
    } catch (saveError) {
      setEventError(getErrorMessage(saveError, 'Hindi na-save ang event.'))
    } finally {
      setIsSavingEvent(false)
    }
  }

  async function deleteEvent(event: CommunityEvent) {
    setEventError(null)
    setDeletingEventId(event.id)
    try {
      const response = await communityEventsService.delete(event.id)
      if (!response.success) throw new Error(response.message || 'Hindi nabura ang event.')
      setEvents((current) => current.filter((item) => item.id !== event.id))
    } catch (deleteError) {
      setEventError(getErrorMessage(deleteError, 'Hindi nabura ang event.'))
    } finally {
      setDeletingEventId(null)
    }
  }

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (editingId !== null) {
      setIsPublishing(true)
      try {
        const response = await announcementsService.update(editingId, title.trim(), message.trim())
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Hindi na-update ang announcement.')
        }
        setTitle('')
        setMessage('')
        setEditingId(null)
        setNotice(isTagalog
          ? 'Na-update ang announcement. Hindi muling nagpadala ng email.'
          : 'Announcement updated. No email was sent again.')
        await loadAnnouncements()
      } catch (updateError) {
        setError(getErrorMessage(updateError, 'Hindi na-update ang announcement.'))
      } finally {
        setIsPublishing(false)
      }
      return
    }

    setAudience(null)
    setSelectedRecipientRole(role === 'admin' ? 'resident' : 'staff')
    setSelectedRecipientIds([])
    setRecipientLoadError(null)
    setRecipientModalOpen(true)
    setIsLoadingRecipients(true)
    try {
      const response = await announcementsService.getRecipients()
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Hindi makuha ang listahan ng recipients.')
      }
      setRecipients(response.data.recipients)
    } catch (loadError) {
      setRecipientLoadError(getErrorMessage(loadError, 'Hindi makuha ang listahan ng recipients.'))
    } finally {
      setIsLoadingRecipients(false)
    }
  }

  async function confirmPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const selectedAudience = audience
    if (!selectedAudience) {
      setRecipientLoadError(isTagalog ? 'Pumili ng audience bago mag-publish.' : 'Choose an audience before publishing.')
      return
    }
    if (selectedAudience === 'specific_users' && selectedRecipientIds.length === 0) {
      setRecipientLoadError(isTagalog ? 'Pumili ng kahit isang recipient.' : 'Select at least one recipient.')
      return
    }
    setIsPublishing(true)
    try {
      const response = await announcementsService.publish(title.trim(), message.trim(), selectedAudience, selectedAudience === 'specific_users' ? selectedRecipientIds : [])
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Hindi naipublish ang announcement.')
      }
      setTitle('')
      setMessage('')
      setRecipientModalOpen(false)
      setSuccessMessage(response.data.audit_warning
        ? (isTagalog
          ? 'Naipublish ang announcement, pero hindi na-save ang activity log. Ipaalam ito sa administrator.'
          : 'The announcement was published, but its activity log could not be saved. Please notify an administrator.')
        : (isTagalog
          ? `Naipublish para sa ${response.data.recipient_count} na recipient. Ipapadala ang email ayon sa kanilang email settings.`
          : `Published for ${response.data.recipient_count} recipient${response.data.recipient_count === 1 ? '' : 's'}. Email delivery follows their email settings.`))
      await loadAnnouncements()
    } catch (publishError) {
      setError(getErrorMessage(publishError, 'Hindi naipublish ang announcement.'))
    } finally {
      setIsPublishing(false)
    }
  }

  function toggleRecipient(recipientId: number) {
    setSelectedRecipientIds((current) => current.includes(recipientId)
      ? current.filter((id) => id !== recipientId)
      : [...current, recipientId])
    setRecipientLoadError(null)
  }

  function startEditing(announcement: Announcement) {
    setEditingId(announcement.id)
    setTitle(announcement.title)
    setMessage(announcement.message)
    setError(null)
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEditing() {
    setEditingId(null)
    setTitle('')
    setMessage('')
  }

  async function changeArchiveState(announcement: Announcement) {
    setError(null)
    setNotice(null)
    try {
      const response = announcement.archived_at
        ? await announcementsService.restore(announcement.id)
        : await announcementsService.archive(announcement.id)
      if (!response.success) {
        throw new Error(response.message || (isTagalog ? 'Hindi nabago ang archive status.' : 'Could not change archive status.'))
      }
      setNotice(announcement.archived_at
        ? (isTagalog ? 'Naibalik ang announcement.' : 'Announcement restored.')
        : (isTagalog ? 'Na-archive ang announcement. Nakatago na ito sa residents.' : 'Announcement archived. It is now hidden from residents.'))
      await loadAnnouncements()
    } catch (archiveError) {
      setError(getErrorMessage(archiveError, isTagalog ? 'Hindi nabago ang archive status.' : 'Could not change archive status.'))
    }
  }

  async function confirmDeleteAnnouncement() {
    if (!deleteCandidate || isDeleting) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      const response = await announcementsService.delete(deleteCandidate.id)
      if (!response.success || !response.data) {
        throw new Error(response.message || (isTagalog ? 'Hindi nabura ang announcement.' : 'The announcement could not be deleted.'))
      }
      setAnnouncements((current) => current.filter((item) => item.id !== deleteCandidate.id))
      if (editingId === deleteCandidate.id) cancelEditing()
      setDeleteCandidate(null)
      setSuccessMessage(response.data.audit_warning
        ? (isTagalog
          ? 'Nabura ang announcement at naalis na ito sa mga notification ng recipients, pero hindi na-save ang activity log.'
          : 'The announcement was deleted and removed from recipients’ notifications, but its activity log could not be saved.')
        : (isTagalog
          ? 'Nabura ang announcement at naalis na ito sa mga notification ng recipients.'
          : 'The announcement was deleted and removed from recipients’ notifications.'))
    } catch (deleteError) {
      setDeleteError(getErrorMessage(deleteError, isTagalog ? 'Hindi nabura ang announcement.' : 'The announcement could not be deleted.'))
    } finally {
      setIsDeleting(false)
    }
  }

  async function markAsRead(announcement: Announcement) {
    if (announcement.read_at) return
    setError(null)
    try {
      const response = await announcementsService.markRead(announcement.id)
      if (!response.success) throw new Error(response.message || 'Hindi namarkahang nabasa ang announcement.')
      setAnnouncements((current) => current.map((item) =>
        item.id === announcement.id ? { ...item, read_at: new Date().toISOString() } : item
      ))
    } catch (readError) {
      setError(getErrorMessage(readError, 'Hindi namarkahang nabasa ang announcement.'))
    }
  }

  return <section className="page-content announcements-page">
    <PageIntro
      eyebrow={isTagalog ? 'MGA UPDATE SA KOMUNIDAD' : 'COMMUNITY UPDATES'}
      title={isTagalog ? 'Mga announcement' : 'Announcements'}
      description={isTagalog
        ? 'Mga mahalagang anunsyo para sa mga resident at staff.'
        : 'Important announcements for residents and staff.'}
      action={canPublish && <button className="button button-quiet" type="button" onClick={() => { setEventError(null); setEventCalendarOpen(true) }}><CalendarDays size={15} />{isTagalog ? 'Mga event' : 'Events calendar'}</button>}
    />

    {canPublish && <form className="announcement-compose" onSubmit={(event) => void publishAnnouncement(event)}>
      <div className="announcement-compose-heading"><Megaphone size={18} /><h2>{editingId !== null
        ? (isTagalog ? 'I-edit ang announcement' : 'Edit announcement')
        : (isTagalog ? 'Gumawa ng announcement' : 'Create an announcement')}</h2></div>
      <label>
        <span>{isTagalog ? 'Pamagat' : 'Title'}</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required />
      </label>
      <label>
        <span>{isTagalog ? 'Mensahe' : 'Message'}</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={10000} rows={5} required />
      </label>
      <div className="announcement-compose-footer">
        <span>{editingId !== null
          ? (isTagalog ? 'Ang pag-edit ay hindi magpapadala ulit ng email.' : 'Editing will not send another email.')
          : (isTagalog ? 'Pumili ng recipients bago i-publish.' : 'Choose recipients before publishing.')}</span>
        <button className="button button-primary" type="submit" disabled={isPublishing || !title.trim() || !message.trim()}>
          {editingId !== null ? <Pencil size={15} /> : <Send size={15} />}{isPublishing
            ? (isTagalog ? 'Ise-save…' : 'Saving…')
            : (editingId !== null ? (isTagalog ? 'I-save ang pagbabago' : 'Save changes') : (isTagalog ? 'I-publish' : 'Publish'))}
        </button>
        {editingId !== null && <button className="button button-quiet" type="button" onClick={cancelEditing} disabled={isPublishing}><X size={15} />{isTagalog ? 'Kanselahin' : 'Cancel'}</button>}
      </div>
    </form>}

    {notice && <p className="announcement-notice" role="status">{notice}</p>}
    {error && <p className="announcement-error" role="alert">{error}</p>}
    {canPublish && <div className="announcement-list-filter">
      <span>{isTagalog ? 'Mga announcement' : 'Announcements'}</span>
      <button type="button" className={`button ${showArchived ? 'button-primary' : 'button-quiet'}`} onClick={() => setShowArchived((current) => !current)}>
        <Archive size={14} />{showArchived ? (isTagalog ? 'Itago ang naka-archive' : 'Hide archived') : (isTagalog ? 'Ipakita ang naka-archive' : 'Show archived')}
      </button>
    </div>}
    <div className="announcement-list">
      {isLoading ? <p className="empty-state">{isTagalog ? 'Kinukuha ang mga announcement…' : 'Loading announcements…'}</p>
        : announcements.filter((announcement) => showArchived || !announcement.archived_at).length === 0 ? <div className="announcement-empty"><Bell size={24} /><strong>{isTagalog ? 'Wala pang announcement' : 'No announcements yet'}</strong></div>
          : announcements.filter((announcement) => showArchived || !announcement.archived_at).map((announcement) => <article className={`announcement-card${announcement.read_at ? '' : ' is-unread'}${announcement.archived_at ? ' is-archived' : ''}`} key={announcement.id}>
            <div className="announcement-card-heading">
              <div><h2>{announcement.title}</h2><p>{isTagalog ? 'Mula kay' : 'From'} {announcement.author_name}</p></div>
              <div className="announcement-card-badges">
                {announcement.archived_at && <span className="announcement-archived">{isTagalog ? 'Naka-archive' : 'Archived'}</span>}
              {!announcement.read_at && <span className="announcement-unread">{isTagalog ? 'Bago' : 'New'}</span>}
              </div>
            </div>
            <p className="announcement-message">{announcement.message}</p>
            <footer>
              <time dateTime={announcement.published_at}>{new Date(announcement.published_at).toLocaleString(isTagalog ? 'fil-PH' : 'en-US')}</time>
              <div className="announcement-card-actions">
                {!announcement.read_at && <button type="button" className="button button-quiet" onClick={() => void markAsRead(announcement)}>{isTagalog ? 'Markahang nabasa' : 'Mark as read'}</button>}
                {canPublish && <>{!announcement.archived_at && <button type="button" className="button button-quiet" onClick={() => startEditing(announcement)}><Pencil size={13} />{isTagalog ? 'I-edit' : 'Edit'}</button>}
                  <button type="button" className="button button-quiet" onClick={() => void changeArchiveState(announcement)}>
                    {announcement.archived_at ? <RotateCcw size={13} /> : <Archive size={13} />}
                    {announcement.archived_at ? (isTagalog ? 'Ibalik' : 'Restore') : (isTagalog ? 'I-archive' : 'Archive')}
                  </button>
                  {(role === 'admin' || Number(announcement.created_by) === Number(currentUserId)) && <button type="button" className="button button-quiet" onClick={() => { setDeleteError(null); setDeleteCandidate(announcement) }}><Trash2 size={13} />{isTagalog ? 'Burahin' : 'Delete'}</button>}
                </>}
              </div>
            </footer>
          </article>)}
    </div>
    {eventCalendarOpen && createPortal(<div className="announcement-recipient-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSavingEvent) setEventCalendarOpen(false)
    }}>
      <section className="event-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="event-calendar-title">
        <header>
          <div><span className="eyebrow">{isTagalog ? 'MGA GAWAIN SA KOMUNIDAD' : 'COMMUNITY SCHEDULE'}</span><h2 id="event-calendar-title">{isTagalog ? 'Calendar ng mga event' : 'Events calendar'}</h2><p>{isTagalog ? 'Pumili ng petsa at idagdag ang detalye ng event.' : 'Choose a date and add event details for residents.'}</p></div>
          <button className="icon-button" type="button" aria-label={isTagalog ? 'Isara' : 'Close'} onClick={() => setEventCalendarOpen(false)} disabled={isSavingEvent}><X size={19} /></button>
        </header>
        <div className="event-calendar-modal-content">
          <CommunityCalendar month={eventMonth} selectedDate={selectedEventDate} eventDates={eventDates} language={language} onMonthChange={setEventMonth} onDateSelect={selectEventDate} />
          <div className="event-calendar-editor">
            <h3>{isTagalog ? 'Bagong event' : 'Add an event'}</h3>
            <form onSubmit={(event) => void saveEvent(event)}>
              <label><span>{isTagalog ? 'Pamagat' : 'Event title'}</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={255} required /></label>
              <label><span>{isTagalog ? 'Paglalarawan' : 'Description'}</span><textarea value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} maxLength={5000} rows={3} /></label>
              <label><span>{isTagalog ? 'Lugar' : 'Location'}</span><input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} maxLength={255} /></label>
              <label><span>{isTagalog ? 'Simula' : 'Starts'}</span><input type="datetime-local" value={eventStartsAt} onChange={(event) => { setEventStartsAt(event.target.value); if (event.target.value) setSelectedEventDate(event.target.value.slice(0, 10)) }} required /></label>
              <label><span>{isTagalog ? 'Katapusan (opsyonal)' : 'Ends (optional)'}</span><input type="datetime-local" value={eventEndsAt} min={eventStartsAt} onChange={(event) => setEventEndsAt(event.target.value)} /></label>
              {eventError && <p className="announcement-error" role="alert">{eventError}</p>}
              <button className="button button-primary" type="submit" disabled={isSavingEvent || !eventTitle.trim()}><Plus size={15} />{isSavingEvent ? (isTagalog ? 'Sine-save…' : 'Saving…') : (isTagalog ? 'Idagdag sa calendar' : 'Add to calendar')}</button>
            </form>
            <section className="event-day-list" aria-label={isTagalog ? 'Mga event sa napiling araw' : 'Events on selected day'}>
              <h4>{isTagalog ? 'Naka-iskedyul sa araw na ito' : 'Scheduled for this day'}</h4>
              {selectedDayEvents.length === 0 ? <p>{isTagalog ? 'Wala pang event sa araw na ito.' : 'No events on this day yet.'}</p> : selectedDayEvents.map((item) => <article key={item.id}>
                <div><strong>{item.title}</strong><small>{new Date(item.starts_at.replace(' ', 'T')).toLocaleTimeString(isTagalog ? 'fil-PH' : 'en-US', { hour: 'numeric', minute: '2-digit' })}{item.location ? ` · ${item.location}` : ''}</small></div>
                {(role === 'admin' || item.created_by === currentUserId) && (deleteEventCandidate === item.id
                  ? <div className="event-delete-confirmation" role="group" aria-label={isTagalog ? `Kumpirmahin ang pagbura sa ${item.title}` : `Confirm deleting ${item.title}`}>
                    <span>{isTagalog ? 'Burahin?' : 'Delete?'}</span>
                    <button className="button button-delete" type="button" disabled={deletingEventId === item.id} onClick={() => void deleteEvent(item)}>{deletingEventId === item.id ? (isTagalog ? 'Binubura…' : 'Deleting…') : (isTagalog ? 'Oo' : 'Yes')}</button>
                    <button className="button button-quiet" type="button" disabled={deletingEventId === item.id} onClick={() => setDeleteEventCandidate(null)}>{isTagalog ? 'Hindi' : 'No'}</button>
                  </div>
                  : <button className="icon-button" type="button" aria-label={`${isTagalog ? 'Burahin' : 'Delete'} ${item.title}`} onClick={() => setDeleteEventCandidate(item.id)}><Trash2 size={14} /></button>)}
              </article>)}
            </section>
          </div>
        </div>
      </section>
    </div>, document.body)}
    {recipientModalOpen && createPortal(<div className="announcement-recipient-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPublishing) setRecipientModalOpen(false)
    }}>
          <section className="announcement-recipient-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-recipient-title">
            <header>
              <div><span className="eyebrow">{isTagalog ? 'MGA TATANGGAP' : 'ANNOUNCEMENT DELIVERY'}</span><h2 id="announcement-recipient-title">{isTagalog ? 'Pumili ng recipients' : 'Choose recipients'}</h2><p>{isTagalog ? 'Sino ang makakakita at makakatanggap ng announcement na ito?' : 'Who should see and receive this announcement?'}</p></div>
              <button className="icon-button" type="button" aria-label={isTagalog ? 'Isara' : 'Close'} onClick={() => setRecipientModalOpen(false)} disabled={isPublishing}><X size={19} /></button>
            </header>
            <form onSubmit={(event) => void confirmPublish(event)}>
              <fieldset className="announcement-audience-options">
                <legend>{isTagalog ? 'Saklaw ng audience' : 'Audience'}</legend>
                <label className={audience === 'all_staff' ? 'is-selected' : ''}>
                  <input type="radio" name="announcement-audience" value="all_staff" checked={audience === 'all_staff'} onChange={() => { setAudience('all_staff'); setRecipientLoadError(null) }} />
                  <Users size={17} /><span><strong>{isTagalog ? 'Lahat ng active staff' : 'All active staff'}</strong><small>{isTagalog ? 'Lahat ng aktibong staff account' : 'Every active staff account'}</small></span>
                </label>
                {role === 'admin' && <label className={audience === 'all_residents' ? 'is-selected' : ''}>
                  <input type="radio" name="announcement-audience" value="all_residents" checked={audience === 'all_residents'} onChange={() => { setAudience('all_residents'); setRecipientLoadError(null) }} />
                  <UserRound size={17} /><span><strong>{isTagalog ? 'Lahat ng active resident' : 'All active residents'}</strong><small>{isTagalog ? 'Lahat ng aktibong resident account' : 'Every active resident account'}</small></span>
                </label>}
                <label className={audience === 'specific_users' ? 'is-selected' : ''}>
                  <input type="radio" name="announcement-audience" value="specific_users" checked={audience === 'specific_users'} onChange={() => { setAudience('specific_users'); setRecipientLoadError(null) }} />
                  <UserRound size={17} /><span><strong>{role === 'staff' ? (isTagalog ? 'Pumili ng specific staff' : 'Select specific staff') : (isTagalog ? 'Pumili ng specific users' : 'Select specific users')}</strong><small>{isTagalog ? 'Pumili ng indibidwal na tatanggap' : 'Choose individual recipients'}</small></span>
                </label>
              </fieldset>
              {audience === 'specific_users' && <section className="announcement-recipient-selection" aria-label={isTagalog ? 'Pumili ng users' : 'Select users'}>
                {role === 'admin' && <div className="announcement-recipient-role-filter">
                  <button type="button" className={selectedRecipientRole === 'resident' ? 'is-selected' : ''} onClick={() => setSelectedRecipientRole('resident')}>{isTagalog ? 'Mga resident' : 'Residents'}</button>
                  <button type="button" className={selectedRecipientRole === 'staff' ? 'is-selected' : ''} onClick={() => setSelectedRecipientRole('staff')}>{isTagalog ? 'Mga staff' : 'Staff'}</button>
                </div>}
                <div className="announcement-recipient-list">
                  {isLoadingRecipients ? <p role="status">{isTagalog ? 'Kinukuha ang listahan…' : 'Loading recipients…'}</p>
                    : recipients.filter((recipient) => recipient.role === selectedRecipientRole).map((recipient) => <label key={recipient.id} className={selectedRecipientIds.includes(recipient.id) ? 'is-selected' : ''}>
                      <input type="checkbox" checked={selectedRecipientIds.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} />
                      <span>{recipient.name}</span>
                    </label>)}
                  {!isLoadingRecipients && recipients.every((recipient) => recipient.role !== selectedRecipientRole) && <p>{isTagalog ? 'Walang active na user sa role na ito.' : `No active ${selectedRecipientRole} accounts found.`}</p>}
                </div>
                <small className="announcement-recipient-count">{isTagalog ? `${selectedRecipientIds.length} ang napili` : `${selectedRecipientIds.length} selected`}</small>
              </section>}
              {recipientLoadError && <p className="announcement-error" role="alert">{recipientLoadError}</p>}
              <footer>
                <button type="button" className="button button-quiet" onClick={() => setRecipientModalOpen(false)} disabled={isPublishing}>{isTagalog ? 'Kanselahin' : 'Cancel'}</button>
                <button type="submit" className="button button-primary" disabled={isLoadingRecipients || isPublishing || !audience || audience === 'specific_users' && selectedRecipientIds.length === 0}>
                  <Send size={15} />{isPublishing ? (isTagalog ? 'Ipinapadala…' : 'Publishing…') : (isTagalog ? 'I-publish' : 'Publish announcement')}
                </button>
              </footer>
            </form>
          </section>
    </div>, document.body)}
    {deleteCandidate && createPortal(<div className="modal-backdrop delete-confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isDeleting) setDeleteCandidate(null)
    }}>
      <section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-announcement-title" aria-describedby="delete-announcement-description">
        <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
        <h2 id="delete-announcement-title">{isTagalog ? 'Burahin ang announcement?' : 'Delete this announcement?'}</h2>
        <p id="delete-announcement-description">{isTagalog
          ? `Permanenteng mabubura ang “${deleteCandidate.title}” at mawawala ito sa notifications ng lahat ng recipients. Hindi ito maa-undo.`
          : `“${deleteCandidate.title}” will be permanently deleted and removed from all recipients’ notifications. This cannot be undone.`}</p>
        {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
        <div className="delete-confirm-actions">
          <button type="button" className="button button-quiet" onClick={() => setDeleteCandidate(null)} disabled={isDeleting}>{isTagalog ? 'Kanselahin' : 'Cancel'}</button>
          <button type="button" className="button button-delete" onClick={() => void confirmDeleteAnnouncement()} disabled={isDeleting}>{isDeleting ? (isTagalog ? 'Binubura…' : 'Deleting…') : (isTagalog ? 'Burahin ang announcement' : 'Delete announcement')}</button>
        </div>
      </section>
    </div>, document.body)}
    {successMessage && createPortal(
      <SuccessModal message={successMessage} onClose={dismissSuccess} />,
      document.body
    )}
  </section>
}
