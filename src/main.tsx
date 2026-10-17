import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Schrift lokal statt von Google Fonts (keine IP-Übermittlung an Google)
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-800.css'
import './index.css'
import App from './App'
import { ThemeProvider } from './hooks/useTheme'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/coaching-app/sw.js').catch(() => {})
  })
  // Tippt man auf eine Nachricht, sagt der Service Worker der offenen App, welche Seite sie zeigen soll
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type !== 'hlx-navigate' || typeof e.data.url !== 'string') return
    try {
      const hash = new URL(e.data.url, window.location.href).hash
      if (hash) window.location.hash = hash
    } catch { /* ungültige Adresse ignorieren */ }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
