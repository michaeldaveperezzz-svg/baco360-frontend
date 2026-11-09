import { ArrowRight, MapPin, Paperclip } from 'lucide-react'
import { categoryName, statusLabel, type Category, type Report } from '../data/types'
import type { ReactNode } from 'react'

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="intro-action">{action}</div>}</div>
}

export function StatusBadge({ status }: { status: Report['status'] }) {
  const tone = status === 'resolved' ? 'positive' : status === 'rejected' ? 'negative' : 'active'
  return <span className={`status-badge status-${status} status-tone-${tone}`}><i />{statusLabel[status]}</span>
}

export function PriorityBadge({ priority, status }: { priority: Report['priority']; status?: Report['status'] }) {
  if (status === 'rejected') return <span className="priority-label priority-none" aria-label="No priority">—</span>
  return <span className={`priority-label priority-${priority}`}><i />{priority}</span>
}

export function ReportRow({ report, categories, onClick }: { report: Report; categories: Category[]; onClick: () => void }) {
  return <button className="report-row" onClick={onClick}><span className={`category-glyph glyph-${report.category_id}`}>{report.category_id === 1 ? '↗' : report.category_id === 2 ? '♲' : report.category_id === 3 ? '⌁' : report.category_id === 4 ? '✳' : '◈'}</span><span className="report-row-main"><strong>{report.title}</strong><span><span>{report.reference_number}</span><span className="row-separator">·</span><span>{categoryName(report.category_id, categories)}</span></span></span><span className="report-row-location"><MapPin size={13} />{report.location_address}</span><StatusBadge status={report.status} /><span className="row-date">{new Date(report.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><ArrowRight className="row-arrow" size={16} /></button>
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>
}

export function AttachmentChip({ count }: { count: number }) {
  return count > 0 ? <span className="attachment-chip"><Paperclip size={13} />{count}</span> : null
}
