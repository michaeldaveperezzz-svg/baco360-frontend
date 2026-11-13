import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, FileText, Settings2, ShieldCheck, Users, Wrench, X } from 'lucide-react'
import type { Category, Report, User } from '../data/types'
import type { ViewKey } from '../types'
import { PageIntro, SectionHeading, StatusBadge } from '../components/Common'
import ProfilePhoto from '../components/ProfilePhoto'

interface Props { users: User[]; reports: Report[]; categories: Category[]; onNavigate: (view: ViewKey) => void }

type MetricKey = 'users' | 'reports' | 'staff' | 'categories'

export default function AdminDashboard({ users, reports, categories, onNavigate }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [isClosingMetric, setIsClosingMetric] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const openReports = reports.filter((report) => !['resolved', 'rejected'].includes(report.status)).length
  const inactiveCategories = categories.filter((category) => !category.is_active).length
  const activeStaffUsers = users.filter((user) => user.role === 'staff' && user.is_active)
  const activeStaff = activeStaffUsers.length
  const openReportList = reports.filter((report) => !['resolved', 'rejected'].includes(report.status))
  const recentReports = [...reports].sort((left, right) => Date.parse(right.submitted_at) - Date.parse(left.submitted_at)).slice(0, 4)
  const metricTitles: Record<MetricKey, string> = {
    users: 'Registered users',
    reports: 'Open reports',
    staff: 'Active staff',
    categories: 'Active categories',
  }

  function closeMetric() {
    setIsClosingMetric(true)
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setActiveMetric(null)
      setIsClosingMetric(false)
      closeTimerRef.current = null
    }, 180)
  }

  useEffect(() => {
    if (!activeMetric) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isClosingMetric) closeMetric()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMetric, isClosingMetric])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  function renderMetricDetails() {
    if (activeMetric === 'users') return <div className="admin-metric-detail-list">
      {users.map((user) => <div className="admin-metric-detail-row" key={user.id}><ProfilePhoto user={user} name={user.name} className="admin-metric-avatar" /><span><strong>{user.name}</strong><small>{user.email}</small></span><span className={`admin-metric-status ${user.is_active ? 'is-active' : ''}`}>{user.is_active ? 'Active' : 'Inactive'} · {user.role}</span></div>)}
      {users.length === 0 && <p className="empty-state">No user accounts found.</p>}
    </div>

    if (activeMetric === 'reports') return <div className="admin-metric-detail-list">
      {openReportList.map((report) => <div className="admin-metric-detail-row" key={report.id}><span className="admin-metric-avatar metric-orange"><FileText size={15} /></span><span><strong>{report.title}</strong><small>{report.reference_number} · {report.location_address}</small></span><StatusBadge status={report.status} /></div>)}
      {openReportList.length === 0 && <p className="empty-state">No open reports.</p>}
    </div>

    if (activeMetric === 'staff') return <div className="admin-metric-detail-list">
      {activeStaffUsers.map((staffUser) => {
        const assignedCount = reports.filter((report) => report.assignments?.at(-1)?.staff_id === staffUser.id && !['resolved', 'rejected'].includes(report.status)).length
        return <div className="admin-metric-detail-row" key={staffUser.id}><span className="admin-metric-avatar metric-green"><Wrench size={15} /></span><span><strong>{staffUser.name}</strong><small>{staffUser.email}</small></span><span className="admin-metric-status is-active">{assignedCount} open {assignedCount === 1 ? 'report' : 'reports'}</span></div>
      })}
      {activeStaffUsers.length === 0 && <p className="empty-state">No active staff accounts.</p>}
    </div>

    if (activeMetric === 'categories') return <div className="admin-metric-detail-list">
      {categories.map((category) => {
        const reportCount = reports.filter((report) => Number(report.category_id) === Number(category.id)).length
        return <div className="admin-metric-detail-row" key={category.id}><span className="admin-metric-avatar metric-red"><Settings2 size={15} /></span><span><strong>{category.name}</strong><small>{category.description || 'No description provided.'} · {reportCount} {reportCount === 1 ? 'report' : 'reports'}</small></span><span className={`admin-metric-status ${category.is_active ? 'is-active' : ''}`}>{category.is_active ? 'Active' : 'Paused'}</span></div>
      })}
      {categories.length === 0 && <p className="empty-state">No issue categories found.</p>}
    </div>

    return null
  }

  return <div className="page-content"><PageIntro eyebrow="SYSTEM ADMINISTRATION" title="System overview" description="Manage accounts, reports, and issue categories across the municipality." action={<span className="admin-secure"><ShieldCheck size={15} /> Secure admin session</span>} /><div className="metric-grid admin-metrics">
    <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('users')} aria-label="View registered user information"><span className="metric-icon metric-blue"><Users size={18} /></span><span className="metric-label">Registered users</span><strong>{users.length}</strong><small>{users.filter((user) => user.is_active).length} active accounts</small></button>
    <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('reports')} aria-label="View open report information"><span className="metric-icon metric-orange"><FileText size={18} /></span><span className="metric-label">Open reports</span><strong>{openReports}</strong><small>{reports.length - openReports} resolved or rejected</small></button>
    <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('staff')} aria-label="View active staff information"><span className="metric-icon metric-green"><Wrench size={18} /></span><span className="metric-label">Active staff</span><strong>{activeStaff}</strong><small>Accounts eligible for assignment</small></button>
    <button className="metric-card metric-card-interactive" type="button" onClick={() => setActiveMetric('categories')} aria-label="View issue category information"><span className="metric-icon metric-red"><Settings2 size={18} /></span><span className="metric-label">Active categories</span><strong>{categories.length - inactiveCategories}</strong><small>{inactiveCategories} paused</small></button>
  </div>
    {activeMetric && createPortal(<div className={`admin-metric-backdrop${isClosingMetric ? ' is-closing' : ''}`} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isClosingMetric) closeMetric()
    }}>
      <section className={`admin-metric-modal${isClosingMetric ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="admin-metric-title">
        <div className="admin-metric-modal-head"><div><span className="eyebrow">SYSTEM OVERVIEW</span><h2 id="admin-metric-title">{metricTitles[activeMetric]}</h2></div><button className="icon-button" type="button" aria-label="Close details" onClick={closeMetric}><X size={19} /></button></div>
        <p className="admin-metric-modal-summary">{activeMetric === 'users' ? `${users.length} total accounts · ${users.filter((user) => user.is_active).length} active` : activeMetric === 'reports' ? `${openReportList.length} reports need attention` : activeMetric === 'staff' ? `${activeStaffUsers.length} active staff accounts` : `${categories.length - inactiveCategories} active · ${inactiveCategories} paused`}</p>
        {renderMetricDetails()}
        <div className="admin-metric-modal-footer"><button className="button button-quiet" type="button" onClick={closeMetric}>Back</button>{activeMetric === 'users' && <button className="button button-primary" type="button" onClick={() => onNavigate('users')}>Manage users</button>}{activeMetric === 'reports' && <button className="button button-primary" type="button" onClick={() => onNavigate('staff-workspace')}>Open report queue</button>}{activeMetric === 'categories' && <button className="button button-primary" type="button" onClick={() => onNavigate('categories')}>Manage categories</button>}</div>
      </section>
    </div>, document.body)}
    <div className="admin-main-grid"><section className="content-panel admin-reports"><SectionHeading title="Recent reports" detail="Latest submissions across all residents." action={<button className="subtle-link" onClick={() => onNavigate('staff-workspace')}>Open report queue <ArrowUpRight size={14} /></button>} /><div className="admin-activity-list">{recentReports.map((report) => <div className="admin-activity" key={report.id}><span className="activity-icon activity-report"><FileText size={16} /></span><span><strong>{report.title}</strong><small>{report.reference_number} · {categories.find((category) => Number(category.id) === Number(report.category_id))?.name ?? 'Other'}</small></span><StatusBadge status={report.status} /></div>)}{recentReports.length === 0 && <p className="empty-state">No reports have been submitted.</p>}</div></section><aside className="admin-shortcuts"><span className="eyebrow">QUICK ACCESS</span><h2>Manage your system</h2><button onClick={() => onNavigate('users')}><span className="shortcut-icon"><Users size={17} /></span><span><strong>User management</strong><small>Roles and account access</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('categories')}><span className="shortcut-icon"><Settings2 size={17} /></span><span><strong>Issue categories</strong><small>Organize report types</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('audit')}><span className="shortcut-icon"><FileText size={17} /></span><span><strong>Document management</strong><small>Review important records</small></span><ArrowUpRight size={15} /></button></aside></div>
    <section className="global-notification-panel"><div><span className="eyebrow">NOTIFICATION CENTER</span><h2>In-app notifications</h2><p>Report updates, assignments, address verification, and announcements appear in users' notification centers.</p></div></section>
    <section className="recent-activity"><SectionHeading title="Reports needing attention" detail="Highest priority open reports across all districts." action={<button className="subtle-link" onClick={() => onNavigate('staff-workspace')}>Open queue <ArrowUpRight size={14} /></button>} /><div className="admin-report-list">{reports.filter((report) => report.priority === 'urgent' || report.priority === 'high').slice(0, 3).map((report) => <div className="admin-report-row" key={report.id}><span><strong>{report.title}</strong><small>{report.reference_number} · {categories.find((category) => category.id === report.category_id)?.name}</small></span><StatusBadge status={report.status} /><span className="report-owner">{users.find((user) => user.id === report.resident_id)?.name ?? 'Resident'}</span></div>)}</div></section>
  </div>
}
