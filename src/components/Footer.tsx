import { ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return <footer className="app-footer"><span>© 2026 Baco360 · Municipality of Baco, Oriental Mindoro, Philippines</span><span className="footer-status"><i /> All systems operational</span><a href="#service" onClick={(event) => event.preventDefault()}>Service updates <ArrowUpRight size={13} /></a></footer>
}
