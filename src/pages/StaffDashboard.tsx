import { ArrowUpRight, ClipboardCheck, Clock3, MapPin, ShieldAlert, Sparkles } from 'lucide-react'
import type { Category, Report } from '../data/types'
import { PriorityBadge, StatusBadge, PageIntro, SectionHeading } from '../components/Common'

interface Props { reports: Report[]; categories: Category[]; userId: number; onSelectReport: (report: Report) => void; onOpenWorkspace: () => void; isLoading?: boolean }

export default function StaffDashboard({ reports, categories, userId, onSelectReport, onOpenWorkspace, isLoading = false }: Props) {
  const assignedReports = reports.filter((report) => Number(report.assignments?.at(-1)?.staff_id) === Number(userId))
  const active = assignedReports.filter((report) => !['resolved', 'rejected'].includes(report.status))
  const urgent = active.filter((report) => report.priority === 'urgent' || report.priority === 'high').sort((left, right) => {
    const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityRank[left.priority] - priorityRank[right.priority] || Date.parse(left.submitted_at) - Date.parse(right.submitted_at)
  })
  const inProgress = assignedReports.filter((report) => report.status === 'in_progress').length
  const resolved = assignedReports.filter((report) => report.status === 'resolved').length
  const recent = [...assignedReports].sort((left, right) => {
    const leftAssigned = left.assignments?.at(-1)?.assigned_at ?? left.submitted_at
    const rightAssigned = right.assignments?.at(-1)?.assigned_at ?? right.submitted_at
    return Date.parse(rightAssigned) - Date.parse(leftAssigned)
  }).slice(0, 4)
  const statusCounts = [
    { status: 'submitted' as const, count: assignedReports.filter((report) => report.status === 'submitted').length },
    { status: 'under_review' as const, count: assignedReports.filter((report) => report.status === 'under_review').length },
    { status: 'assigned' as const, count: assignedReports.filter((report) => report.status === 'assigned').length },
    { status: 'in_progress' as const, count: inProgress },
    { status: 'resolved' as const, count: resolved },
    { status: 'reopened' as const, count: assignedReports.filter((report) => report.status === 'reopened').length },
    { status: 'rejected' as const, count: assignedReports.filter((report) => report.status === 'rejected').length },
  ]

  return <div className="page-content"><PageIntro eyebrow="OPERATIONS / MY ASSIGNMENTS" title="Operations overview" description="Reports assigned to you, with the highest priorities first." action={<button className="button button-primary" onClick={onOpenWorkspace}>Open workspace <ArrowUpRight size={15} /></button>} />
    <div className="metric-grid staff-metrics"><article className="metric-card"><span className="metric-icon metric-blue"><ClipboardCheck size={18} /></span><span className="metric-label">Assigned reports</span><strong>{isLoading ? '—' : assignedReports.length}</strong><small>Currently in your queue</small></article><article className="metric-card"><span className="metric-icon metric-red"><ShieldAlert size={18} /></span><span className="metric-label">High priority</span><strong>{isLoading ? '—' : urgent.length}</strong><small>Urgent and high priority</small></article><article className="metric-card"><span className="metric-icon metric-orange"><Clock3 size={18} /></span><span className="metric-label">In progress</span><strong>{isLoading ? '—' : inProgress}</strong><small>Work currently underway</small></article><article className="metric-card"><span className="metric-icon metric-green"><Sparkles size={18} /></span><span className="metric-label">Resolved</span><strong>{isLoading ? '—' : resolved}</strong><small>Reports marked complete</small></article></div>
    <div className="staff-queue-layout"><section className="content-panel queue-panel"><SectionHeading title="Priority queue" detail="Your assigned reports requiring the closest attention." action={<button className="subtle-link" onClick={onOpenWorkspace}>View all reports <ArrowUpRight size={14} /></button>} /><div className="queue-list">{urgent.map((report) => <button className="queue-item" key={report.id} onClick={() => onSelectReport(report)}><span className={`queue-priority priority-${report.priority}`} /><span className="queue-main"><span className="queue-id">{report.reference_number} <PriorityBadge priority={report.priority} status={report.status} /></span><strong>{report.title}</strong><small><MapPin size={12} />{report.location_address}</small></span><StatusBadge status={report.status} /><ArrowUpRight size={15} /></button>)}</div>{!isLoading && urgent.length === 0 && <p className="empty-state">No high-priority reports are assigned to you.</p>}</section>
      <aside className="team-panel"><span className="eyebrow">MY WORKLOAD</span><h2>Queue by status</h2><p>Current progress across reports in your queue.</p><div className="staff-status-list">{statusCounts.map(({ status, count }) => <div className="staff-status-row" key={status}><div className="staff-status-label"><span>{status.replaceAll('_', ' ')}</span><strong>{isLoading ? '—' : count}</strong></div><div className="staff-status-track"><i className={`status-${status}`} style={{ width: `${assignedReports.length ? (count / assignedReports.length) * 100 : 0}%` }} /></div></div>)}</div></aside></div>
    <section className="recent-activity"><SectionHeading title="Recent assignments" detail="Sorted by when each report was assigned." /><div className="activity-table"><div className="activity-table-head"><span>REPORT</span><span>CATEGORY</span><span>ASSIGNEE</span><span>ASSIGNED</span><span>STATUS</span><span>PRIORITY</span></div>{recent.map((report) => <button className="activity-table-row" key={report.id} onClick={() => onSelectReport(report)}><span><strong>{report.title}</strong><small>{report.reference_number}</small></span><span>{categories.find((category) => Number(category.id) === Number(report.category_id))?.name ?? 'Other'}</span><span>{report.assignments?.at(-1)?.staff_name ?? 'You'}</span><span>{new Date(report.assignments?.at(-1)?.assigned_at ?? report.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><span><StatusBadge status={report.status} /></span><span><PriorityBadge priority={report.priority} status={report.status} /></span></button>)}</div>{!isLoading && recent.length === 0 && <p className="empty-state">No reports are assigned to you yet.</p>}</section>
  </div>
}
