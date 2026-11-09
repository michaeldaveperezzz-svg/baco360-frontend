import { BadgeCheck, BarChart3, ClipboardList, FileText, LayoutDashboard, MailCheck, MapPinned, Megaphone, Settings2, Users } from 'lucide-react'
import type { UserRole } from '../data/types'
import type { ViewKey } from '../types'
import { residentNavigation } from '../config/residentNavigation'

interface SidebarProps { role: UserRole; view: ViewKey; onNavigate: (view: ViewKey) => void }

const navigation: Record<UserRole, { label: string; items: { label: string; view: ViewKey; icon: typeof LayoutDashboard; badge?: string }[] }> = {
  resident: { label: 'MY COMMUNITY', items: residentNavigation },
  staff: { label: 'OPERATIONS', items: [{ label: 'Overview', view: 'staff-dashboard', icon: LayoutDashboard }, { label: 'Reports', view: 'reports', icon: ClipboardList }, { label: 'Address verification', view: 'address-verification', icon: BadgeCheck }, { label: 'Analytics & reports', view: 'staff-analytics', icon: BarChart3 }, { label: 'Map monitoring', view: 'map-monitoring', icon: MapPinned }, { label: 'Announcements', view: 'announcements', icon: Megaphone }] },
  admin: { label: 'ADMINISTRATION', items: [{ label: 'Overview', view: 'admin-dashboard', icon: LayoutDashboard }, { label: 'Reports', view: 'reports', icon: FileText }, { label: 'Address verification', view: 'address-verification', icon: BadgeCheck }, { label: 'Map monitoring', view: 'map-monitoring', icon: MapPinned }, { label: 'Announcements', view: 'announcements', icon: Megaphone }, { label: 'Email deliveries', view: 'email-deliveries', icon: MailCheck }, { label: 'User management', view: 'users', icon: Users }, { label: 'Issue categories', view: 'categories', icon: Settings2 }, { label: 'Analytics & reports', view: 'analytics-reports', icon: BarChart3 }, { label: 'Document management', view: 'audit', icon: ClipboardList }] },
}

export default function Sidebar({ role, view, onNavigate }: SidebarProps) {
  if (role === 'resident') return null
  const items = navigation[role]
  return <aside className="sidebar"><div className="sidebar-section-label">{items.label}</div><nav className="side-nav">{items.items.map(({ label, view: target, icon: Icon, badge }) => <button key={label} aria-label={label} title={label} className={`nav-item ${view === target || role === 'staff' && target === 'reports' && (view === 'report-attachments' || view === 'staff-workspace') ? 'active' : ''}`} onClick={() => onNavigate(target)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav><div className="sidebar-bottom"><div className="district-card"><div className="district-icon">B</div><div><strong>Baco Community</strong><span>Oriental Mindoro, Philippines</span></div><span className="district-dot" /></div></div></aside>
}
