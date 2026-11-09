import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'

interface Props { 
  onLogin: (email: string, password: string, remember: boolean) => void | Promise<void>
  onRegister: () => void 
  onResendVerification: (email: string) => void | Promise<void>
  onForgotPassword: (email: string) => void
  successMessage?: string | null
  modal: true
}

export default function LoginPage({ onLogin, onRegister, onResendVerification, onForgotPassword, successMessage, modal }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [credentialsEditable, setCredentialsEditable] = useState(false)
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await onLogin(email, password, remember)
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  async function resendVerification() {
    setError(null)
    setIsResending(true)
    try {
      await onResendVerification(email)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend the verification code.')
    } finally {
      setIsResending(false)
    }
  }
  
  return (
    <div className={`auth-layout login-layout${modal ? ' auth-modal-form' : ''}`}>
      <aside className="auth-story">
        <Brand auth />
        <div className="auth-story-copy">
          <span className="eyebrow">A COMMUNITY THAT LISTENS</span>
          <h1>Better places<br />start with <em>us.</em></h1>
          <p>One simple way to make your neighborhood a little better, together.</p>
        </div>
        <div className="auth-story-bottom">
          <span>Built for the people who call this municipality home.</span>
          <span>Baco, Oriental Mindoro · Est. 2024</span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <span className="auth-step"><ShieldCheck size={15} /> RESIDENT PORTAL</span>
          <h2>Welcome back.</h2>
          <p className="auth-lead">Sign in to follow up on your reports and community updates.</p>
          {error && (
            <div className="auth-feedback auth-feedback-error">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="auth-feedback auth-feedback-success">
              {successMessage}
            </div>
          )}
          <form onSubmit={submit} autoComplete="new-password">
            <label className="field-label">
              Email address
              <input 
                required 
                type="email" 
                autoComplete="new-password"
                readOnly={!credentialsEditable}
                onFocus={() => setCredentialsEditable(true)}
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                placeholder="you@example.com" 
                disabled={isLoading}
              />
            </label>
            <label className="field-label">
              Password
              <div className="password-field">
                <input 
                  required 
                  minLength={6} 
                  type={showPassword ? 'text' : 'password'} 
                  autoComplete="new-password"
                  readOnly={!credentialsEditable}
                  onFocus={() => setCredentialsEditable(true)}
                  value={password} 
                  onChange={(event) => setPassword(event.target.value)} 
                  placeholder="Enter your password" 
                  disabled={isLoading}
                />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <div className="auth-form-options">
              <label>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={isLoading} /> Remember me
              </label>
              <button type="button" className="subtle-link" onClick={() => onForgotPassword(email)}>Forgot password?</button>
            </div>
            <button className="button button-primary auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Continue'} <ArrowRight size={16} />
            </button>
          </form>
          {error?.toLowerCase().includes('verify your email') && (
            <button className="button button-secondary" type="button" onClick={resendVerification} disabled={isLoading || isResending || !email}>
              {isResending ? 'Sending...' : 'Resend verification code'}
            </button>
          )}
          <div className="auth-divider"><span>New to Baco360?</span></div>
          <button className="button button-secondary auth-register" type="button" onClick={onRegister} disabled={isLoading}>Create an account</button>
        </div>
      </main>
    </div>
  )
}
