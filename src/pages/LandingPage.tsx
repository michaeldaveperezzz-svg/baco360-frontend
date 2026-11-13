import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowRight, CircleHelp, FilePlus2, MapPinned, MessageSquareText, ShieldCheck, X } from 'lucide-react'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { websiteContentImageUrl, websiteContentService, type WebsiteContentData } from '../services/websiteContent.service'

interface Props {
  onLogin: (email: string, password: string, remember: boolean, reactivate?: boolean) => void | Promise<void>
  onRegister: (name: string, email: string, phone: string, password: string, passwordConfirmation: string) => void | Promise<void>
  onGoogleSignIn: (idToken: string, intent: 'sign_in' | 'sign_up' | 'reactivate') => Promise<void>
  successMessage?: string | null
}

const faqs = [
  { question: 'What can I report through Baco360?', answer: 'You can submit community concerns such as road damage, flooding, waste concerns, street-light issues, and other local service needs.' },
  { question: 'How do I follow the progress of a report?', answer: 'Create an account, sign in, and open My reports to review status updates and messages from the municipal team.' },
  { question: 'Can I add photos and a location?', answer: 'Yes. The report form lets you describe the concern, provide its location, and attach photos when available.' },
  { question: 'Do I need an account to submit a report?', answer: 'Create an account with your email and password or sign up with Google to submit reports and keep track of their progress.' },
]

function LandingBrand({ footer = false, siteName, logoPath }: { footer?: boolean; siteName: string; logoPath: string }) {
  return <div className={`brand landing-brand${footer ? ' landing-brand-footer' : ''}`} aria-label={`${siteName}, Municipality of Baco`}>
    <img
      className="brand-seal"
      src={logoPath}
      alt=""
      onError={(event) => {
        if (event.currentTarget.getAttribute('src') !== '/Baco360logo.png') {
          event.currentTarget.src = '/Baco360logo.png'
        }
      }}
    />
    <span>{siteName}</span>
  </div>
}

