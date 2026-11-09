import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Printer, X } from 'lucide-react'
import { statusLabel, type Category, type Report } from '../data/types'
import { ReportRow, PageIntro, SectionHeading } from '../components/Common'
import { formatPrintDateTime } from '../lib/printDateTime'

interface Props {
  reports: Report[]
  categories: Category[]
  onSelectReport: (report: Report) => void
  isLoading?: boolean
  staffId?: number
  staffName?: string
}

const reportStatuses: Report['status'][] = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'reopened']
type MetricKey = 'all' | 'open' | 'resolved' | 'urgent'

function getMetricTitle(metric: MetricKey, isStaffView: boolean): string {
  if (metric === 'all' && isStaffView) return 'All assigned reports'
  if (metric === 'all') return 'Total reports'
  if (metric === 'open') return 'Open reports'
  if (metric === 'resolved') return 'Resolved'
  return 'Urgent attention'
}

function getAssignmentHistory(report: Report): Report['assignment_history'] {
  return report.assignment_history ?? report.assignments.map((assignment) => ({ ...assignment, unassigned_at: null }))
}

export default function AnalyticsReportsPage({ reports, categories, onSelectReport, isLoading = false, staffId, staffName }: Props) {
  const isStaffView = staffId !== undefined
  const analyticsReports = isStaffView
    ? reports.filter((report) => getAssignmentHistory(report).some((assignment) => Number(assignment.staff_id) === Number(staffId)))
    : reports
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState('all')
  const [exportCategory, setExportCategory] = useState('all')
  const [exportPriority, setExportPriority] = useState('all')
  const [exportAssignee, setExportAssignee] = useState('all')
  const [isPrinting, setIsPrinting] = useState(false)
  const [printedAt, setPrintedAt] = useState<string | null>(null)
  const [currentDate] = useState(() => new Date())
  const openReports = analyticsReports.filter((report) => !['resolved', 'rejected'].includes(report.status))
  const resolvedReports = analyticsReports.filter((report) => report.status === 'resolved')
  const urgentReports = openReports.filter((report) => report.priority === 'urgent')
  const metricReports: Record<MetricKey, Report[]> = { all: analyticsReports, open: openReports, resolved: resolvedReports, urgent: urgentReports }
  const metricTitles: Record<MetricKey, string> = { all: isStaffView ? 'All assigned reports' : 'Total reports', open: 'Open reports', resolved: 'Resolved', urgent: 'Urgent attention' }
  const selectedReports = activeMetric ? [...metricReports[activeMetric]].sort((left, right) => Date.parse(right.submitted_at) - Date.parse(left.submitted_at)) : []
  const assignmentRecords = analyticsReports.flatMap((report) => isStaffView ? getAssignmentHistory(report) : report.assignments)
  const assignees = [...new Map(assignmentRecords.map((assignment) => [assignment.staff_id, assignment.staff_name])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]))
  const assignmentState = (report: Report) => getAssignmentHistory(report).some(
    (assignment) => Number(assignment.staff_id) === Number(staffId) && assignment.unassigned_at === null
  ) ? 'Currently assigned' : 'Previously assigned'
  const exportReports = selectedReports.filter((report) =>
    (exportStatus === 'all' || report.status === exportStatus)
    && (exportCategory === 'all' || String(report.category_id) === exportCategory)
    && (exportPriority === 'all' || report.priority === exportPriority)
    && (isStaffView || exportAssignee === 'all'
      || (exportAssignee === 'unassigned' ? report.assignments.length === 0 : report.assignments.some((assignment) => String(assignment.staff_id) === exportAssignee)))
  )
  const categoryCounts = categories.map((category) => ({
    ...category,
    count: analyticsReports.filter((report) => Number(report.category_id) === Number(category.id)).length,
  })).sort((left, right) => right.count - left.count)
  const statusCounts = reportStatuses.map((status) => ({
    status,
    count: analyticsReports.filter((report) => report.status === status).length,
  }))
  const monthlyCounts = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(currentDate)
    month.setDate(1)
    month.setMonth(month.getMonth() - (5 - index))
    return {
      key: `${month.getFullYear()}-${month.getMonth()}`,
      label: month.toLocaleDateString('en-US', { month: 'short' }),
      count: analyticsReports.filter((report) => {
        const submitted = new Date(report.submitted_at)
        return submitted.getFullYear() === month.getFullYear() && submitted.getMonth() === month.getMonth()
      }).length,
    }
  })
  const maxMonthlyCount = Math.max(1, ...monthlyCounts.map((month) => month.count))
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((category) => category.count))
  const sortedReports = [...analyticsReports].sort((left, right) => Date.parse(right.submitted_at) - Date.parse(left.submitted_at))

  useEffect(() => {
    if (!activeMetric) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveMetric(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMetric])

  useEffect(() => {
    if (!isPrinting) return
    const previousTitle = document.title
    document.title = `Baco360 ${getMetricTitle(activeMetric ?? 'all', isStaffView)}`
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
  }, [isPrinting, activeMetric, isStaffView])

  function openExport() {
    setExportStatus('all')
    setExportCategory('all')
    setExportPriority('all')
    setExportAssignee('all')
    setIsExportOpen(true)
  }

  return <div className="page-content">
    <PageIntro eyebrow={isStaffView ? 'OPERATIONS / MY REPORTS' : 'ADMINISTRATION / INSIGHTS'} title={isStaffView ? 'My analytics & reports' : 'Analytics & reports'} description={isStaffView ? `Reports currently or previously assigned to ${staffName ?? 'your account'}. Each report is counted once.` : 'Track community issues and review every report in one place.'} />
    <div className="metric-grid analytics-metrics">
      <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('all')} aria-label="View all reports"><span className="metric-icon metric-blue"><ClipboardList size={16} /></span><span className="metric-label">{isStaffView ? 'Assigned reports' : 'Total reports'}</span><strong>{analyticsReports.length}</strong><small>{isStaffView ? 'Current and previous assignments' : 'Across all issue categories'}</small></button>
      <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('open')} aria-label="View open reports"><span className="metric-icon metric-orange"><Clock3 size={16} /></span><span className="metric-label">Open reports</span><strong>{openReports.length}</strong><small>Awaiting resolution</small></button>
      <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('resolved')} aria-label="View resolved reports"><span className="metric-icon metric-green"><CheckCircle2 size={16} /></span><span className="metric-label">Resolved</span><strong>{resolvedReports.length}</strong><small>{analyticsReports.length ? Math.round((resolvedReports.length / analyticsReports.length) * 100) : 0}% of reports</small></button>
      <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('urgent')} aria-label="View urgent reports"><span className="metric-icon metric-red"><AlertTriangle size={16} /></span><span className="metric-label">Urgent attention</span><strong>{urgentReports.length}</strong><small>Open urgent-priority reports</small></button>
    </div>
    {activeMetric && createPortal(<div className="admin-metric-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setActiveMetric(null)
    }}>
      <section className="admin-metric-modal" role="dialog" aria-modal="true" aria-labelledby="analytics-metric-title" aria-hidden={isExportOpen}>
        <div className="admin-metric-modal-head"><div><span className="eyebrow">ANALYTICS & REPORTS</span><h2 id="analytics-metric-title">{metricTitles[activeMetric]}</h2></div><button className="icon-button" type="button" aria-label="Close details" onClick={() => setActiveMetric(null)}><X size={19} /></button></div>
        <p className="admin-metric-modal-summary">{selectedReports.length} {selectedReports.length === 1 ? 'report' : 'reports'}</p>
        {isLoading ? <p className="analytics-empty" role="status">Loading reports…</p> : selectedReports.length ? <div className="report-list admin-metric-detail-list">{selectedReports.map((report) => <ReportRow key={report.id} report={report} categories={categories} onClick={() => {
          setActiveMetric(null)
          onSelectReport(report)
        }} />)}</div> : <p className="analytics-empty">No matching reports.</p>}
        <div className="admin-metric-modal-footer"><button className="button button-quiet" type="button" onClick={() => setActiveMetric(null)}>Close</button><button className="button button-primary" type="button" onClick={openExport} disabled={isLoading || selectedReports.length === 0}><Printer size={15} /> Export / print</button></div>
      </section>
    </div>, document.body)}
    {isExportOpen && activeMetric && createPortal(<div className="admin-metric-backdrop analytics-export-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setIsExportOpen(false)
    }}>
      <section className="analytics-export-modal" role="dialog" aria-modal="true" aria-labelledby="analytics-export-title">
        <div className="admin-metric-modal-head"><div><span className="eyebrow">ANALYTICS & REPORTS</span><h2 id="analytics-export-title">Export {metricTitles[activeMetric].toLowerCase()}</h2></div><button className="icon-button" type="button" aria-label="Close export filters" onClick={() => setIsExportOpen(false)}><X size={19} /></button></div>
        <p className="admin-metric-modal-summary">Choose report filters. {exportReports.length} of {selectedReports.length} reports will be included.</p>
        <div className="analytics-export-fields">
          <label className="field-label">Status<select value={exportStatus} onChange={(event) => setExportStatus(event.target.value)}><option value="all">All statuses</option>{reportStatuses.map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select></label>
          <label className="field-label">Category<select value={exportCategory} onChange={(event) => setExportCategory(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          <label className="field-label">Priority<select value={exportPriority} onChange={(event) => setExportPriority(event.target.value)}><option value="all">All priorities</option>{(['low', 'medium', 'high', 'urgent'] as const).map((priority) => <option value={priority} key={priority}>{priority}</option>)}</select></label>
          {!isStaffView && <label className="field-label">Assigned to<select value={exportAssignee} onChange={(event) => setExportAssignee(event.target.value)}><option value="all">Anyone</option><option value="unassigned">Unassigned</option>{assignees.map(([assignedStaffId, assignedStaffName]) => <option value={assignedStaffId} key={assignedStaffId}>{assignedStaffName}</option>)}</select></label>}
        </div>
        <div className="admin-metric-modal-footer"><button className="button button-quiet" type="button" onClick={() => setIsExportOpen(false)}>Cancel</button><button className="button button-primary" type="button" onClick={() => { setIsExportOpen(false); setPrintedAt(new Date().toISOString()); setIsPrinting(true) }} disabled={exportReports.length === 0}><Printer size={15} /> Print {exportReports.length} reports</button></div>
      </section>
    </div>, document.body)}
    {isPrinting && activeMetric && printedAt && createPortal(<main className="analytics-print-area">
      <header className="print-brand-header"><img src="/Baco360logo.png" alt="Baco360 logo" /><div><span>Municipality of Baco · Oriental Mindoro</span><h1>{isStaffView ? 'Staff Analytics & Reports' : 'Analytics & Reports'}</h1>{isStaffView && <p>Staff: {staffName ?? 'Current account'}</p>}<h2>{metricTitles[activeMetric]}</h2></div></header>
      <div className="print-meta"><span><strong>Records</strong>{exportReports.length} {exportReports.length === 1 ? 'report' : 'reports'}</span><span><strong>Printed</strong>{formatPrintDateTime(printedAt).date} · {formatPrintDateTime(printedAt).time}</span></div>
      <p className="print-filter-summary">Status: {exportStatus === 'all' ? 'All statuses' : statusLabel[exportStatus as Report['status']]} · Category: {categories.find((category) => String(category.id) === exportCategory)?.name ?? 'All categories'} · Priority: {exportPriority === 'all' ? 'All priorities' : exportPriority} · Assigned to: {isStaffView ? `${staffName ?? 'Current staff'} (current and previous)` : exportAssignee === 'all' ? 'Anyone' : exportAssignee === 'unassigned' ? 'Unassigned' : assignees.find(([assignedStaffId]) => String(assignedStaffId) === exportAssignee)?.[1]}</p>
      <table><thead><tr><th>Reference</th><th>Report</th><th>Category</th><th>Status</th><th>Priority</th><th>Assigned to</th>{isStaffView && <th>Assignment</th>}<th>Date &amp; time</th></tr></thead><tbody>
        {exportReports.map((report) => {
          const dateTime = formatPrintDateTime(report.submitted_at)
          return <tr key={report.id}>
          <td>{report.reference_number}</td>
          <td>{report.title}</td>
          <td>{categories.find((category) => Number(category.id) === Number(report.category_id))?.name ?? 'Other'}</td>
          <td>{statusLabel[report.status]}</td>
          <td>{report.priority}</td>
          <td>{[...new Set((isStaffView ? getAssignmentHistory(report) : report.assignments).map((assignment) => assignment.staff_name))].join(', ') || 'Unassigned'}</td>
          {isStaffView && <td>{assignmentState(report)}</td>}
          <td><time className="print-datetime"><span>{dateTime.date}</span><small>{dateTime.time}</small></time></td>
        </tr>
        })}
      </tbody></table>
    </main>, document.body)}

    <div className="analytics-panels">
      <section className="content-panel analytics-panel">
        <SectionHeading title="Reports by issue category" detail="Distribution across configured categories." />
        {categoryCounts.length ? <div className="analytics-breakdown">{categoryCounts.map((category) => <div className="analytics-breakdown-row" key={category.id}>
          <div className="analytics-breakdown-label"><strong>{category.name}</strong><span>{category.count}</span></div>
          <div className="analytics-track"><i style={{ width: `${(category.count / maxCategoryCount) * 100}%` }} /></div>
        </div>)}</div> : <p className="analytics-empty">No issue categories yet.</p>}
      </section>
      <section className="content-panel analytics-panel">
        <SectionHeading title="Status overview" detail="Current progress of submitted reports." />
        <div className="analytics-breakdown">{statusCounts.map(({ status, count }) => <div className="analytics-breakdown-row" key={status}>
          <div className="analytics-breakdown-label"><span className={`analytics-status-dot status-dot-${status}`} /><strong>{statusLabel[status]}</strong><span>{count}</span></div>
          <div className="analytics-track"><i style={{ width: `${analyticsReports.length ? (count / analyticsReports.length) * 100 : 0}%` }} /></div>
        </div>)}</div>
      </section>
      <section className="content-panel analytics-panel analytics-monthly">
        <SectionHeading title="Monthly report volume" detail="Submissions in the last six months." />
        <div className="analytics-month-chart" role="img" aria-label={monthlyCounts.map((month) => `${month.label}: ${month.count} reports`).join(', ')}>
          {monthlyCounts.map((month) => <div className="analytics-month-column" key={month.key}>
            <span>{month.count}</span><div className="analytics-month-track"><i style={{ height: `${Math.max(month.count ? 10 : 0, (month.count / maxMonthlyCount) * 100)}%` }} /></div><small>{month.label}</small>
          </div>)}
        </div>
      </section>
    </div>

    <section className="content-panel analytics-all-reports">
      <SectionHeading title={isStaffView ? 'All assigned reports' : 'All reports'} detail={isStaffView ? 'Includes current and previous assignments; each report appears once.' : 'All reports across the municipality.'} />
      {isLoading ? <p className="analytics-empty" role="status">Loading reports…</p> : sortedReports.length ? <div className="report-list">{sortedReports.map((report) => <div className={isStaffView ? 'staff-analytics-report' : undefined} key={report.id}><ReportRow report={report} categories={categories} onClick={() => onSelectReport(report)} />{isStaffView && <small>{assignmentState(report)}</small>}</div>)}</div> : <p className="analytics-empty">{isStaffView ? 'No reports have been assigned to your account.' : 'No reports have been submitted yet.'}</p>}
    </section>
  </div>
}