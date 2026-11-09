import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Clock3, FileHeart, FilePlus2, MapPin, Sparkles } from 'lucide-react'
import { type Category, type Report, type ResidentProfile } from '../data/types'
import type { ViewKey } from '../types'
import { PageIntro, ReportRow, SectionHeading } from '../components/Common'
import { useAuth } from '../contexts/AuthContext'
import { userService } from '../services/user.service'

interface Props { reports: Report[]; categories: Category[]; onNavigate: (view: ViewKey) => void; onSelectReport: (report: Report) => void; showAllReports?: boolean; isLoading?: boolean }

export default function ResidentDashboard({ reports, categories, onNavigate, onSelectReport, showAllReports = false, isLoading = false }: Props) {
  const { user } = useAuth()
  const [residentProfile, setResidentProfile] = useState<ResidentProfile | null>(null)
  const [profileError, setProfileError] = useState('')
  useEffect(() => {
    let active = true
    if (!user || user.role !== 'resident' || showAllReports) return
    void userService.getResidentProfile().then((response) => {
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load profile status.')
      if (active) setResidentProfile(response.data)
    }).catch((reason: unknown) => {
      if (active) setProfileError(reason instanceof Error ? reason.message : 'Unable to load profile status.')
    })
    return () => { active = false }
  }, [showAllReports, user])
  const userName = user?.name ? user.name.split(' ')[0] : 'Resident'
  const myReports = user ? reports.filter((report) => Number(report.resident_id) === Number(user.id)).sort((left, right) => Date.parse(right.submitted_at) - Date.parse(left.submitted_at)) : []
  const pendingCount = myReports.filter((report) => report.status === 'submitted').length
  const underReviewCount = myReports.filter((report) => report.status === 'under_review').length
  const inProgressCount = myReports.filter((report) => ['assigned', 'in_progress', 'reopened'].includes(report.status)).length
  const resolvedCount = myReports.filter((report) => report.status === 'resolved').length
  const rejectedCount = myReports.filter((report) => report.status === 'rejected').length
  const latest = myReports.slice(0, 3)

  if (showAllReports) return <div className="page-content"><button className="back-link" onClick={() => onNavigate('resident-dashboard')}><ArrowLeft size={15} /> Back to overview</button><PageIntro eyebrow="YOUR REPORTS" title="My reports" description="Review every issue you have submitted and follow its progress." /><section className="content-panel reports-panel"><SectionHeading title="Report history" detail={isLoading ? 'Loading your reports…' : `${myReports.length} report${myReports.length === 1 ? '' : 's'} submitted`} /><div className="report-list">{myReports.map((report) => <ReportRow key={report.id} report={report} categories={categories} onClick={() => onSelectReport(report)} />)}</div>{myReports.length === 0 && <p className="empty-state" role="status">{isLoading ? 'Loading your reports…' : 'No reports yet. Submit an issue to start your report history.'}</p>}</section></div>

  return <div className="page-content resident-page">
    <div className="welcome-strip"><div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14} /> YOUR NEIGHBORHOOD, IN THE LOOP</span><h1>Good morning, {userName}.</h1><p>Small reports make a real difference. Here’s what’s happening in your community.</p></div><img className="welcome-image" src="/bacologinimage.png" alt="Baco Municipal Hall" /></div>
    <div className="resident-actions"><button className="button button-primary" onClick={() => onNavigate('submit-report')}><FilePlus2 size={16} /> Report an issue</button><button className="button button-quiet" onClick={() => onNavigate('resident-reports')}>View my reports <ArrowUpRight size={15} /></button><button className="button button-quiet" onClick={() => onNavigate('community-reports')}><FileHeart size={15} /> Browse resolved reports</button><span className="response-note"><Clock3 size={15} /> Typical response <b>2–3 business days</b></span></div>
    {residentProfile && <section className="resident-profile-dashboard-card">
      <div className="resident-profile-dashboard-heading"><span><Check size={17} /></span><div><strong>Your resident profile</strong><small>{residentProfile.address_verification_status === 'Verified' ? 'Your residential address is verified.' : residentProfile.address_verification_status === 'Rejected' ? 'Your address needs an update and resubmission.' : 'Your residential address is awaiting review.'}</small></div></div>
      <div className="resident-profile-dashboard-progress"><div className="profile-completion-track" role="progressbar" aria-label="Profile completion" aria-valuenow={residentProfile.completion_percentage} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${residentProfile.completion_percentage}%` }} /></div><strong>{residentProfile.completion_percentage}%</strong></div>
      <button className="subtle-link" type="button" onClick={() => onNavigate('resident-profile')}>{residentProfile.completion_percentage === 100 ? 'Review profile' : 'Complete your profile'} <ChevronRight size={15} /></button>
    </section>}
    {profileError && <p className="resident-profile-dashboard-error" role="status">{profileError} <button type="button" onClick={() => onNavigate('resident-profile')}>Open profile</button></p>}
    <div className="metric-grid resident-metrics"><article className="metric-card"><span className="metric-icon metric-green"><FilePlus2 size={18} /></span><span className="metric-label">Total reports</span><strong>{isLoading ? '—' : myReports.length}</strong><small>Submitted by you</small></article><article className="metric-card"><span className="metric-icon metric-blue"><Clock3 size={18} /></span><span className="metric-label">Pending</span><strong>{isLoading ? '—' : pendingCount}</strong><small>Received by the municipality</small></article><article className="metric-card"><span className="metric-icon metric-blue"><Clock3 size={18} /></span><span className="metric-label">Under review</span><strong>{isLoading ? '—' : underReviewCount}</strong><small>Being assessed by staff</small></article><article className="metric-card"><span className="metric-icon metric-orange"><MapPin size={18} /></span><span className="metric-label">In progress</span><strong>{isLoading ? '—' : inProgressCount}</strong><small>Assigned or being resolved</small></article><article className="metric-card"><span className="metric-icon metric-green"><Sparkles size={18} /></span><span className="metric-label">Resolved</span><strong>{isLoading ? '—' : resolvedCount}</strong><small>Marked as complete</small></article><article className="metric-card"><span className="metric-icon metric-red"><Clock3 size={18} /></span><span className="metric-label">Rejected</span><strong>{isLoading ? '—' : rejectedCount}</strong><small>Review the reason in report details</small></article></div>
    <div className="content-columns resident-report-layout"><section className="content-panel reports-panel"><SectionHeading title="Your recent reports" detail="Updates from the municipality, all in one place." action={<button className="subtle-link" onClick={() => onNavigate('resident-reports')}>See all <ChevronRight size={15} /></button>} />
      <div className="report-list">{latest.map((report) => <ReportRow key={report.id} report={report} categories={categories} onClick={() => onSelectReport(report)} />)}</div>
      {latest.length === 0 && <p className="empty-state" role="status">{isLoading ? 'Loading your reports…' : 'No reports yet. Your first report can help make the neighborhood better.'}</p>}
    </section></div>
  </div>
}