export default function LandingPage({ onLogin, onRegister, onGoogleSignIn, successMessage }: Props) {
  const [authModal, setAuthModal] = useState<'sign-in' | 'sign-up' | null>(null)
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false)
  const [googleSignupToken, setGoogleSignupToken] = useState<string | null>(null)
  const [googleConsentSubmitting, setGoogleConsentSubmitting] = useState(false)
  const [googleConsentError, setGoogleConsentError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(() => {
    const section = window.location.hash.slice(1)
    return ['home', 'about', 'announcements', 'gallery', 'faqs', 'help'].includes(section) ? section : 'home'
  })
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentData | null>(null)
  const [contentLoadError, setContentLoadError] = useState(false)

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
    await onRegister(...args)
    openAuthModal('sign-in')
  }

  function openAuthModal(next: 'sign-in' | 'sign-up' | null) {
    setSignupTermsAccepted(false)
    setGoogleSignupToken(null)
    setGoogleConsentError(null)
    setGoogleConsentSubmitting(false)
    setAuthModal(next)
  }

  function closeAuthModal() {
    openAuthModal(null)
  }

  function requestGoogleSignupConsent(idToken: string) {
    setGoogleSignupToken(idToken)
    setGoogleConsentError(null)
    setLegalModal('terms')
  }

  function closeLegalModal() {
    setLegalModal(null)
    setGoogleSignupToken(null)
    setGoogleConsentError(null)
  }

  async function continueGoogleSignup() {
    if (!googleSignupToken || !signupTermsAccepted || googleConsentSubmitting) return
    setGoogleConsentSubmitting(true)
    setGoogleConsentError(null)
    try {
      await onGoogleSignIn(googleSignupToken, 'sign_up')
      closeLegalModal()
    } catch (reason) {
      setGoogleConsentError(reason instanceof Error ? reason.message : 'Google sign-up failed. Please try again.')
    } finally {
      setGoogleConsentSubmitting(false)
    }
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
        if (legalModal) {
          setLegalModal(null)
          setGoogleSignupToken(null)
          setGoogleConsentError(null)
        } else {
          setAuthModal(null)
          setSignupTermsAccepted(false)
          setGoogleSignupToken(null)
          setGoogleConsentError(null)
          setGoogleConsentSubmitting(false)
        }
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
        <button className="landing-signin" type="button" onClick={() => openAuthModal('sign-in')}>Sign in</button>
        <button className="landing-signup" style={{ backgroundColor: primaryColor }} type="button" onClick={() => openAuthModal('sign-up')}>Sign up <ArrowRight size={15} /></button>
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
            <button className="landing-hero-primary" style={{ backgroundColor: primaryColor }} type="button" onClick={() => openAuthModal('sign-up')}>Create an account <ArrowRight size={16} /></button>
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
        <div className="landing-help-actions"><button className="landing-help-signin" type="button" onClick={() => openAuthModal('sign-in')}>Sign in</button><button className="landing-signup" style={{ backgroundColor: primaryColor }} type="button" onClick={() => openAuthModal('sign-up')}>Sign up <ArrowRight size={15} /></button></div>
      </section>
    </main>

    {authModal && createPortal(<div className="landing-auth-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeAuthModal()
    }}>
      <section key={authModal} className="landing-auth-dialog" role="dialog" aria-modal="true" aria-label={authModal === 'sign-in' ? 'Sign in to Baco360' : 'Sign up for Baco360'}>
        <button className="landing-auth-close" type="button" aria-label="Close dialog" onClick={closeAuthModal}><X size={19} /></button>
        <div className="landing-auth-dialog-scroll">
          {authModal === 'sign-in'
            ? <LoginPage modal onLogin={onLogin} onRegister={() => openAuthModal('sign-up')} onGoogleSignIn={onGoogleSignIn} successMessage={successMessage} />
            : <RegisterPage modal onRegister={submitRegistration} onBack={() => openAuthModal('sign-in')} onOpenLegal={setLegalModal} onGoogleSignIn={onGoogleSignIn} onRequireGoogleSignupConsent={requestGoogleSignupConsent} acceptedTerms={signupTermsAccepted} onAcceptedTermsChange={setSignupTermsAccepted} />}
        </div>
      </section>
      {legalModal && <div className="landing-legal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeLegalModal()
      }}>
        <section className="landing-legal-modal" role="dialog" aria-modal="true" aria-labelledby="landing-legal-title">
          <header>
            <div><span className="auth-step"><ShieldCheck size={15} /> BACO360 ACCOUNT</span><h2 id="landing-legal-title">{legalModal === 'terms' ? 'Terms and Conditions' : 'Privacy Policy'}</h2></div>
            <button className="landing-auth-close" type="button" aria-label="Close policy" onClick={closeLegalModal}><X size={19} /></button>
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
          {googleSignupToken && <div className="landing-legal-consent">
            <label>
              <input type="checkbox" checked={signupTermsAccepted} onChange={(event) => setSignupTermsAccepted(event.target.checked)} disabled={googleConsentSubmitting} />
              <span>I agree to the Terms and Conditions and Privacy Policy.</span>
            </label>
            <div className="landing-legal-consent-actions">
              <button type="button" className="landing-legal-review" onClick={() => setLegalModal(legalModal === 'terms' ? 'privacy' : 'terms')} disabled={googleConsentSubmitting}>
                Read {legalModal === 'terms' ? 'Privacy Policy' : 'Terms and Conditions'}
              </button>
              <button type="button" className="landing-legal-accept" onClick={() => void continueGoogleSignup()} disabled={!signupTermsAccepted || googleConsentSubmitting}>
                {googleConsentSubmitting ? 'Signing up…' : 'Agree and continue'}
              </button>
            </div>
            {googleConsentError && <p className="landing-legal-consent-error" role="alert">{googleConsentError}</p>}
          </div>}
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
