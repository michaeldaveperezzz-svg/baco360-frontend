import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowLeft, ArrowRight, CircleHelp, FilePlus2, MailCheck, MapPinned, MessageSquareText, ShieldCheck, X } from 'lucide-react'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { websiteContentImageUrl, websiteContentService, type WebsiteContentData } from '../services/websiteContent.service'

interface Props {
  onLogin: (email: string, password: string, remember: boolean) => void | Promise<void>
  onRegister: (name: string, email: string, phone: string, password: string, passwordConfirmation: string, emailEnabled: boolean, smsEnabled: boolean) => boolean | Promise<boolean>
  onResendVerification: (email: string) => void | Promise<void>
  onVerifyEmail: (code: string) => void | Promise<void>
  verificationEmail: string
  onForgotPassword: (email: string) => Promise<void>
  onResetPassword: (email: string, code: string, password: string, confirmation: string) => Promise<void>
  successMessage?: string | null
}

const faqs = [
  { question: 'What can I report through Baco360?', answer: 'You can submit community concerns such as road damage, flooding, waste concerns, street-light issues, and other local service needs.' },
  { question: 'How do I follow the progress of a report?', answer: 'Create an account, sign in, and open My reports to review status updates and messages from the municipal team.' },
  { question: 'Can I add photos and a location?', answer: 'Yes. The report form lets you describe the concern, provide its location, and attach photos when available.' },
  { question: 'Do I need an account to submit a report?', answer: 'Sign up with your email address and verify it to submit reports and keep track of their progress.' },
]

