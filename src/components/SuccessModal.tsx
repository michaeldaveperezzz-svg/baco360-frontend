import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface SuccessModalProps {
  message: string
  onClose: () => void
}

export default function SuccessModal({ message, onClose }: SuccessModalProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, 2200)
    return () => window.clearTimeout(timeoutId)
  }, [message, onClose])

  return <div className="success-modal-backdrop" role="presentation">
    <section className="success-modal" role="status" aria-live="polite">
      <span className="success-modal-icon"><CheckCircle2 size={26} /></span>
      <p>{message}</p>
    </section>
  </div>
}
