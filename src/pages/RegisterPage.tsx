import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'
import GoogleSignInButton from '../components/GoogleSignInButton'

interface Props { 
  onRegister: (name: string, email: string, phone: string, password: string, passwordConfirmation: string, emailEnabled: boolean, smsEnabled: boolean) => void | Promise<void>
  onBack: () => void 
  onOpenLegal: (document: 'terms' | 'privacy') => void
  onGoogleSignIn: (idToken: string, intent: 'sign_in' | 'sign_up') => Promise<void>
  modal: true
}

export default function RegisterPage({ onRegister, onBack, onOpenLegal, onGoogleSignIn, modal }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [smsUpdates, setSmsUpdates] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault()
    setError(null)

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      await onRegister(name, email, phone, password, passwordConfirmation, emailUpdates, smsUpdates)
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your information.')
      setIsLoading(false)
    }
  }
  
  return (
    <div className={`auth-layout register-layout${modal ? ' auth-modal-form' : ''}`}>
      <aside className="auth-story">
        <Brand auth />
        <div className="auth-story-copy">
          <span className="eyebrow">YOUR NEIGHBORHOOD, YOUR VOICE</span>
          <h1>Help make<br />things <em>better.</em></h1>
          <p>Every report is a step toward a stronger community.</p>
        </div>
        <div className="auth-story-bottom">
          <span>Built for the people who call this municipality home.</span>
          <span>Baco, Oriental Mindoro · Est. 2024</span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card register-card">
          <button className="back-link" onClick={onBack} disabled={isLoading}>
            <ArrowLeft size={15} /> Back to sign in
          </button>
          <span className="auth-step"><ShieldCheck size={15} /> CREATE YOUR ACCOUNT</span>
          <h2>Join your community.</h2>
          <p className="auth-lead">Start reporting issues and track progress in your neighborhood.</p>
          
          {error && (
            <div className="auth-feedback auth-feedback-error">
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <label className="field-label">
              Full name
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" disabled={isLoading} />
            </label>
            <label className="field-label">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={isLoading} />
            </label>
            <label className="field-label">
              Phone number
              <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09XXXXXXXXX" disabled={isLoading} />
            </label>
            <label className="field-label">
              Password
              <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" disabled={isLoading} />
            </label>
            <label className="field-label">
              Confirm password
              <input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Re-enter password" disabled={isLoading} />
            </label>
            <fieldset className="auth-preferences">
              <legend>Keep me updated</legend>
              <label>
                <input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} disabled={isLoading} /> Email notifications
              </label>
              <label>
                <input type="checkbox" checked={smsUpdates} onChange={(event) => setSmsUpdates(event.target.checked)} disabled={isLoading} /> SMS text alerts
              </label>
            </fieldset>
            <button className="button button-primary auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'} <ArrowRight size={16} />
            </button>
            <label className="auth-terms">
              <input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={isLoading} />
              <span>I agree to the <button type="button" className="legal-link" onClick={() => onOpenLegal('terms')}>Terms and Conditions</button> and <button type="button" className="legal-link" onClick={() => onOpenLegal('privacy')}>Privacy Policy</button>.</span>
            </label>
          </form>
          <div className="auth-divider"><span>Or sign up with</span></div>
          <GoogleSignInButton
            intent="sign_up"
            onCredential={async (idToken, intent) => {
              if (!acceptedTerms) throw new Error('Please accept the Terms and Conditions and Privacy Policy first.')
              await onGoogleSignIn(idToken, intent)
            }}
          />
        </div>
        <span className="auth-help">Already have an account? <a href="#login" onClick={onBack}>Sign in</a></span>
      </main>
    </div>
  )
}
