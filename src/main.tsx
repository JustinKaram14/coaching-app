import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
