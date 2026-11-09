import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Heart, MapPin, MessageCircle, Send, X } from 'lucide-react'
import { reportsService } from '../services/reports.service'
import { communityReportsService, type CommunityAttachment, type CommunityComment, type CommunityReport } from '../services/communityReports.service'
import { PageIntro } from '../components/Common'

function CommunityAttachmentPreview({ reportId, attachment, onOpen }: { reportId: number; attachment: CommunityAttachment; onOpen: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    let requested = false
    const loadAttachment = () => {
      if (requested) return
      requested = true
      reportsService.downloadAttachment(reportId, attachment.id).then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }).catch(() => {
        if (active) setError(true)
      })
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadAttachment()
        observer?.disconnect()
      }
    }, { rootMargin: '120px' })
    if (observer && containerRef.current) observer.observe(containerRef.current)
    else loadAttachment()
    return () => {
      active = false
      observer?.disconnect()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [reportId, attachment.id])

  return <div ref={containerRef} className="community-attachment-item">
    {error ? <div className="community-attachment-fallback">Attachment preview unavailable</div>
      : !url ? <div className="community-attachment-fallback" role="status">Loading attachment…</div>
        : attachment.mime_type.startsWith('image/') ? <button className="community-attachment-image" type="button" onClick={onOpen} aria-label={`Open ${attachment.original_name}`}><img src={url} alt={attachment.original_name} /></button>
          : attachment.mime_type.startsWith('video/') ? <video className="community-attachment-video" src={url} controls preload="metadata" aria-label={attachment.original_name} />
            : <a className="community-attachment-file" href={url} target="_blank" rel="noreferrer">{attachment.original_name}</a>}
  </div>
}

