import { ChevronDown, Languages } from 'lucide-react'
import type { Language } from '../i18n'

interface LanguageSelectProps { language: Language; onLanguageChange: (language: Language) => void; className?: string }

export default function LanguageSelect({ language, onLanguageChange, className = '' }: LanguageSelectProps) {
  return <label className={`language-picker ${className}`}><Languages className="language-picker-icon" size={16} aria-hidden="true" /><span className="visually-hidden">Choose language</span><select aria-label="Choose language" value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}><option value="en">English</option><option value="tl">Tagalog</option></select><ChevronDown className="language-picker-chevron" size={14} aria-hidden="true" /></label>
}
