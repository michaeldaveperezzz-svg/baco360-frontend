import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => {
  const themePreference = localStorage.getItem('baco360-theme') ?? 'light'
  document.documentElement.dataset.theme = themePreference === 'system'
    ? colorScheme.matches ? 'dark' : 'light'
    : themePreference === 'dark' ? 'dark' : 'light'
}
applyTheme()
colorScheme.addEventListener('change', applyTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