function CommunityReportCard({ report, onHeart, onCommentCount }: {
  report: CommunityReport
  onHeart: (reportId: number, hearted: boolean, heartCount: number) => void
  onCommentCount: (reportId: number, commentCount: number) => void
}) {
  const [heartLoading, setHeartLoading] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [comment, setComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<{ attachment: CommunityAttachment; reportId: number } | null>(null)

  async function toggleHeart() {
    if (heartLoading) return
    setHeartLoading(true)
    setError(null)
    try {
      const response = await communityReportsService.setHeart(report.id, !report.hearted_by_me)
      if (!response.success || !response.data) throw new Error(response.message || 'Could not update the heart reaction.')
      onHeart(report.id, response.data.hearted, response.data.heart_count)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update the heart reaction.')
    } finally {
      setHeartLoading(false)
    }
  }

  async function toggleComments() {
    const nextOpen = !commentsOpen
    setCommentsOpen(nextOpen)
    setError(null)
    if (!nextOpen || commentsLoaded || commentsLoading) return
    setCommentsLoading(true)
    try {
      const response = await communityReportsService.getComments(report.id)
      if (!response.success || !response.data) throw new Error(response.message || 'Could not load community comments.')
      setComments(response.data.comments)
      setCommentsLoaded(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load community comments.')
    } finally {
      setCommentsLoading(false)
    }
  }

  async function postComment() {
    const trimmed = comment.trim()
    if (!trimmed || commentLoading) return
    setCommentLoading(true)
    setError(null)
    try {
      const response = await communityReportsService.addComment(report.id, trimmed)
      if (!response.success || !response.data) throw new Error(response.message || 'Could not post your comment.')
      setComments((current) => [response.data, ...current])
      setCommentsLoaded(true)
      setComment('')
      onCommentCount(report.id, report.comment_count + 1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not post your comment.')
    } finally {
      setCommentLoading(false)
    }
  }

  return <article className="community-report-card">
    <header className="community-report-heading"><div><span className="community-report-category">{report.category_name}</span><h2>{report.title}</h2><span className="community-report-reference">{report.reference_number}{report.resolved_at ? ` · Resolved ${new Date(report.resolved_at).toLocaleDateString()}` : ''}</span></div><span className="community-resolved-badge">Resolved</span></header>
    <p className="community-report-description">{report.description}</p>
    {report.resolution_description && <section className="community-resolution"><strong>Resolution update</strong><p>{report.resolution_description}</p></section>}
    <p className="community-report-location"><MapPin size={15} />{report.location_address}</p>
    <p className="community-report-meta">Submitted {new Date(report.submitted_at).toLocaleDateString()} · Priority: {report.priority}</p>
    {report.attachments.length > 0 && <div className="community-attachments">{report.attachments.map((attachment) => <CommunityAttachmentPreview key={attachment.id} reportId={report.id} attachment={attachment} onOpen={() => setAttachmentPreview({ attachment, reportId: report.id })} />)}</div>}
    <div className="community-report-actions">
      <button className={`community-action${report.hearted_by_me ? ' is-hearted' : ''}`} type="button" onClick={() => void toggleHeart()} disabled={heartLoading} aria-pressed={report.hearted_by_me}><Heart size={17} fill={report.hearted_by_me ? 'currentColor' : 'none'} /> {report.heart_count} {report.heart_count === 1 ? 'heart' : 'hearts'}</button>
      <button className="community-action" type="button" onClick={() => void toggleComments()} aria-expanded={commentsOpen}><MessageCircle size={17} /> {report.comment_count} {report.comment_count === 1 ? 'comment' : 'comments'}</button>
    </div>
    {commentsOpen && <section className="community-comments">
      <h3>Community comments</h3>
      {commentsLoading ? <p role="status">Loading comments…</p> : comments.length ? <div className="community-comment-list">{comments.map((item) => <article className="community-comment" key={item.id}><strong>{item.author}</strong><time>{new Date(item.created_at).toLocaleString()}</time><p>{item.comment}</p></article>)}</div> : commentsLoaded ? <p className="community-no-comments">No comments yet. Start the conversation.</p> : null}
      <div className="community-comment-compose"><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={2} placeholder="Write a community comment…" disabled={commentLoading} /><button className="button button-primary button-small" type="button" onClick={() => void postComment()} disabled={!comment.trim() || commentLoading}>{commentLoading ? 'Posting…' : <><Send size={14} /> Post comment</>}</button></div>
    </section>}
    {error && <p className="community-error" role="alert">{error}</p>}
    {attachmentPreview && createPortal(<div className="community-image-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAttachmentPreview(null) }}><section className="community-image-modal" role="dialog" aria-modal="true" aria-label={attachmentPreview.attachment.original_name}><header><strong>{attachmentPreview.attachment.original_name}</strong><button className="icon-button" type="button" onClick={() => setAttachmentPreview(null)} aria-label="Close image"><X size={18} /></button></header><CommunityAttachmentModal reportId={attachmentPreview.reportId} attachment={attachmentPreview.attachment} /></section></div>, document.body)}
  </article>
}

function CommunityAttachmentModal({ reportId, attachment }: { reportId: number; attachment: CommunityAttachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    reportsService.downloadAttachment(reportId, attachment.id).then((blob) => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch((loadError: unknown) => {
      console.error('Failed to load community report attachment:', loadError)
      if (active) setError(true)
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [reportId, attachment.id])
  return error ? <p role="alert">This attachment could not be loaded.</p> : url ? attachment.mime_type.startsWith('video/') ? <video src={url} controls /> : <img src={url} alt={attachment.original_name} /> : <p role="status">Loading attachment…</p>
}

export default function CommunityReportsPage() {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ page: number; reports: CommunityReport[]; lastPage: number; total: number } | null>(null)
  const [requestState, setRequestState] = useState<{ page: number; error: string | null } | null>(null)
  const loading = requestState?.page !== page
  const reports = result?.page === page ? result.reports : []
  const lastPage = result?.page === page ? result.lastPage : 1
  const total = result?.page === page ? result.total : 0
  const error = requestState?.page === page ? requestState.error : null

  useEffect(() => {
    let active = true
    communityReportsService.list(page).then((response) => {
      if (!response.success || !response.data) throw new Error(response.message || 'Could not load resolved community reports.')
      if (!active) return
      setResult({
        page,
        reports: response.data.reports,
        lastPage: response.data.pagination.last_page,
        total: response.data.pagination.total,
      })
      setRequestState({ page, error: null })
    }).catch((requestError: unknown) => {
      if (active) setRequestState({ page, error: requestError instanceof Error ? requestError.message : 'Could not load resolved community reports.' })
    })
    return () => { active = false }
  }, [page])

  function updateReport(reportId: number, updates: Partial<Pick<CommunityReport, 'hearted_by_me' | 'heart_count' | 'comment_count'>>) {
    setResult((current) => current?.page === page
      ? { ...current, reports: current.reports.map((report) => report.id === reportId ? { ...report, ...updates } : report) }
      : current)
  }

  return <div className="page-content community-page">
    <PageIntro eyebrow="MY COMMUNITY / RESOLVED REPORTS" title="Community reports" description="Browse resolved issues, see how they were addressed, and join the conversation." />
    <section className="community-feed">
      <div className="community-feed-summary">{loading ? 'Loading resolved reports…' : `${total} resolved ${total === 1 ? 'report' : 'reports'}`}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && reports.length === 0 ? <p className="empty-state" role="status">Loading community reports…</p> : reports.map((report) => <CommunityReportCard key={report.id} report={report} onHeart={(id, hearted, heartCount) => updateReport(id, { hearted_by_me: hearted, heart_count: heartCount })} onCommentCount={(id, commentCount) => updateReport(id, { comment_count: commentCount })} />)}
      {!loading && !error && reports.length === 0 && <p className="empty-state">There are no resolved community reports yet.</p>}
      {lastPage > 1 && <nav className="community-pagination" aria-label="Community report pages"><button className="button button-quiet" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading}><ChevronLeft size={16} /> Previous</button><span>Page {page} of {lastPage}</span><button className="button button-quiet" type="button" onClick={() => setPage((current) => Math.min(lastPage, current + 1))} disabled={page === lastPage || loading}>Next <ChevronRight size={16} /></button></nav>}
    </section>
  </div>
}
