interface BrandProps { auth?: boolean }

export default function Brand({ auth = false }: BrandProps) {
  return <a className={`brand ${auth ? 'auth-brand' : ''}`} href="#home" aria-label="Baco360, Municipality of Baco home"><img className="brand-seal" src="/Baco360logo.png" alt="Baco360 logo" /><span>Baco360</span></a>
}
