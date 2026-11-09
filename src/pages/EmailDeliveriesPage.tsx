import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Mail, Search } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api.config'
import { apiRequest } from '../lib/api.client'

type DeliveryStatus = 'pending' | 'sent' | 'failed'

interface EmailDelivery {
  id: number
  user_id: number | null
  report_id: number | null
  event_key: string | null
  recipient: string
  subject: string
  status: DeliveryStatus
  attempts: number
  last_error: string | null
  created_at: string
  sent_at: string | null
  recipient_name: string
  reference_number: string | null
}

interface EmailDeliveriesResponse {
  deliveries: EmailDelivery[]
  summary: { total: number; sent: number; failed: number; pending: number }
  pagination: { current_page: number; per_page: number; total: number; last_page: number }
}

export default function EmailDeliveriesPage() {
  const [data, setData] = useState<EmailDeliveriesResponse | null>(null)
  const [status, setStatus] = useState<'all' | DeliveryStatus>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    const params: Record<string, string> = { page: String(page), per_page: '25' }
    if (status !== 'all') params.status = status

    void apiRequest<EmailDeliveriesResponse>({
      method: 'GET',
      url: API_ENDPOINTS.EMAIL_DELIVERIES,
      params,
    }).then((response) => {
      if (!active) return
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Could not load email delivery records.')
      }
      setData(response.data)
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load email delivery records.')
    }).finally(() => {
      if (active) setIsLoading(false)
    })

    return () => { active = false }
  }, [page, status])

  const filtered = useMemo(() => (data?.deliveries ?? []).filter((delivery) =>
    `${delivery.recipient_name} ${delivery.recipient} ${delivery.subject} ${delivery.reference_number ?? ''} ${delivery.event_key ?? ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  ), [data, query])

  return <div className="page-content email-deliveries-page">
    <header className="email-delivery-header">
      <div>
        <span className="eyebrow">ADMINISTRATION / EMAIL</span>
        <h1>Email deliveries</h1>
        <p>Monitor delivery outcomes and inspect failed messages. Sending and retry controls are not available here.</p>
      </div>
      <span className="email-delivery-readonly"><Mail size={15} /> Delivery log <i /> Read only</span>
    </header>

    <section className="email-delivery-summary" aria-label="Delivery summary">
      <article className="email-delivery-metric">
        <span className="email-delivery-metric-icon is-total"><Mail size={17} /></span>
        <span className="email-delivery-metric-label">Total deliveries</span>
        <strong>{data?.summary.total ?? '—'}</strong>
        <small>Recorded email events</small>
      </article>
      <article className="email-delivery-metric is-sent">
        <span className="email-delivery-metric-icon"><CheckCircle2 size={17} /></span>
        <span className="email-delivery-metric-label">Sent</span>
        <strong>{data?.summary.sent ?? '—'}</strong>
        <small>Accepted by mail server</small>
      </article>
      <article className="email-delivery-metric is-pending">
        <span className="email-delivery-metric-icon"><Clock3 size={17} /></span>
        <span className="email-delivery-metric-label">Pending</span>
        <strong>{data?.summary.pending ?? '—'}</strong>
        <small>Awaiting an outcome</small>
      </article>
      <article className="email-delivery-metric is-failed">
        <span className="email-delivery-metric-icon"><AlertTriangle size={17} /></span>
        <span className="email-delivery-metric-label">Failed</span>
        <strong>{data?.summary.failed ?? '—'}</strong>
        <small>Needs investigation</small>
      </article>
    </section>

    <section className="email-delivery-toolbar" aria-label="Filter deliveries">
      <label className="email-delivery-search">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search email deliveries" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipient, subject, or report" />
      </label>
      <select value={status} onChange={(event) => { setStatus(event.target.value as 'all' | DeliveryStatus); setPage(1) }} aria-label="Filter by delivery status">
        <option value="all">All statuses</option>
        <option value="sent">Sent</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>
      <span className="email-delivery-count">Showing <strong>{filtered.length}</strong> of {data?.pagination.total ?? 0}</span>
    </section>

    {error && <div className="email-delivery-alert" role="alert"><AlertTriangle size={16} /><span>{error}</span></div>}

    <section className="email-delivery-list" aria-label="Email delivery records">
      <div className="email-delivery-table-head"><span>RECIPIENT</span><span>MESSAGE</span><span>STATUS</span><span>DELIVERED / CREATED</span></div>
      {isLoading ? <div className="email-delivery-empty">Loading email records…</div>
        : filtered.map((delivery) => <article className="email-delivery-row" key={delivery.id}>
          <span className="email-delivery-recipient">
            <i>{delivery.recipient_name?.trim().charAt(0).toUpperCase() || '?'}</i>
            <span><strong>{delivery.recipient_name}</strong><small>{delivery.recipient}</small></span>
          </span>
          <span className="email-delivery-message">
            <strong>{delivery.subject}</strong>
            <small>{delivery.reference_number ?? (delivery.event_key?.startsWith('announcement:') ? 'Community announcement' : 'General notification')}</small>
          </span>
          <span className={`email-delivery-status is-${delivery.status}`}><i />{delivery.status}</span>
          <span className="email-delivery-date">
            <time dateTime={delivery.sent_at ?? delivery.created_at}>{new Date(delivery.sent_at ?? delivery.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
            <small>{delivery.attempts} {delivery.attempts === 1 ? 'attempt' : 'attempts'}</small>
          </span>
          {delivery.status === 'failed' && delivery.last_error && <p className="email-delivery-error"><AlertTriangle size={14} />{delivery.last_error}</p>}
        </article>)}
      {!isLoading && filtered.length === 0 && <div className="email-delivery-empty">No email deliveries match this filter.</div>}
      <footer className="email-delivery-footer">
        <span>Page {data?.pagination.current_page ?? page} of {data?.pagination.last_page ?? 1}</span>
        <span>
          <button type="button" className="button button-quiet" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || isLoading}><ArrowLeft size={15} />Previous</button>
          <button type="button" className="button button-quiet" onClick={() => setPage((current) => Math.min(data?.pagination.last_page ?? current, current + 1))} disabled={page >= (data?.pagination.last_page ?? 1) || isLoading}>Next<ArrowRight size={15} /></button>
        </span>
      </footer>
    </section>
  </div>
}
