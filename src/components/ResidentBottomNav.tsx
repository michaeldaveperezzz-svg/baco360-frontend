import { useEffect, useRef } from 'react'
import type { ViewKey } from '../types'
import { residentNavigation } from '../config/residentNavigation'

interface Props {
  view: ViewKey
  onNavigate: (view: ViewKey) => void
}

export default function ResidentBottomNav({ view, onNavigate }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)
  const activeView = residentNavigation.some((item) => item.view === view) ? view : 'resident-dashboard'

  useEffect(() => {
    const nav = navRef.current
    const items = itemsRef.current
    const activeButton = nav?.querySelector<HTMLButtonElement>('[aria-current="page"]')
    if (!nav || !items || !activeButton) return

    const centerActiveItem = () => {
      const offset = nav.clientWidth / 2 - activeButton.offsetLeft - activeButton.offsetWidth / 2
      items.style.transform = `translateX(${offset}px)`
    }

    centerActiveItem()
    window.addEventListener('resize', centerActiveItem)
    return () => window.removeEventListener('resize', centerActiveItem)
  }, [activeView])

  return <div className="resident-bottom-nav-shell">
    <nav className="resident-bottom-nav" ref={navRef} aria-label="Resident navigation">
      <div className="resident-bottom-nav-items" ref={itemsRef}>
        {residentNavigation.map(({ label, view: target, icon: Icon }) => <button
          className={`resident-bottom-nav-item${activeView === target ? ' is-active' : ''}`}
          type="button"
          key={target}
          aria-label={label}
          aria-current={activeView === target ? 'page' : undefined}
          title={label}
          onClick={() => onNavigate(target)}
        >
          <span className="resident-bottom-nav-icon"><Icon size={21} strokeWidth={1.9} /></span>
        </button>)}
      </div>
    </nav>
  </div>
}
