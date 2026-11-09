import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Printer, Search, ShieldCheck, X } from 'lucide-react'
import { PageIntro } from '../components/Common'
import { apiRequest } from '../lib/api.client'
import { API_ENDPOINTS } from '../config/api.config'
import { formatPrintDateTime } from '../lib/printDateTime'

export interface AuditLog {
  id: number
  user_name: string
  action: string
  entity_type: string
  entity_id: number | null
  description: string
  created_at: string
}

interface AuditLogsResponse {
  logs: AuditLog[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  filters: {
    actions: string[]
    entity_types: string[]
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [entityTypes, setEntityTypes] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, per_page: 20 })
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exportAction, setExportAction] = useState('')
  const [exportEntity, setExportEntity] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [printData, setPrintData] = useState<{ logs: AuditLog[]; from: string; to: string; action: string; entity: string } | null>(null)

  useEffect(() => {
    loadAuditLogs()
  }, [page, actionFilter, entityFilter])

  useEffect(() => {
    if (!printData) return
    const previousTitle = document.title
    document.title = 'Baco360 Document Records'
    const printTimer = window.setTimeout(() => window.print(), 100)
    const clearPrintData = () => setPrintData(null)
    window.addEventListener('afterprint', clearPrintData, { once: true })
    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', clearPrintData)
      document.title = previousTitle
    }
  }, [printData])

  async function loadAuditLogs() {
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: '20',
      }
      if (actionFilter !== 'all') params.action = actionFilter
      if (entityFilter !== 'all') params.entity_type = entityFilter

      const response = await apiRequest<AuditLogsResponse>({
        method: 'GET',
        url: API_ENDPOINTS.AUDIT_LOGS,
        params,
      })

      if (response.success && response.data) {
        setLogs(response.data.logs || [])
        setActions(response.data.filters?.actions || [])
        setEntityTypes(response.data.filters?.entity_types || [])
        setPagination(response.data.pagination || { total: 0, last_page: 1, per_page: 20 })
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    }
  }

  const filtered = useMemo(() => logs.filter((log) =>
    `${log.user_name} ${log.action} ${log.description}`.toLowerCase().includes(query.toLowerCase())
  ), [logs, query])

  async function exportRecords() {
    if (exportFrom && exportTo && exportFrom > exportTo) {
      setExportError('The start date must be on or before the end date.')
      return
    }

    setExportError(null)
    setIsExporting(true)
    try {
      const exportLogs: AuditLog[] = []
      let exportPage = 1
      let lastPage = 1

      do {
        const params: Record<string, string> = { page: String(exportPage), per_page: '100' }
        if (exportFrom) params.date_from = exportFrom
        if (exportTo) params.date_to = exportTo
        if (exportAction) params.action = exportAction
        if (exportEntity) params.entity_type = exportEntity

        const response = await apiRequest<AuditLogsResponse>({
          method: 'GET',
          url: API_ENDPOINTS.AUDIT_LOGS,
          params,
        })
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Could not load records for export.')
        }

        exportLogs.push(...(response.data.logs || []))
        lastPage = response.data.pagination?.last_page || 1
        exportPage += 1
      } while (exportPage <= lastPage)

      setIsExportOpen(false)
      setPrintData({
        logs: exportLogs,
        from: exportFrom,
        to: exportTo,
        action: exportAction,
        entity: exportEntity,
      })
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not export records.')
    } finally {
      setIsExporting(false)
    }
  }

  function formatDate(date: string) {
    if (!date) return 'Any date'
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return <div className="page-content">
    <PageIntro eyebrow="ADMINISTRATION / RECORDS" title="Document management" description="Review and organize important records across Baco360." action={<button className="button button-outline" type="button" onClick={() => { setExportError(null); setIsExportOpen(true) }}><Download size={15} /> Export records</button>} />
    <div className="audit-summary"><span className="audit-summary-icon"><ShieldCheck size={18} /></span><span><strong>Records are organized</strong><small>Review recorded actions, descriptions, and dates in one place.</small></span><span className="audit-retention">{pagination.total} records</span></div>
    <section className="management-toolbar">
      <div className="workspace-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions, users, or descriptions" /></div>
      <select value={actionFilter} onChange={(event) => { setActionFilter(event.target.value); setPage(1) }} aria-label="Filter by action"><option value="all">All actions</option>{actions.map((action) => <option value={action} key={action}>{action}</option>)}</select>
      <select value={entityFilter} onChange={(event) => { setEntityFilter(event.target.value); setPage(1) }} aria-label="Filter by entity"><option value="all">All entities</option>{entityTypes.map((entity) => <option value={entity} key={entity}>{entity}</option>)}</select>
      <span className="date-range">Showing {filtered.length} of {pagination.total} events</span>
    </section>
    <section className="management-table-wrap">
      <div className="audit-table">
        <div className="audit-table-head"><span>ACTOR</span><span>ACTION</span><span>DESCRIPTION</span><span>DATE & TIME</span></div>
        {filtered.map((log) => (
          <div className="audit-row" key={log.id}>
            <span className="audit-actor"><i>{log.user_name.split(' ').map((part) => part[0]).join('')}</i><strong>{log.user_name}</strong></span>
            <span><code>{log.action}</code></span>
            <span>{log.description}</span>
            <span>{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-state">No audit events match your search.</div>}
      </div>
      <div className="table-footer">
        <span>Showing <strong>{filtered.length}</strong> of {pagination.total} events</span>
        <span>Page {page} of {pagination.last_page}</span>
      </div>
    </section>
    {isExportOpen && createPortal(<div className="modal-backdrop document-export-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isExporting) setIsExportOpen(false)
    }}>
      <section className="document-export-modal" role="dialog" aria-modal="true" aria-labelledby="document-export-title">
        <div className="user-form-header">
          <div><span className="eyebrow">DOCUMENT MANAGEMENT</span><h2 id="document-export-title">Export records</h2></div>
          <button className="icon-button" type="button" aria-label="Close export dialog" onClick={() => setIsExportOpen(false)} disabled={isExporting}><X size={19} /></button>
        </div>
        <p className="document-export-intro">Choose a date range and optional filters for the records to print.</p>
        <div className="document-export-fields">
          <label className="field-label">From<input type="date" value={exportFrom} max={exportTo || undefined} onChange={(event) => setExportFrom(event.target.value)} disabled={isExporting} /></label>
          <label className="field-label">To<input type="date" value={exportTo} min={exportFrom || undefined} onChange={(event) => setExportTo(event.target.value)} disabled={isExporting} /></label>
          <label className="field-label">Action<select value={exportAction} onChange={(event) => setExportAction(event.target.value)} disabled={isExporting}><option value="">All actions</option>{actions.map((action) => <option key={action} value={action}>{action}</option>)}</select></label>
          <label className="field-label">Entity<select value={exportEntity} onChange={(event) => setExportEntity(event.target.value)} disabled={isExporting}><option value="">All entities</option>{entityTypes.map((entity) => <option key={entity} value={entity}>{entity}</option>)}</select></label>
        </div>
        {exportError && <p className="form-error" role="alert">{exportError}</p>}
        <div className="user-form-actions">
          <button className="button button-quiet" type="button" onClick={() => setIsExportOpen(false)} disabled={isExporting}>Cancel</button>
          <button className="button button-primary" type="button" onClick={() => void exportRecords()} disabled={isExporting}><Printer size={15} /> {isExporting ? 'Preparing...' : 'Print records'}</button>
        </div>
      </section>
    </div>, document.body)}
    {printData && createPortal(<main className="document-print-area">
      <header className="print-brand-header"><img src="/Baco360logo.png" alt="Baco360 logo" /><div><span>Municipality of Baco · Oriental Mindoro</span><h1>Document Records</h1></div></header>
      <div className="print-meta"><span><strong>Date range</strong>{formatDate(printData.from)} – {formatDate(printData.to)}</span><span><strong>Printed</strong>{formatPrintDateTime(new Date().toISOString()).date} · {formatPrintDateTime(new Date().toISOString()).time}</span></div>
      <p className="document-print-filters">Action: {printData.action || 'All actions'} · Entity: {printData.entity || 'All entities'} · {printData.logs.length} records</p>
      <table><thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Description</th><th>Date &amp; time</th></tr></thead><tbody>
        {printData.logs.map((log) => {
          const dateTime = formatPrintDateTime(log.created_at)
          return <tr key={log.id}><td>{log.user_name}</td><td>{log.action}</td><td>{log.entity_type}</td><td>{log.description}</td><td><time className="print-datetime"><span>{dateTime.date}</span><small>{dateTime.time}</small></time></td></tr>
        })}
        {printData.logs.length === 0 && <tr><td colSpan={5}>No records match the selected filters.</td></tr>}
      </tbody></table>
    </main>, document.body)}
  </div>
}