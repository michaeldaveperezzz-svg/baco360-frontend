import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CalendarDays, Check, Clock3, ImagePlus, MapPin, MessageSquare, Paperclip, Printer, Trash2, X } from 'lucide-react'
import type { Category, Report, ReportStatus, User } from '../data/types'
import { categoryName, statusLabel } from '../data/types'
import type { UpdateReportData } from '../services/reports.service'
import { reportsService } from '../services/reports.service'
import { PriorityBadge, StatusBadge } from '../components/Common'
import { formatPrintDateTime } from '../lib/printDateTime'

interface Props {
  report: Report
  categories: Category[]
  isStaff?: boolean
  canAssign?: boolean
  canDelete?: boolean
  staffUsers?: User[]
  onClose: () => void
  onAddComment?: (reportId: number, text: string, internal: boolean, photo?: File) => Promise<void>
  onUpdateReport?: (reportId: number, updates: UpdateReportData) => Promise<void>
  onDeleteReport?: (reportId: number) => Promise<void>
  onAssignReport?: (reportId: number, staffId: number) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The report could not be updated.'
}

export default function ReportDetailModal({
  report,
  categories,
  isStaff = false,
  canAssign = false,
  canDelete = false,
  staffUsers = [],
  onClose,
  onAddComment,
  onUpdateReport,
  onDeleteReport,
  onAssignReport,
}: Props) {
  const [comment, setComment] = useState('')
  const [commentPhoto, setCommentPhoto] = useState<File | null>(null)
  const [internal, setInternal] = useState(true)
  const [isRequestingInfo, setIsRequestingInfo] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(report.status)
  const [selectedPriority, setSelectedPriority] = useState<Report['priority']>(report.priority)
  const assignedStaffId = report.assignments?.at(-1)?.staff_id
  const [selectedStaffId, setSelectedStaffId] = useState(String(assignedStaffId ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [savingStaffFields, setSavingStaffFields] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string } | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [attachmentPreviews, setAttachmentPreviews] = useState<{
    reportId: number
    attachments: Report['attachments']
    urls: Record<number, string>
    errors: Record<number, boolean>
  } | null>(null)
  const publicComments = report.comments.filter((item) => isStaff || !item.is_internal)
  const attachmentPreviewsMatch = attachmentPreviews?.reportId === report.id
    && attachmentPreviews.attachments === report.attachments
  const attachmentUrls = attachmentPreviewsMatch ? attachmentPreviews.urls : {}
  const attachmentErrors = attachmentPreviewsMatch ? attachmentPreviews.errors : {}
  const previewableAttachments = report.attachments.filter((attachment) => attachment.mime_type.startsWith('image/') || attachment.mime_type.startsWith('video/'))
  const attachmentPreviewsReady = previewableAttachments.length === 0 || attachmentPreviewsMatch
  const hasStaffFieldChanges = selectedStatus !== report.status
    || selectedPriority !== report.priority
    || selectedStaffId !== String(assignedStaffId ?? '')

  useEffect(() => {
    let cancelled = false
    const objectUrls: string[] = []

    async function loadPreviews() {
      const urls: Record<number, string> = {}
      const errors: Record<number, boolean> = {}
      await Promise.all(previewableAttachments.map(async (attachment) => {
        try {
          const blob = await reportsService.downloadAttachment(report.id, attachment.id)
          if (cancelled) return
          const objectUrl = URL.createObjectURL(blob)
          objectUrls.push(objectUrl)
          urls[attachment.id] = objectUrl
        } catch {
          errors[attachment.id] = true
        }
      }))
      if (!cancelled) setAttachmentPreviews({ reportId: report.id, attachments: report.attachments, urls, errors })
    }

    void loadPreviews()
    return () => {
      cancelled = true
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
    }
  }, [report.id, report.attachments])

  useEffect(() => {
    if (!isPrinting) return
    const previousTitle = document.title
    document.title = `Baco360 ${report.reference_number}`
    const printTimer = window.setTimeout(() => window.print(), 100)
    const finishPrinting = () => {
      document.title = previousTitle
      setIsPrinting(false)
    }
    window.addEventListener('afterprint', finishPrinting, { once: true })
    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', finishPrinting)
      document.title = previousTitle
    }
  }, [isPrinting, report.reference_number])

  useEffect(() => {
    if (!previewAttachment) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewAttachment(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewAttachment])

  async function saveStaffFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hasReportFieldChanges = selectedStatus !== report.status || selectedPriority !== report.priority
    const assignmentChanged = selectedStaffId !== String(assignedStaffId ?? '')
    if (!hasStaffFieldChanges || (hasReportFieldChanges && !onUpdateReport) || (assignmentChanged && (!selectedStaffId || !onAssignReport))) return
    const updates: UpdateReportData = {}
    if (selectedStatus !== report.status) updates.status = selectedStatus
    if (selectedPriority !== report.priority) updates.priority = selectedPriority

    setSavingStaffFields(true)
    setError(null)
    try {
      if (hasReportFieldChanges) await onUpdateReport?.(report.id, updates)
      if (assignmentChanged) await onAssignReport?.(report.id, Number(selectedStaffId))
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setSavingStaffFields(false)
    }
  }

  async function deleteReport() {
    if (!onDeleteReport || deleting) return
    setError(null)
    setDeleting(true)
    try {
      await onDeleteReport(report.id)
      onClose()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  async function addComment() {
    if (!comment.trim() || !onAddComment || savingComment) return
    if (commentPhoto && internal) {
      setCommentError('Turn off Internal note before attaching a photo. Photos are shared with the resident.')
      return
    }
    setSavingComment(true)
    setCommentError(null)
    try {
      await onAddComment(report.id, comment.trim(), isStaff && internal, commentPhoto ?? undefined)
      setComment('')
      setCommentPhoto(null)
      setIsRequestingInfo(false)
    } catch (addError) {
      setCommentError(getErrorMessage(addError))
    } finally {
      setSavingComment(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
      <div className="modal-head">
        <span className="eyebrow">REPORT DETAILS</span>
        <div>
          <button className="icon-button" type="button" aria-label="Export or print report details" title={attachmentPreviewsReady ? 'Export or print report details' : 'Preparing report images'} onClick={() => setIsPrinting(true)} disabled={!attachmentPreviewsReady || isPrinting}><Printer size={15} /></button>
          {canDelete && <button className="icon-button" type="button" aria-label="Delete report" onClick={() => setConfirmingDelete(true)}><Trash2 size={15} /></button>}
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close report details"><X size={19} /></button>
        </div>
      </div>
      <div className="report-modal-body">
      <div className="modal-title-line">
        <div><span className="report-reference">{report.reference_number} <span>·</span> {categoryName(report.category_id, categories)}</span><h2 id="report-detail-title">{report.title}</h2></div>
        <StatusBadge status={report.status} />
      </div>
      <div className="modal-meta">
        <span><MapPin size={14} />{report.location_address}</span>
        <span><CalendarDays size={14} />Reported {new Date(report.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        <PriorityBadge priority={report.priority} status={report.status} />
      </div>

      {isStaff && <form id="staff-edit-form" className={`staff-edit-controls${canAssign ? ' staff-edit-controls--assignable' : ''}`} onSubmit={(event) => void saveStaffFields(event)}>
        <label>Status<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as ReportStatus)} disabled={savingStaffFields}>{['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'reopened'].map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
        <label>Priority<select value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value as Report['priority'])} disabled={savingStaffFields}>{['low', 'medium', 'high', 'urgent'].map((priority) => <option value={priority} key={priority}>{priority}</option>)}</select></label>
        {canAssign && <label>Assign to<select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} disabled={savingStaffFields}><option value="" disabled={Boolean(assignedStaffId)}>Unassigned</option>{staffUsers.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label>}
      </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="modal-description">{report.description}</p>

      {report.attachments.length > 0 && <div className="attachment-list">
        <h3><Paperclip size={15} /> Attachments</h3>
        <div className="attachment-grid">{report.attachments.map((attachment) => <div className="attachment-card" key={attachment.id}>{attachmentUrls[attachment.id] && attachment.mime_type.startsWith('image/') ? <button className="attachment-image-button" type="button" aria-label={`Preview ${attachment.original_name}`} onClick={() => setPreviewAttachment({ url: attachmentUrls[attachment.id], name: attachment.original_name })}><img src={attachmentUrls[attachment.id]} alt={attachment.original_name} /></button> : attachmentUrls[attachment.id] && attachment.mime_type.startsWith('video/') ? <video className="attachment-video" src={attachmentUrls[attachment.id]} controls preload="metadata" aria-label={attachment.original_name} /> : <span className="attachment-preview"><Paperclip size={17} /></span>}<span><strong>{attachment.original_name}</strong><small>{attachmentErrors[attachment.id] ? 'Preview unavailable' : `${attachment.attachment_type.replaceAll('_', ' ')} · ${(attachment.file_size / 1024).toFixed(0)} KB`}</small></span></div>)}</div>
      </div>}

      <div className="timeline-section">
        <h3><Clock3 size={15} /> Status history</h3>
        <div className="timeline">
          {report.status_history.map((entry) => <div className="timeline-entry" key={entry.id}><span className="timeline-dot" /><div><strong>{statusLabel[entry.new_status]}</strong><small>{entry.notes}</small><span>{new Date(entry.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {entry.changed_by}</span></div></div>)}
          {(report.assignments ?? []).map((assignment) => <div className="timeline-entry" key={`${assignment.staff_id}-${assignment.assigned_at}`}><span className="timeline-dot assignment-dot" /><div><strong>Assigned to {assignment.staff_name}</strong><small>{assignment.department} · {assignment.assignment_notes}</small><span>{new Date(assignment.assigned_at).toLocaleDateString()}</span></div></div>)}
        </div>
      </div>

      <div className="comments-section">
        <h3><MessageSquare size={15} /> Conversation <span>{publicComments.length}</span></h3>
        {publicComments.length === 0 ? <p className="empty-comments">No updates yet. The municipal team will post here when there’s news.</p> : publicComments.map((item) => <div className="comment-item" key={item.id}><span className="comment-avatar">{item.user_name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{item.user_name} <small>{item.is_internal ? 'Internal note' : 'Municipal staff'}</small></strong><p>{item.comment}</p>{item.attachments?.map((attachment) => attachmentUrls[attachment.id] && <figure className={`comment-photo${attachment.attachment_type === 'resolution_evidence' ? ' comment-photo--resolved' : ''}`} key={attachment.id}><img src={attachmentUrls[attachment.id]} alt={attachment.attachment_type === 'resolution_evidence' ? 'Photo showing the resolved issue' : 'Staff progress photo'} /><figcaption>{attachment.attachment_type === 'resolution_evidence' ? 'Resolution photo' : 'Progress photo'}</figcaption></figure>)}<span>{new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div></div>)}
        {onAddComment && <div className="comment-compose"><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={isRequestingInfo ? 'Ask the resident for the specific details needed...' : isStaff ? 'Add a progress note or internal handoff...' : 'Add information that may help resolve your report...'} rows={2} disabled={savingComment} />{isStaff && <div className="comment-photo-controls"><label className="button button-quiet button-small"><ImagePlus size={14} /> Add update photo<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/gif" disabled={savingComment} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) { setCommentError('Choose a JPG, PNG, or GIF photo no larger than 5 MB.'); return } setCommentError(null); setCommentPhoto(file); setInternal(false); setIsRequestingInfo(false) }} /></label>{commentPhoto && <span className="comment-photo-name">{commentPhoto.name}<button type="button" aria-label="Remove update photo" onClick={() => setCommentPhoto(null)}><X size={13} /></button></span>}</div>}<div>{isStaff && <><label className="internal-toggle"><input type="checkbox" checked={internal} onChange={(event) => { setInternal(event.target.checked); if (event.target.checked) setIsRequestingInfo(false) }} disabled={savingComment || Boolean(commentPhoto)} /> Internal note</label><button className="button button-quiet button-small" type="button" onClick={() => { setInternal(false); setIsRequestingInfo((current) => !current); setCommentError(null) }} disabled={savingComment || Boolean(commentPhoto)}>{isRequestingInfo ? 'Cancel request' : 'Request more information'}</button>{isRequestingInfo && <small className="comment-visibility-note">This message will be visible to the resident.</small>}</>}<button className="button button-small button-primary" type="button" onClick={() => void addComment()} disabled={!comment.trim() || savingComment}>{savingComment ? 'Posting...' : isStaff && isRequestingInfo ? 'Send request' : isStaff ? 'Post update' : 'Add information'}</button></div>{commentError && <p className="form-error" role="alert">{commentError}</p>}</div>}
        {isStaff && <div className="staff-edit-actions"><button className="button button-primary" type="submit" form="staff-edit-form" disabled={!hasStaffFieldChanges || savingStaffFields}>{savingStaffFields ? 'Saving...' : 'Save changes'} <Check size={15} /></button></div>}
      </div>
      </div>
    </section>
    {previewAttachment && createPortal(<div className="attachment-lightbox-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setPreviewAttachment(null)
    }}>
      <section className="attachment-lightbox" role="dialog" aria-modal="true" aria-label={`Image preview: ${previewAttachment.name}`}>
        <div className="attachment-lightbox-head"><strong>{previewAttachment.name}</strong><button className="icon-button" type="button" aria-label="Close image preview" onClick={() => setPreviewAttachment(null)}><X size={19} /></button></div>
        <img src={previewAttachment.url} alt={previewAttachment.name} />
      </section>
    </div>, document.body)}
    {isPrinting && createPortal(<main className="report-print-area">
      <header className="print-brand-header"><img src="/Baco360logo.png" alt="Baco360 logo" /><div><span>Municipality of Baco · Oriental Mindoro</span><h1>{report.title}</h1><p>{report.reference_number} · {categoryName(report.category_id, categories)}</p></div></header>
      {(() => { const dateTime = formatPrintDateTime(report.submitted_at); return <div className="report-print-summary"><span><strong>Status</strong>{statusLabel[report.status]}</span><span><strong>Priority</strong>{report.priority}</span><span><strong>Location</strong>{report.location_address}</span><span><strong>Reported</strong><time className="print-datetime"><span>{dateTime.date}</span><small>{dateTime.time}</small></time></span></div> })()}
      <section><h2>Description</h2><p>{report.description}</p></section>
      {report.attachments.length > 0 && <section><h2>Attachments</h2><div className="report-print-images">{report.attachments.map((attachment) => <figure key={attachment.id}>{attachment.mime_type.startsWith('image/') && attachmentUrls[attachment.id] ? <img src={attachmentUrls[attachment.id]} alt={attachment.original_name} /> : <p>{attachment.mime_type.startsWith('video/') ? 'Video attachment: ' : 'Preview unavailable: '}{attachment.original_name}</p>}<figcaption>{attachment.original_name}</figcaption></figure>)}</div></section>}
      <section><h2>Status history</h2>{report.status_history.length ? <ul>{report.status_history.map((entry) => { const dateTime = formatPrintDateTime(entry.changed_at); return <li key={entry.id}><strong>{statusLabel[entry.new_status]}</strong><time className="print-datetime"><span>{dateTime.date}</span><small>{dateTime.time} · {entry.changed_by}</small></time>{entry.notes ? <p>{entry.notes}</p> : null}</li> })}</ul> : <p>No status history.</p>}</section>
      {report.assignments.length > 0 && <section><h2>Assignments</h2><ul>{report.assignments.map((assignment) => { const dateTime = formatPrintDateTime(assignment.assigned_at); return <li key={`${assignment.staff_id}-${assignment.assigned_at}`}><strong>{assignment.staff_name}</strong> · {assignment.department}<time className="print-datetime"><span>{dateTime.date}</span><small>{dateTime.time}</small></time>{assignment.assignment_notes ? <p>{assignment.assignment_notes}</p> : null}</li> })}</ul></section>}
      <section><h2>Conversation</h2>{publicComments.length ? <ul>{publicComments.map((item) => { const dateTime = formatPrintDateTime(item.created_at); return <li key={item.id}><strong>{item.user_name}</strong><time className="print-datetime"><span>{dateTime.date}</span><small>{dateTime.time}</small></time><p>{item.comment}</p></li> })}</ul> : <p>No conversation updates.</p>}</section>
    </main>, document.body)}
    {confirmingDelete && createPortal(<div className="modal-backdrop delete-confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !deleting) setConfirmingDelete(false)
    }}>
      <section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-report-title" aria-describedby="delete-report-description">
        <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
        <h2 id="delete-report-title">Delete this report?</h2>
        <p id="delete-report-description">Report {report.reference_number} will be permanently deleted. This action cannot be undone.</p>
        <div className="delete-confirm-actions">
          <button type="button" className="button button-quiet" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancel</button>
          <button type="button" className="button button-delete" onClick={() => void deleteReport()} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete report'}</button>
        </div>
      </section>
    </div>, document.body)}
  </div>
}
