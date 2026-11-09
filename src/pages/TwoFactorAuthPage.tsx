import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'

interface Props { 
  email: string
  onVerify: (code: string, email: string) => void | Promise<void>
  onBack: () => void 
}

export default function TwoFactorAuthPage({ email, onVerify, onBack }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  
  function updateDigit(index: number, value: string) { 
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((item, position) => position === index ? digit : item))
    if (digit && index < 5) inputRefs.current[index + 1]?.focus() 
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>, index: number) { 
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus() 
  }
  
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await onVerify(digits.join(''), email)
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="auth-layout">
      <aside className="auth-story auth-story-compact">
        <Brand auth />
        <div className="auth-story-copy">
          <span className="eyebrow">YOUR ACCOUNT, PROTECTED</span>
          <h1>A little extra<br /><em>peace of mind.</em></h1>
          <p>Secure access keeps your community account and personal details safe.</p>
          <div className="auth-security-note">
            <LockKeyhole size={17} />
            <span>Two-step verification is enabled for your account.</span>
          </div>
        </div>
        <div className="auth-story-bottom">
          <span>Built for the people who call this municipality home.</span>
          <span>Baco, Oriental Mindoro · Est. 2024</span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card twofa-card">
          <button className="back-link" onClick={onBack}>
            <ArrowLeft size={15} /> Back to sign in
          </button>
          <span className="twofa-icon"><ShieldCheck size={24} /></span>
          <span className="auth-step">TWO-STEP VERIFICATION</span>
          <h2>Check your verification code.</h2>
          <p className="auth-lead">
            Enter the 6-digit code sent for <strong>{email || 'your account'}</strong>.
          </p>
          {error && (
            <div style={{ color: '#dc2626', background: '#fee2e2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <div className="otp-inputs" role="group" aria-label="6-digit verification code">
              {digits.map((digit, index) => (
                <input 
                  key={index} 
                  ref={(element) => { inputRefs.current[index] = element }} 
                  value={digit} 
                  inputMode="numeric" 
                  autoComplete={index === 0 ? 'one-time-code' : 'off'} 
                  aria-label={`Digit ${index + 1}`} 
                  maxLength={1} 
                  onChange={(event) => updateDigit(index, event.target.value)} 
                  onKeyDown={(event) => handleKey(event, index)} 
                  disabled={isLoading}
                />
              ))}
            </div>
            <button className="button button-primary auth-submit" type="submit" disabled={isLoading || digits.some((digit) => !digit)}>
              {isLoading ? 'Verifying...' : 'Verify & continue'} <ArrowRight size={16} />
            </button>
          </form>
          <p className="resend-code">Didn't receive a code? <button className="subtle-link" type="button">Resend code</button></p>
          <p className="auth-legal">For your security, verification codes expire after 10 minutes.</p>
        </div>
        <span className="auth-help">Having trouble? <a href="#help">Contact support</a></span>
      </main>
    </div>
  )
}
