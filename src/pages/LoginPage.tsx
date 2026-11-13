import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'
import GoogleSignInButton from '../components/GoogleSignInButton'

interface Props { 
  onLogin: (email: string, password: string, remember: boolean, reactivate?: boolean) => void | Promise<void>
  onRegister: () => void 
  onGoogleSignIn: (idToken: string, intent: 'sign_in' | 'sign_up' | 'reactivate') => Promise<void>
  successMessage?: string | null
  modal: true
}

const reactivationRequiredMessage = 'This account is deactivated. Confirm reactivation to continue.'

function getErrorMessage(reason: unknown): string | null {
  if (reason instanceof Error) return reason.message
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') {
    return reason.message
  }
  return null
}

export default function LoginPage({ onLogin, onRegister, onGoogleSignIn, successMessage, modal }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [credentialsEditable, setCredentialsEditable] = useState(false)
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [accountReactivation, setAccountReactivation] = useState(false)
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null)
  const [reactivationError, setReactivationError] = useState<string | null>(null)
  
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await onLogin(email, password, remember)
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      if (message === reactivationRequiredMessage) {
        setAccountReactivation(true)
        setReactivationError(null)
      } else {
        setError(message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleCredential(idToken: string, intent: 'sign_in' | 'sign_up') {
    try {
      await onGoogleSignIn(idToken, intent)
    } catch (reason) {
      if (getErrorMessage(reason) === reactivationRequiredMessage) {
        setPendingGoogleToken(idToken)
        setAccountReactivation(true)
        setReactivationError(null)
        return
      }
      throw reason
    }
  }

  async function confirmReactivation() {
    setIsLoading(true)
    setReactivationError(null)
    try {
      if (pendingGoogleToken) {
        await onGoogleSignIn(pendingGoogleToken, 'reactivate')
      } else {
        await onLogin(email, password, remember, true)
      }
      setAccountReactivation(false)
      setPendingGoogleToken(null)
    } catch (reason) {
      setReactivationError(getErrorMessage(reason) || 'Unable to reactivate the account.')
    } finally {
      setIsLoading(false)
    }
  }

  function cancelReactivation() {
    setAccountReactivation(false)
    setPendingGoogleToken(null)
    setReactivationError(null)
    setPassword('')
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
            </div>
            <button className="button button-primary auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Continue'} <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-divider"><span>Or continue with</span></div>
          <GoogleSignInButton intent="sign_in" onCredential={handleGoogleCredential} />
          <div className="auth-divider"><span>New to Baco360?</span></div>
          <button className="button button-secondary auth-register" type="button" onClick={onRegister} disabled={isLoading}>Create an account</button>
        </div>
      </main>
      {accountReactivation && <div className="account-action-backdrop">
        <section className="account-action-dialog" role="dialog" aria-modal="true" aria-labelledby="reactivate-account-title">
          <header><h2 id="reactivate-account-title">Reactivate account?</h2></header>
          <p>{pendingGoogleToken
            ? 'Your Google account is verified. Confirm to restore access to your Baco360 account.'
            : 'Your sign-in is verified. Confirm to restore access to your Baco360 account.'}</p>
          {reactivationError && <p className="account-menu-message is-error" role="alert">{reactivationError}</p>}
          <div className="account-action-buttons">
            <button type="button" className="account-action-secondary" onClick={cancelReactivation} disabled={isLoading}>Cancel</button>
            <button type="button" className="account-action-primary" onClick={() => void confirmReactivation()} disabled={isLoading}>
              {isLoading ? 'Reactivating…' : 'Confirm and sign in'}
            </button>
          </div>
        </section>
      </div>}
    </div>
  )
}