function LandingBrand({ footer = false, siteName, logoPath }: { footer?: boolean; siteName: string; logoPath: string }) {
  return <div className={`brand landing-brand${footer ? ' landing-brand-footer' : ''}`} aria-label={`${siteName}, Municipality of Baco`}>
    <img className="brand-seal" src={logoPath} alt="" />
    <span>{siteName}</span>
  </div>
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

export default function LandingPage({ onLogin, onRegister, onResendVerification, onVerifyEmail, verificationEmail, onForgotPassword, onResetPassword, successMessage }: Props) {
  const [authModal, setAuthModal] = useState<'sign-in' | 'sign-up' | 'email-verification' | 'forgot-password' | 'reset-password' | null>(null)
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)
  const [activeSection, setActiveSection] = useState(() => {
    const section = window.location.hash.slice(1)
    return ['home', 'about', 'announcements', 'gallery', 'faqs', 'help'].includes(section) ? section : 'home'
  })
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentData | null>(null)
  const [contentLoadError, setContentLoadError] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetNotice, setResetNotice] = useState<string | null>(null)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  useEffect(() => {
    let active = true
    async function loadWebsiteContent() {
      try {
        const response = await websiteContentService.getPublicContent()
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Public website content could not be loaded.')
        }
        if (active) {
          setWebsiteContent(response.data)
          setContentLoadError(false)
        }
      } catch (error) {
        console.error('Could not load public website content.', error)
        if (active) setContentLoadError(true)
      }
    }
    void loadWebsiteContent()
    return () => { active = false }
  }, [])

  async function submitRegistration(...args: Parameters<Props['onRegister']>) {
    setVerificationCode('')
    setVerificationError(null)
    setVerificationNotice(null)
    const needsEmailVerification = await onRegister(...args)
    setAuthModal(needsEmailVerification ? 'email-verification' : 'sign-in')
  }

  async function resendVerification(email: string) {
    setVerificationError(null)
    setVerificationNotice(null)
    setIsResending(true)
    try {
      await onResendVerification(email)
      setAuthModal('email-verification')
      setVerificationNotice('A new code has been sent. Use the newest email; codes expire after 15 minutes.')
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Could not resend the verification code.')
      throw error
    } finally {
      setIsResending(false)
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVerificationError(null)
    setIsVerifying(true)
    try {
      await onVerifyEmail(verificationCode)
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Could not verify your email.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function sendPasswordResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResetError(null)
    setResetNotice(null)
    setIsSendingReset(true)
    try {
      await onForgotPassword(resetEmail.trim())
      setResetNotice('If this is a verified account, a 6-digit reset code has been sent to your email.')
      setResetCode('')
      setNewPassword('')
      setPasswordConfirmation('')
      setAuthModal('reset-password')
    } catch (error) {
      setResetError(getErrorMessage(error, 'Could not request a password reset.'))
    } finally {
      setIsSendingReset(false)
    }
  }

  async function resendPasswordResetCode() {
    setResetError(null)
    setResetNotice(null)
    setIsSendingReset(true)
    try {
      await onForgotPassword(resetEmail.trim())
      setResetNotice('If this is a verified account, a new code has been sent. Use the latest code.')
      setResetCode('')
    } catch (error) {
      setResetError(getErrorMessage(error, 'Could not resend the reset code.'))
    } finally {
      setIsSendingReset(false)
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResetError(null)
    if (newPassword !== passwordConfirmation) {
      setResetError('Passwords do not match.')
      return
    }
    setIsResettingPassword(true)
    try {
      await onResetPassword(resetEmail.trim(), resetCode, newPassword, passwordConfirmation)
      setAuthModal('sign-in')
    } catch (error) {
      setResetError(getErrorMessage(error, 'Could not reset the password.'))
    } finally {
      setIsResettingPassword(false)
    }
  }

  function openPasswordReset(email: string) {
    setResetEmail(email)
    setResetCode('')
    setNewPassword('')
    setPasswordConfirmation('')
    setResetError(null)
    setResetNotice(null)
    setAuthModal('forgot-password')
  }

  function scrollToSection(event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) {
    event.preventDefault()
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${sectionId}`)
  }

  useEffect(() => {
    let frame = 0
    const sectionIds = ['home', 'about', ...(websiteContent?.announcements.length ? ['announcements'] : []), ...(websiteContent?.gallery.length ? ['gallery'] : []), 'faqs', 'help']
    const updateActiveSection = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const activationLine = (document.querySelector('.landing-header')?.getBoundingClientRect().bottom ?? 0) + 32
        let currentSection = sectionIds[0]
        for (const sectionId of sectionIds) {
          const section = document.getElementById(sectionId)
          if (section && section.getBoundingClientRect().top <= activationLine) currentSection = sectionId
        }
        setActiveSection(currentSection)
      })
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [websiteContent?.announcements.length, websiteContent?.gallery.length])

  useEffect(() => {
    if (!authModal && !legalModal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (legalModal) setLegalModal(null)
        else setAuthModal(null)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [authModal, legalModal])

  const settings = websiteContent?.settings
  const siteName = settings?.site_name?.trim() || 'Baco360'
  const logoPath = websiteContentImageUrl(settings?.logo_path || '/Baco360logo.png')
  const primaryColor = settings?.primary_color || undefined
  const faqItems = websiteContent?.faqs.length
    ? websiteContent.faqs.map(({ question, answer }) => ({ question: question || '', answer: answer || '' }))
    : faqs
  const maintenanceIsActive = Boolean(settings?.maintenance_enabled)

  return <div className="landing-page">
    {contentLoadError && <p className="landing-content-message" role="status">Some saved website content is unavailable. Showing the default landing page content.</p>}
    {maintenanceIsActive && settings?.maintenance_message && <div className="landing-maintenance-banner" role="status">{settings.maintenance_message}</div>}
    <header className="landing-header">
      <LandingBrand siteName={siteName} logoPath={logoPath} />
      <nav className="landing-nav" aria-label="Main navigation">
        <a className={activeSection === 'home' ? 'is-active' : undefined} aria-current={activeSection === 'home' ? 'location' : undefined} href="#home" onClick={(event) => scrollToSection(event, 'home')}>Home</a>
        <a className={activeSection === 'about' ? 'is-active' : undefined} aria-current={activeSection === 'about' ? 'location' : undefined} href="#about" onClick={(event) => scrollToSection(event, 'about')}>About</a>
        {Boolean(websiteContent?.announcements.length) && <a className={activeSection === 'announcements' ? 'is-active' : undefined} aria-current={activeSection === 'announcements' ? 'location' : undefined} href="#announcements" onClick={(event) => scrollToSection(event, 'announcements')}>Updates</a>}
        {Boolean(websiteContent?.gallery.length) && <a className={activeSection === 'gallery' ? 'is-active' : undefined} aria-current={activeSection === 'gallery' ? 'location' : undefined} href="#gallery" onClick={(event) => scrollToSection(event, 'gallery')}>Gallery</a>}
        <a className={activeSection === 'faqs' ? 'is-active' : undefined} aria-current={activeSection === 'faqs' ? 'location' : undefined} href="#faqs" onClick={(event) => scrollToSection(event, 'faqs')}>FAQs</a>
        <a className={activeSection === 'help' ? 'is-active' : undefined} aria-current={activeSection === 'help' ? 'location' : undefined} href="#help" onClick={(event) => scrollToSection(event, 'help')}>Help</a>
      </nav>
      <div className="landing-nav-actions">
        <button className="landing-signin" type="button" onClick={() => setAuthModal('sign-in')}>Sign in</button>
        <button className="landing-signup" style={{ backgroundColor: primaryColor }} type="button" onClick={() => setAuthModal('sign-up')}>Sign up <ArrowRight size={15} /></button>
      </div>
    </header>

    <main>
      <section className="landing-hero" id="home">
        <img className="landing-hero-image" src={websiteContentImageUrl(settings?.hero_image_path || '/baco360.jpg')} alt={`${siteName} public landing page`} />
        <div className="landing-hero-content">
          <span className="landing-eyebrow">MUNICIPALITY OF BACO · ORIENTAL MINDORO</span>
          <h1>{settings?.hero_title || siteName}</h1>
          <p>{settings?.hero_description || 'A clearer way to share community concerns and follow what happens next.'}</p>
          <div className="landing-hero-actions">
            <button className="landing-hero-primary" style={{ backgroundColor: primaryColor }} type="button" onClick={() => setAuthModal('sign-up')}>Create an account <ArrowRight size={16} /></button>
            <a href="#about" onClick={(event) => scrollToSection(event, 'about')}>Explore Baco360 <ArrowDown size={15} /></a>
          </div>
        </div>
        <span className="landing-hero-caption">A community that listens.</span>
      </section>

      {Boolean(websiteContent?.announcements.length) && <section className="landing-public-announcements" id="announcements">
        <div className="landing-section-heading"><span className="landing-eyebrow">LATEST UPDATES</span><h2>Announcements</h2></div>
        <div className="landing-public-announcement-list">{websiteContent?.announcements.map((announcement) => <article key={announcement.id}>
          {announcement.image_path && <img src={websiteContentImageUrl(announcement.image_path)} alt={announcement.title || 'Announcement'} />}
          <div><h3>{announcement.title}</h3><p>{announcement.message}</p></div>
        </article>)}</div>
      </section>}

      <section className="landing-about" id="about">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">ABOUT BACO360</span>
          <h2>{settings?.about_title || 'Local concerns, closer to resolution.'}</h2>
        </div>
        <p className="landing-about-copy">{settings?.about_content || 'Baco360 connects residents with the municipal team. Submit an issue, share the details that matter, and follow its progress from one place.'}</p>
        <div className={`landing-process ${websiteContent?.competencies.length ? 'website-competency-grid' : ''}`}>
          {websiteContent?.competencies.length
            ? websiteContent.competencies.map((competency) => <article key={competency.id}><span>{competency.icon_name || competency.name?.slice(0, 1) || <ShieldCheck size={19} />}</span><strong>{competency.name}</strong><p>{competency.description}</p></article>)
            : <>
              <article><span><FilePlus2 size={19} /></span><strong>Submit</strong><p>Describe a concern and add its location or photos.</p></article>
              <article><span><MapPinned size={19} /></span><strong>Follow</strong><p>See updates and the current status of your reports.</p></article>
              <article><span><MessageSquareText size={19} /></span><strong>Stay connected</strong><p>Keep report details and municipal updates together.</p></article>
            </>}
        </div>
      </section>

      {Boolean(websiteContent?.gallery.length) && <section className="landing-gallery" id="gallery">
        <div className="landing-section-heading"><span className="landing-eyebrow">IN OUR COMMUNITY</span><h2>Gallery</h2></div>
        <div className="landing-gallery-grid">{websiteContent?.gallery.map((image) => <figure key={image.id}>
          <img src={websiteContentImageUrl(image.image_path)} alt={image.alt_text || image.caption || 'Baco community'} loading="lazy" />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>)}</div>
      </section>}

      <section className="landing-faq" id="faqs">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">GOOD TO KNOW</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="landing-faq-list">{faqItems.map(({ question, answer }) => <details key={question}>
          <summary>{question}<span>+</span></summary>
          <p>{answer}</p>
        </details>)}</div>
      </section>

      <section className="landing-help" id="help">
        <div className="landing-help-icon"><CircleHelp size={22} /></div>
        <div><span className="landing-eyebrow">NEED A HAND?</span><h2>We’re here to help you get started.</h2><p>Sign in to follow your reports, or create an account to send your first concern to the municipal team.</p>
          {(settings?.contact_email || settings?.contact_phone || settings?.contact_address) && <div className="landing-contact-details">
            {settings.contact_email && <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>}
            {settings.contact_phone && <a href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a>}
            {settings.contact_address && <span>{settings.contact_address}</span>}
          </div>}
        </div>
        <div className="landing-help-actions"><button className="landing-help-signin" type="button" onClick={() => setAuthModal('sign-in')}>Sign in</button><button className="landing-signup" style={{ backgroundColor: primaryColor }} type="button" onClick={() => setAuthModal('sign-up')}>Sign up <ArrowRight size={15} /></button></div>
      </section>
    </main>

    {authModal && createPortal(<div className="landing-auth-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setAuthModal(null)
    }}>
      <section key={authModal} className="landing-auth-dialog" role="dialog" aria-modal="true" aria-label={authModal === 'sign-in' ? 'Sign in to Baco360' : authModal === 'sign-up' ? 'Sign up for Baco360' : authModal === 'email-verification' ? 'Verify your email' : authModal === 'forgot-password' ? 'Forgot password' : 'Reset your password'}>
        <button className="landing-auth-close" type="button" aria-label="Close dialog" onClick={() => setAuthModal(null)}><X size={19} /></button>
        <div className="landing-auth-dialog-scroll">
          {authModal === 'sign-in'
            ? <LoginPage modal onLogin={onLogin} onRegister={() => setAuthModal('sign-up')} onResendVerification={resendVerification} onForgotPassword={openPasswordReset} successMessage={successMessage} />
            : authModal === 'sign-up'
              ? <RegisterPage modal onRegister={submitRegistration} onBack={() => setAuthModal('sign-in')} onOpenLegal={setLegalModal} />
              : authModal === 'email-verification'
                ? <div className="landing-verification">
                <button className="back-link" type="button" onClick={() => setAuthModal('sign-in')} disabled={isVerifying || isResending}><ArrowLeft size={15} /> Back to sign in</button>
                <span className="auth-step"><ShieldCheck size={15} /> EMAIL VERIFICATION</span>
                <h2>Check your inbox.</h2>
                <p className="landing-verification-copy">Enter the 6-digit code sent to <strong>{verificationEmail}</strong>.</p>
                {verificationError && <p className="landing-verification-message is-error" role="alert">{verificationError}</p>}
                {verificationNotice && <p className="landing-verification-message" role="status">{verificationNotice}</p>}
                <form onSubmit={submitVerification}>
                  <label className="field-label">Verification code<input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" disabled={isVerifying || isResending} /></label>
                  <button className="button button-primary auth-submit" type="submit" disabled={isVerifying || isResending || verificationCode.length !== 6}>{isVerifying ? 'Verifying...' : 'Verify email'} <ArrowRight size={16} /></button>
                </form>
                <button className="button button-secondary landing-resend-code" type="button" onClick={() => { void resendVerification(verificationEmail).catch(() => undefined) }} disabled={isVerifying || isResending}>{isResending ? 'Sending...' : 'Resend code'} <MailCheck size={16} /></button>
                </div>
                : authModal === 'forgot-password'
                  ? <div className="landing-password-reset">
                    <button className="back-link" type="button" onClick={() => setAuthModal('sign-in')} disabled={isSendingReset}><ArrowLeft size={15} /> Back to sign in</button>
                    <span className="auth-step"><ShieldCheck size={15} /> ACCOUNT RECOVERY</span>
                    <h2>Forgot password?</h2>
                    <p className="landing-verification-copy">Enter the verified email on your account. We’ll send a 6-digit reset code if it matches.</p>
                    {resetError && <p className="landing-verification-message is-error" role="alert">{resetError}</p>}
                    <form onSubmit={sendPasswordResetCode}>
                      <label className="field-label">Verified email<input required type="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="you@example.com" disabled={isSendingReset} /></label>
                      <button className="button button-primary auth-submit" type="submit" disabled={isSendingReset}>{isSendingReset ? 'Sending code...' : 'Send reset code'} <ArrowRight size={16} /></button>
                    </form>
                  </div>
                  : <div className="landing-password-reset">
                    <button className="back-link" type="button" onClick={() => setAuthModal('forgot-password')} disabled={isResettingPassword || isSendingReset}><ArrowLeft size={15} /> Change email</button>
                    <span className="auth-step"><ShieldCheck size={15} /> RESET PASSWORD</span>
                    <h2>Enter your reset code.</h2>
                    <p className="landing-verification-copy">Check <strong>{resetEmail}</strong> for the 6-digit code. It expires in 15 minutes.</p>
                    {resetNotice && <p className="landing-verification-message" role="status">{resetNotice}</p>}
                    {resetError && <p className="landing-verification-message is-error" role="alert">{resetError}</p>}
                    <form onSubmit={submitPasswordReset}>
                      <label className="field-label">Reset code<input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" disabled={isResettingPassword || isSendingReset} /></label>
                      <label className="field-label">New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" disabled={isResettingPassword || isSendingReset} /></label>
                      <label className="field-label">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Re-enter password" disabled={isResettingPassword || isSendingReset} /></label>
                      <button className="button button-primary auth-submit" type="submit" disabled={isResettingPassword || isSendingReset}>{isResettingPassword ? 'Saving password...' : 'Save new password'} <ArrowRight size={16} /></button>
                    </form>
                    <button className="button button-secondary landing-resend-code" type="button" onClick={() => void resendPasswordResetCode()} disabled={isResettingPassword || isSendingReset}>{isSendingReset ? 'Sending...' : 'Resend reset code'} <MailCheck size={16} /></button>
                  </div>}
        </div>
      </section>
      {legalModal && <div className="landing-legal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setLegalModal(null)
      }}>
        <section className="landing-legal-modal" role="dialog" aria-modal="true" aria-labelledby="landing-legal-title">
          <header>
            <div><span className="auth-step"><ShieldCheck size={15} /> BACO360 ACCOUNT</span><h2 id="landing-legal-title">{legalModal === 'terms' ? 'Terms and Conditions' : 'Privacy Policy'}</h2></div>
            <button className="landing-auth-close" type="button" aria-label="Close policy" onClick={() => setLegalModal(null)}><X size={19} /></button>
          </header>
          <div className="landing-legal-content">
            {legalModal === 'terms' ? <>
              <p className="landing-legal-updated">For residents using Baco360 in the Municipality of Baco, Oriental Mindoro.</p>
              <h3>Using Baco360</h3>
              <p>Baco360 helps residents submit community concerns, provide locations and attachments, follow report progress, and receive municipal announcements. Use the service only for lawful community purposes.</p>
              <h3>Accounts and accurate information</h3>
              <p>Provide accurate contact details, keep your password and verification codes private, and use your own account. You are responsible for activity performed through your account. Contact the municipal team if you believe it has been accessed without permission.</p>
              <h3>Reports and submitted content</h3>
              <p>Submit truthful, relevant information and only upload photos or other material you are allowed to share. Do not submit threats, harassment, knowingly false reports, unlawful content, or another person’s sensitive information unless it is necessary to explain an urgent concern.</p>
              <p>Reports and attachments may be reviewed by authorized municipal personnel to assess, route, and respond to community concerns. Do not use Baco360 to report emergencies that require immediate response; contact the appropriate emergency service directly.</p>
              <h3>Updates and service availability</h3>
              <p>You may choose available email or SMS notification preferences. Baco360 provides status and communication tools but does not guarantee a particular response time, outcome, or uninterrupted availability. Keep your report reference and contact details current so the municipal team can follow up.</p>
              <h3>Respectful use and changes</h3>
              <p>Do not interfere with the service, attempt unauthorized access, or misuse another person’s account or information. Features and these terms may be updated as the service changes. Continued use after an update means you agree to the revised terms.</p>
              <p>For questions about these terms, use the contact information published on the official Baco360 website.</p>
            </> : <>
              <p className="landing-legal-updated">This notice explains how information is used when you use Baco360 for the Municipality of Baco, Oriental Mindoro.</p>
              <h3>Information you provide</h3>
              <p>Depending on how you use the service, Baco360 may handle your name, email address, phone number, account preferences, report descriptions, locations, photos or files you attach, comments, and messages you send to the municipal team.</p>
              <h3>How information is used</h3>
              <p>Information is used to create and secure your account, receive and assess reports, route concerns to the appropriate municipal personnel, communicate status updates, respond to your messages, and operate and improve Baco360.</p>
              <h3>Who may access it</h3>
              <p>Report information and contact details may be accessible to authorized municipal personnel who need them to process or respond to a concern. Information may also be handled by service providers supporting the platform, subject to appropriate safeguards. Baco360 does not promise that every report is anonymous.</p>
              <h3>Choices and safeguarding</h3>
              <p>You can manage available email and SMS notification preferences in your account. Use care when including personal details about yourself or others in a report or attachment. The municipality should protect information with appropriate safeguards, but no online service can guarantee absolute security.</p>
              <h3>Your privacy rights</h3>
              <p>Applicable Philippine data-protection laws, including the Data Privacy Act of 2012, may provide rights regarding your personal information. To ask about your information or make a privacy-related request, contact the Municipality of Baco through the official contact details published on Baco360.</p>
              <h3>Updates to this notice</h3>
              <p>This notice may be updated when Baco360’s features or information practices change. The latest version will be available here.</p>
            </>}
          </div>
        </section>
      </div>}
    </div>, document.body)}

    <footer className="landing-footer">
      <LandingBrand footer siteName={siteName} logoPath={logoPath} />
      {settings?.footer_text && <span>{settings.footer_text}</span>}
      <span>{settings?.copyright_text || `© ${new Date().getFullYear()} Municipality of Baco, Oriental Mindoro`}</span>
      <a href="#home" onClick={(event) => scrollToSection(event, 'home')}>Back to top ↑</a>
    </footer>
  </div>
}
