import { useState } from 'react'
import { ClipboardList, Paperclip, Search } from 'lucide-react'
import type { Category, Priority, Report, UserRole } from '../data/types'
import { PriorityBadge, StatusBadge, PageIntro } from '../components/Common'
import ReportAttachmentsPage from './ReportAttachmentsPage'

interface Props { reports: Report[]; categories: Category[]; role: UserRole; userId: number; onSelectReport: (report: Report) => void; onOpenAttachments?: () => void; initialSection?: 'reports' | 'attachments'; isLoading?: boolean }

const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export default function StaffReportWorkspace({ reports, categories, role, userId, onSelectReport, onOpenAttachments, initialSection = 'reports', isLoading = false }: Props) {
  const [activeSection, setActiveSection] = useState<'reports' | 'attachments'>(initialSection)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  const queueReports = role === 'staff'
    ? reports.filter((report) => Number(report.assignments?.at(-1)?.staff_id) === Number(userId))
    : reports
  const filtered = queueReports.filter((report) => {
    const categoryName = categories.find((category) => Number(category.id) === Number(report.category_id))?.name ?? ''
    const matchesSearch = `${report.title} ${report.reference_number} ${report.location_address} ${categoryName}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesSearch
      && (statusFilter === 'all' || report.status === statusFilter)
      && (categoryFilter === 'all' || String(report.category_id) === categoryFilter)
      && (priorityFilter === 'all' || (report.status !== 'rejected' && report.priority === priorityFilter))
  })
  const sortedReports = [...filtered].sort((left, right) => {
    if (sort === 'oldest') return Date.parse(left.submitted_at) - Date.parse(right.submitted_at)
    if (sort === 'priority') return (left.status === 'rejected' ? 4 : priorityOrder[left.priority]) - (right.status === 'rejected' ? 4 : priorityOrder[right.priority])
    return Date.parse(right.submitted_at) - Date.parse(left.submitted_at)
  })

  const isStaff = role === 'staff'
  const action = <div className="reports-page-actions"><span className="live-indicator"><i /> {isStaff ? 'Assigned queue' : 'All report queues'}</span>{role === 'admin' && onOpenAttachments && <button className="reports-attachments-button" type="button" onClick={onOpenAttachments} aria-label="Open report attachments" title="Report attachments"><Paperclip size={17} /></button>}</div>
  return <div className="page-content"><PageIntro eyebrow={isStaff ? 'OPERATIONS / REPORTS' : 'ADMINISTRATION / REPORTS'} title="Reports" description={isStaff ? 'Search and manage reports assigned to your account.' : 'Review and manage report queues across the municipality.'} action={action} />
    {isStaff && <nav className="reports-section-tabs" aria-label="Report sections">
      <button type="button" className={activeSection === 'reports' ? 'is-active' : ''} aria-current={activeSection === 'reports' ? 'page' : undefined} onClick={() => setActiveSection('reports')}><ClipboardList size={16} />Reports</button>
      <button type="button" className={activeSection === 'attachments' ? 'is-active' : ''} aria-current={activeSection === 'attachments' ? 'page' : undefined} onClick={() => setActiveSection('attachments')}><Paperclip size={16} />Attachments</button>
    </nav>}
    {isStaff && activeSection === 'attachments'
      ? <ReportAttachmentsPage reports={queueReports} categories={categories} onOpenReport={onSelectReport} isLoading={isLoading} embedded />
      : <><div className="workspace-toolbar"><div className="workspace-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, reference, address, or category" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'reopened'].map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority"><option value="all">All priorities</option>{(['urgent', 'high', 'medium', 'low'] as Priority[]).map((priority) => <option value={priority} key={priority}>{priority}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort reports"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="priority">Priority</option></select></div><section className="workspace-table-wrap"><div className="workspace-table"><div className="workspace-table-head"><span>REPORT</span><span>LOCATION</span><span>CATEGORY</span><span>ASSIGNEE</span><span>STATUS</span><span>PRIORITY</span></div>{sortedReports.map((report) => <button className="workspace-row" key={report.id} onClick={() => onSelectReport(report)}><span className="workspace-report"><strong>{report.title}</strong><small>{report.reference_number} · {new Date(report.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></span><span className="workspace-location">{report.location_address}</span><span>{categories.find((category) => Number(category.id) === Number(report.category_id))?.name ?? 'Other'}</span><span>{report.assignments?.at(-1)?.staff_name ?? <em>Unassigned</em>}</span><span><StatusBadge status={report.status} /></span><span><PriorityBadge priority={report.priority} status={report.status} /></span></button>)}{sortedReports.length === 0 && <div className="empty-state" role="status">{isLoading ? 'Loading reports…' : isStaff ? 'No assigned reports match these filters.' : 'No reports match these filters.'}</div>}</div><div className="table-footer"><span>Showing <strong>{sortedReports.length}</strong> of {queueReports.length} reports</span></div></section>
    <aside className="workspace-privacy"><span className="privacy-lock">i</span><p><strong>Internal notes stay internal.</strong> Notes marked internal are visible to municipal staff only and are never shown to residents.</p></aside></>}
  </div>
}
