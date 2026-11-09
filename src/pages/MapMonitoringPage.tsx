import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Category, Report, UserRole } from '../data/types'
import { categoryName } from '../data/types'
import { PageIntro, SectionHeading, StatusBadge } from '../components/Common'

interface Props {
  reports: Report[]
  categories: Category[]
  role: UserRole
  userId: number
  onSelectReport: (report: Report) => void
  isLoading?: boolean
}

export default function MapMonitoringPage({
  reports,
  categories,
  role,
  userId,
  onSelectReport,
  isLoading = false,
}: Props) {
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)

  const visibleReports = useMemo(() => {
    const roleReports = role === 'staff'
      ? reports.filter((report) => Number(report.assignments?.at(-1)?.staff_id) === Number(userId))
      : reports
    return roleReports.filter((report) =>
      Number.isFinite(Number(report.latitude))
      && Number.isFinite(Number(report.longitude))
      && report.latitude !== null
      && report.longitude !== null
      && Number(report.latitude) >= -90
      && Number(report.latitude) <= 90
      && Number(report.longitude) >= -180
      && Number(report.longitude) <= 180,
    )
  }, [reports, role, userId])
  const selectedReport = visibleReports.find((report) => report.id === selectedReportId) ?? null
  const mapQuery = selectedReport
    ? `${selectedReport.latitude},${selectedReport.longitude}`
    : 'Baco, Oriental Mindoro, Philippines'
  const mapZoom = selectedReport ? 16 : role === 'resident' ? 14 : 13
  const googleMapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${mapZoom}&output=embed`

  const isResident = role === 'resident'
  const roleLabel = isResident ? 'Community facilities and reports' : role === 'staff' ? 'Reports assigned to you' : 'All report incidents'
  return <div className="page-content">
    <PageIntro
      eyebrow={isResident ? 'YOUR COMMUNITY' : role === 'staff' ? 'OPERATIONS / MAP MONITORING' : 'ADMINISTRATION / MAP MONITORING'}
      title={isResident ? 'Community map' : 'Map monitoring'}
      description={isResident
        ? 'Explore Baco, Oriental Mindoro, and see locations of community issues reported in the municipality.'
        : role === 'staff'
          ? 'View the locations of reports assigned to your account.'
          : 'View the reported incident locations across the municipality.'}
      action={<span className="live-indicator"><i /> {roleLabel}</span>}
    />
    <section className="monitoring-map-card" aria-label={isResident ? 'Community facilities and report map' : 'Report incident map'}>
      <div className="monitoring-map-summary">
        <span><MapPin size={16} /> {visibleReports.length} mapped {visibleReports.length === 1 ? 'report' : 'reports'}</span>
      </div>
      <iframe
        className="monitoring-map"
        title={selectedReport ? `Google Map showing ${selectedReport.title}` : isResident ? 'Google Map centered on Baco, Oriental Mindoro' : 'Google Map of the Municipality of Baco'}
        src={googleMapSrc}
        loading="lazy"
        allowFullScreen
      />
      <p className="monitoring-map-hint">{selectedReport ? `Showing location for ${selectedReport.reference_number}.` : isResident ? 'Map centered on Baco, Oriental Mindoro. Use Google Maps to explore nearby facilities and landmarks.' : 'Google Map centered on the Municipality of Baco.'} Use Google Maps controls to zoom and navigate.</p>
    </section>
    <section className="content-panel map-report-list-panel">
      <SectionHeading title={isResident ? 'Reported community issues' : 'Report locations'} detail={isLoading ? 'Loading reports…' : 'Choose a report to center the map on its location.'} />
      <div className="map-report-list">
        {visibleReports.map((report) => <article className="map-report-row" key={report.id}>
          <div className="map-report-details">
            <strong>{report.title}</strong>
            <small>{report.reference_number} · {categoryName(report.category_id, categories)}</small>
            <small>{report.location_address}</small>
          </div>
          <StatusBadge status={report.status} />
          <div className="map-report-actions">
            <button className="button button-outline button-small" type="button" onClick={() => setSelectedReportId(report.id)}>Show on map</button>
            <button className="button button-quiet button-small" type="button" onClick={() => onSelectReport(report)}>Open report</button>
          </div>
        </article>)}
        {visibleReports.length === 0 && <p className="empty-state" role="status">{isLoading ? 'Loading reports…' : 'No reports with valid location coordinates are available.'}</p>}
      </div>
    </section>
  </div>
}
