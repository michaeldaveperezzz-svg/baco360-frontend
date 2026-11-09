import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
import type { Language } from '../i18n'

interface Props {
  title: string
  message: string
  author: string
  publishedAt: string
  language: Language
  onClose: () => void
}

export default function AnnouncementModal({ title, message, author, publishedAt, language, onClose }: Props) {
  const isTagalog = language === 'tl'

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(<div className="modal-backdrop announcement-modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="announcement-detail-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title">
      <header className="announcement-detail-header">
        <span className="announcement-detail-icon"><Bell size={19} /></span>
        <div><span className="eyebrow">{isTagalog ? 'ANUNSYO NG KOMUNIDAD' : 'COMMUNITY ANNOUNCEMENT'}</span><h2 id="announcement-modal-title">{title}</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label={isTagalog ? 'Isara ang announcement' : 'Close announcement'}><X size={19} /></button>
      </header>
      <p className="announcement-detail-message">{message}</p>
      <footer className="announcement-detail-footer">
        <span>{isTagalog ? 'Ipinadala ni' : 'Shared by'} <strong>{author}</strong></span>
        <time dateTime={publishedAt}>{new Date(publishedAt).toLocaleString(isTagalog ? 'fil-PH' : 'en-US')}</time>
      </footer>
      <div className="announcement-detail-actions">
        <button className="button button-primary" type="button" onClick={onClose}>{isTagalog ? 'Isara' : 'Close'}</button>
      </div>
    </section>
  </div>, document.body)
}
