import { CalendarDays, ClipboardList, FileHeart, FilePlus2, LayoutDashboard, MapPinned } from 'lucide-react'
import type { ViewKey } from '../types'

export const residentNavigation = [
  { label: 'Community map', view: 'map-monitoring', icon: MapPinned },
  { label: 'Events & announcements', view: 'resident-events', icon: CalendarDays },
  { label: 'Overview', view: 'resident-dashboard', icon: LayoutDashboard },
  { label: 'Community reports', view: 'community-reports', icon: FileHeart },
  { label: 'Submit a report', view: 'submit-report', icon: FilePlus2 },
  { label: 'My reports', view: 'resident-reports', icon: ClipboardList },
] satisfies { label: string; view: ViewKey; icon: typeof LayoutDashboard }[]
