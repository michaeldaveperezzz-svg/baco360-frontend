import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, FileText, Image, Paperclip, Search, X } from 'lucide-react'
import { PageIntro, StatusBadge } from '../components/Common'
import { attachmentTypeLabel, categoryName, type Category, type Report } from '../data/types'
import { reportsService } from '../services/reports.service'

interface Props {
  reports: Report[]
  categories: Category[]
  onOpenReport: (report: Report) => void
  isLoading?: boolean
  isModal?: boolean
  embedded?: boolean
  onClose?: () => void
}

interface AttachmentPreviewProps {
  report: Report
  attachment: Report['attachments'][number]
  onClose: () => void
  onOpenReport: (report: Report) => void
}

function AttachmentPreviewModal({ report, attachment, onClose, onOpenReport }: AttachmentPreviewProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setIsLoading(true)
    setError(null)

    reportsService.downloadAttachment(report.id, attachment.id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setFileUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError('This attachment could not be previewed.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [report.id, attachment.id])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const isImage = attachment.mime_type.startsWith('image/')
  const isPdf = attachment.mime_type === 'application/pdf'

  return createPortal(<div className="attachment-modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="attachment-preview-modal" role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title">
      <header className="attachment-preview-header">
        <div><span className="eyebrow">{report.reference_number}</span><h2 id="attachment-preview-title">{attachment.original_name}</h2></div>
        <button className="icon-button" type="button" aria-label="Close attachment preview" onClick={onClose}><X size={19} /></button>
      </header>
      <div className="attachment-preview-content">
        {isLoading ? <p role="status">Loading attachment preview...</p>
          : error ? <p role="alert">{error}</p>
            : isImage && fileUrl ? <img src={fileUrl} alt={attachment.original_name} />
              : isPdf && fileUrl ? <iframe src={fileUrl} title={attachment.original_name} />
                : fileUrl ? <div className="attachment-download-preview"><FileText size={32} /><span>Preview is not available for this file type.</span><a href={fileUrl} download={attachment.original_name}>Download attachment</a></div>
                  : null}
      </div>
      <footer className="attachment-preview-footer"><span>{report.title}</span><button className="button button-primary" type="button" onClick={() => { onClose(); onOpenReport(report) }}>Open related report <ArrowUpRight size={15} /></button></footer>
    </section>
  </div>, document.body)
}

export default function ReportAttachmentsPage({ reports, categories, onOpenReport, isLoading = false, isModal = false, embedded = false, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedAttachment, setSelectedAttachment] = useState<{ report: Report; attachment: Report['attachments'][number] } | null>(null)
  const reportsWithAttachments = reports
    .map((report) => ({ ...report, attachments: report.attachments.filter((attachment) => ['report_photo', 'report_video', 'other'].includes(attachment.attachment_type)) }))
    .filter((report) => report.attachments.length > 0)
    .filter((report) => `${report.reference_number} ${report.title} ${report.location_address} ${categoryName(report.category_id, categories)} ${report.attachments.map((attachment) => attachment.original_name).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => Date.parse(right.submitted_at) - Date.parse(left.submitted_at))
  const attachmentsCount = reportsWithAttachments.reduce((total, report) => total + report.attachments.length, 0)

  useEffect(() => {
    if (!isModal || selectedAttachment) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isModal, onClose, selectedAttachment])

  const library = <>
    <div className="attachment-library-summary"><span><Paperclip size={16} /><strong>{attachmentsCount}</strong> attachments</span><span>{reportsWithAttachments.length} reports with files</span></div>
    <div className="attachment-library-toolbar"><div className="workspace-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports or attachment names" aria-label="Search report attachments" /></div></div>
    <section className="attachment-library-list">
      {isLoading ? <p className="empty-state" role="status">Loading report attachments...</p> : reportsWithAttachments.map((report) => <article className="attachment-report-group" key={report.id}>
        <div className="attachment-report-heading">
          <div><strong>{report.title}</strong><small>{report.reference_number} · {categoryName(report.category_id, categories)} · {new Date(report.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</small></div>
          <StatusBadge status={report.status} />
        </div>
        <div className="attachment-library-items">{report.attachments.map((attachment) => {
          const isImage = attachment.mime_type.startsWith('image/')
          const AttachmentIcon = isImage ? Image : FileText
          return <button className="attachment-library-item" type="button" key={attachment.id} title={`Preview ${attachment.original_name}`} onClick={() => setSelectedAttachment({ report, attachment })}>
            <span className={`attachment-library-icon ${isImage ? 'is-image' : ''}`}><AttachmentIcon size={18} /></span>
            <span className="attachment-library-copy"><strong>{attachment.original_name}</strong><small>{attachmentTypeLabel(attachment.attachment_type)} · {(attachment.file_size / 1024).toFixed(0)} KB</small></span>
            <span className="attachment-library-open">Preview</span>
          </button>
        })}</div>
      </article>)}
      {!isLoading && reportsWithAttachments.length === 0 && <p className="empty-state">No report attachments found.</p>}
    </section>
  </>

  if (isModal) {
    return createPortal(<div className="attachment-library-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.()
    }}>
      <section className="attachment-library-modal" role="dialog" aria-modal="true" aria-labelledby="attachment-library-title">
        <header className="attachment-library-modal-header">
          <div><span className="eyebrow">ADMINISTRATION / REPORTS</span><h2 id="attachment-library-title">Report attachments</h2><p>Browse files submitted with reports.</p></div>
          <button className="icon-button" type="button" aria-label="Close report attachments" onClick={onClose}><X size={19} /></button>
        </header>
        <div className="attachment-library-modal-body">{library}</div>
      </section>
      {selectedAttachment && <AttachmentPreviewModal report={selectedAttachment.report} attachment={selectedAttachment.attachment} onClose={() => setSelectedAttachment(null)} onOpenReport={(report) => {
        onClose?.()
        onOpenReport(report)
      }} />}
    </div>, document.body)
  }

  if (embedded) {
    return <>{library}{selectedAttachment && <AttachmentPreviewModal report={selectedAttachment.report} attachment={selectedAttachment.attachment} onClose={() => setSelectedAttachment(null)} onOpenReport={onOpenReport} />}</>
  }

  return <div className="page-content">
    <PageIntro eyebrow="OPERATIONS / REPORTS" title="Report attachments" description="Browse files submitted with reports and open the related report details." />
    {library}
    {selectedAttachment && <AttachmentPreviewModal report={selectedAttachment.report} attachment={selectedAttachment.attachment} onClose={() => setSelectedAttachment(null)} onOpenReport={onOpenReport} />}
  </div>
}