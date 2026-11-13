import { useEffect, useRef, useState } from 'react'
import { API_CONFIG } from '../config/api.config'

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleIdentityApi {
  initialize: (options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (element: HTMLElement, options: {
    theme: 'outline'
    size: 'large'
    shape: 'rectangular'
    text: 'continue_with' | 'signup_with'
    width: number
  }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityApi
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    const script = existingScript ?? document.createElement('script')
    script.async = true
    script.defer = true
    script.src = 'https://accounts.google.com/gsi/client'
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => {
      googleScriptPromise = null
      reject(new Error('Google sign-in could not be loaded. Please try again.'))
    }
    if (!existingScript) document.head.appendChild(script)
  })

  return googleScriptPromise
}

interface Props {
  intent: 'sign_in' | 'sign_up'
  onCredential: (idToken: string, intent: 'sign_in' | 'sign_up') => Promise<void>
}

export default function GoogleSignInButton({ intent, onCredential }: Props) {
  const buttonContainer = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let active = true
    if (!API_CONFIG.GOOGLE_CLIENT_ID) return () => { active = false }

    loadGoogleIdentityScript()
      .then(() => {
        if (!active || !buttonContainer.current || !window.google?.accounts.id) return
        const googleIdentity = window.google.accounts.id
        googleIdentity.initialize({
          client_id: API_CONFIG.GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) {
              setError('Google sign-in did not return a credential. Please try again.')
              return
            }
            setError(null)
            setIsLoading(true)
            void onCredentialRef.current(response.credential, intent)
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.')
              })
              .finally(() => setIsLoading(false))
          },
        })
        buttonContainer.current.replaceChildren()
        googleIdentity.renderButton(buttonContainer.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: intent === 'sign_in' ? 'continue_with' : 'signup_with',
          width: Math.min(buttonContainer.current.clientWidth || 360, 400),
        })
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Google sign-in could not be loaded.')
      })

    return () => { active = false }
  }, [intent])

  if (!API_CONFIG.GOOGLE_CLIENT_ID) {
    return <p className="google-signin-unavailable" role="status">Google sign-in is not configured.</p>
  }

  return (
    <div className={`google-signin${isLoading ? ' is-loading' : ''}`}>
      <div ref={buttonContainer} className="google-signin-button" aria-label={intent === 'sign_in' ? 'Continue with Google' : 'Sign up with Google'} />
      {isLoading && <span className="google-signin-status" role="status">Signing in with Google...</span>}
      {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
    </div>
  )
}
