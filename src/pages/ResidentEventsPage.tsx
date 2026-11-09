import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Check, Clock3, MapPin } from 'lucide-react'
import { PageIntro } from '../components/Common'
import CommunityCalendar from '../components/CommunityCalendar'
import { calendarDateKey } from '../utils/communityCalendar'
import type { Announcement, CommunityEvent } from '../data/types'
import type { Language } from '../i18n'
import { announcementsService, communityEventsService } from '../services/announcements.service'

interface Props {
  language: Language
}

export default function ResidentEventsPage({ language }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => calendarDateKey(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isTagalog = language === 'tl'

  useEffect(() => {
    let active = true
    void Promise.allSettled([
      announcementsService.getAnnouncements(),
      communityEventsService.getEvents(),
    ]).then(([announcementResult, eventResult]) => {
      if (!active) return
      const errors: string[] = []
      if (announcementResult.status === 'fulfilled' && announcementResult.value.success && announcementResult.value.data) {
        setAnnouncements(announcementResult.value.data.announcements.filter((announcement) => !announcement.archived_at))
      } else {
        errors.push(announcementResult.status === 'rejected'
          ? errorMessage(announcementResult.reason, isTagalog ? 'Hindi makuha ang mga announcement.' : 'Could not load announcements.')
          : announcementResult.value.message || (isTagalog ? 'Hindi makuha ang mga announcement.' : 'Could not load announcements.'))
      }
      if (eventResult.status === 'fulfilled' && eventResult.value.success && eventResult.value.data) {
        setEvents(eventResult.value.data.events)
      } else {
        errors.push(eventResult.status === 'rejected'
          ? errorMessage(eventResult.reason, isTagalog ? 'Hindi makuha ang mga event.' : 'Could not load events.')
          : eventResult.value.message || (isTagalog ? 'Hindi makuha ang mga event.' : 'Could not load events.'))
      }
      setError(errors.length ? errors.join(' ') : null)
      setIsLoading(false)
    })
    return () => { active = false }
  }, [isTagalog])

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
      setError(errorMessage(readError, 'Hindi namarkahang nabasa ang announcement.'))
    }
  }

  const eventDates = useMemo(() => new Set(events.map((event) => calendarDateKey(new Date(event.starts_at.replace(' ', 'T'))))), [events])
  const selectedDayEvents = useMemo(() => events
    .filter((event) => calendarDateKey(new Date(event.starts_at.replace(' ', 'T'))) === selectedDate)
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at)), [events, selectedDate])
  const sortedAnnouncements = [...announcements].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
  const dateFormatter = new Intl.DateTimeFormat(isTagalog ? 'fil-PH' : 'en-US', { dateStyle: 'full' })
  const timeFormatter = new Intl.DateTimeFormat(isTagalog ? 'fil-PH' : 'en-US', { hour: 'numeric', minute: '2-digit' })

  return <section className="page-content announcements-page resident-events-page">
    <PageIntro
      eyebrow={isTagalog ? 'MGA UPDATE SA KOMUNIDAD' : 'COMMUNITY UPDATES'}
      title={isTagalog ? 'Mga event at anunsyo' : 'Events & announcements'}
      description={isTagalog
        ? 'Mga aktibidad, konsultasyon, at mahahalagang abiso mula sa Bayan ng Baco.'
        : 'Activities, consultations, and important notices from the Municipality of Baco.'}
    />
    {error && <p className="announcement-error" role="alert">{error}</p>}
    {isLoading ? <p className="empty-state" role="status">{isTagalog ? 'Kinukuha ang mga update…' : 'Loading community updates…'}</p> : <>
      <section className="resident-events-calendar-section" aria-labelledby="resident-event-calendar-heading">
        <div className="resident-events-section-heading"><div><span className="eyebrow">{isTagalog ? 'ISKEDYUL' : 'SCHEDULE'}</span><h2 id="resident-event-calendar-heading">{isTagalog ? 'Calendar ng komunidad' : 'Community calendar'}</h2><p>{isTagalog ? 'Pumili ng petsa para makita ang mga nakatakdang event.' : 'Select a date to see its scheduled community events.'}</p></div></div>
        <div className="resident-events-calendar-layout">
          <CommunityCalendar month={month} selectedDate={selectedDate} eventDates={eventDates} language={language} onMonthChange={setMonth} onDateSelect={setSelectedDate} />
          <div className="resident-events-day-panel">
            <h3>{dateFormatter.format(new Date(`${selectedDate}T12:00:00`))}</h3>
            {selectedDayEvents.length === 0 ? <p className="resident-events-day-empty">{isTagalog ? 'Walang event sa napiling araw.' : 'No events scheduled for this day.'}</p>
              : selectedDayEvents.map((event) => <article className="resident-event-card" key={event.id}>
                <div className="resident-event-card-heading"><CalendarDays size={16} /><h4>{event.title}</h4></div>
                {event.description && <p>{event.description}</p>}
                <div className="resident-event-meta"><span><Clock3 size={13} />{timeFormatter.format(new Date(event.starts_at.replace(' ', 'T')))}{event.ends_at ? ` – ${timeFormatter.format(new Date(event.ends_at.replace(' ', 'T')))}` : ''}</span>
                  {event.location && <span><MapPin size={13} />{event.location}</span>}
                </div>
              </article>)}
          </div>
        </div>
      </section>
      <section className="resident-announcements-section" aria-labelledby="resident-announcements-heading">
        <div className="resident-events-section-heading"><div><span className="eyebrow">{isTagalog ? 'MGA PAHAYAG' : 'NOTICES'}</span><h2 id="resident-announcements-heading">{isTagalog ? 'Mga announcement' : 'Announcements'}</h2><p>{isTagalog ? 'Mga announcement na inilaan para sa iyo.' : 'Announcements shared with you.'}</p></div></div>
        {sortedAnnouncements.length === 0 ? <div className="announcement-empty"><Bell size={24} /><strong>{isTagalog ? 'Wala pang announcement' : 'No announcements yet'}</strong></div>
          : <div className="announcement-list">
            {sortedAnnouncements.map((announcement) => <article className={`announcement-card${announcement.read_at ? '' : ' is-unread'}`} key={announcement.id}>
              <div className="announcement-card-heading">
                <div><h2>{announcement.title}</h2><p>{isTagalog ? 'Mula kay' : 'From'} {announcement.author_name}</p></div>
                <div className="announcement-card-badges">
                  {!announcement.read_at && <span className="announcement-unread">{isTagalog ? 'Bago' : 'New'}</span>}
                </div>
              </div>
              <p className="announcement-message">{announcement.message}</p>
              <footer>
                <time dateTime={announcement.published_at}><CalendarDays size={14} />{new Date(announcement.published_at).toLocaleString(isTagalog ? 'fil-PH' : 'en-US')}</time>
                {!announcement.read_at && <button type="button" className="button button-quiet" onClick={() => void markAsRead(announcement)}><Check size={14} />{isTagalog ? 'Markahang nabasa' : 'Mark as read'}</button>}
              </footer>
            </article>)}
          </div>}
      </section>
    </>}
  </section>
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}
