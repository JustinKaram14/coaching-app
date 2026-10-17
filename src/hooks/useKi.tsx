import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { BottomSheet } from '../components/ui/BottomSheet'

// KI ist optional: Ohne Einwilligung bleiben KI-Funktionen sichtbar (mit Schloss),
// beim Antippen öffnet sich das Zustimmungsfenster. Coaches nutzen KI ohne eigene Client-Einwilligung.

interface KiContextType {
  kiAktiv: boolean
  /** true, wenn KI genutzt werden darf; sonst öffnet sich das Zustimmungsfenster und das Ergebnis wird abgewartet */
  requireKi: () => Promise<boolean>
  setKiAktiv: (on: boolean) => Promise<{ error: string | null }>
}

const KiContext = createContext<KiContextType | null>(null)

export function KiProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const istCoach = profile?.role === 'coach'
  const [consent, setConsent] = useState(false)
  const [frageOffen, setFrageOffen] = useState(false)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState('')
  const antwort = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    if (!user || istCoach) return
    supabase.from('client_settings').select('consent_ai').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setConsent(data?.consent_ai === true))
  }, [user, istCoach])

  const kiAktiv = istCoach || consent

  const setKiAktiv = useCallback(async (on: boolean) => {
    if (!user) return { error: 'Nicht angemeldet.' }
    const { error } = await supabase.from('client_settings').update({ consent_ai: on }).eq('user_id', user.id)
    if (error) return { error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' }
    setConsent(on)
    return { error: null }
  }, [user])

  const requireKi = useCallback(() => {
    if (kiAktiv) return Promise.resolve(true)
    setFehler('')
    setFrageOffen(true)
    return new Promise<boolean>((resolve) => { antwort.current = resolve })
  }, [kiAktiv])

  function schliessen(ok: boolean) {
    setFrageOffen(false)
    antwort.current?.(ok)
    antwort.current = null
  }

  async function zustimmen() {
    setSpeichert(true)
    const { error } = await setKiAktiv(true)
    setSpeichert(false)
    if (error) setFehler(error)
    else schliessen(true)
  }

  return (
    <KiContext.Provider value={{ kiAktiv, requireKi, setKiAktiv }}>
      {children}
      <BottomSheet open={frageOffen} onClose={() => schliessen(false)} title="KI-Funktionen aktivieren" tall={false}>
        <div className="space-y-4 pb-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-brand/5 border border-brand/20">
            <Sparkles size={18} className="text-brand shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              Diese Funktion nutzt KI. Dafür werden die Inhalte, die du hier eingibst (z. B. Fotos, Screenshots,
              Videos oder Text), zur Auswertung an Google Gemini (USA) übermittelt.
            </p>
          </div>
          <p className="text-xs text-text-muted">
            Einwilligung nach Art. 9 Abs. 2 lit. a i.V.m. Art. 6 Abs. 1 lit. a DSGVO. Freiwillig und jederzeit in den
            Einstellungen widerrufbar. Alle anderen Funktionen der App kannst du auch ohne KI nutzen. Mehr in der{' '}
            <Link to="/legal" target="_blank" className="text-brand hover:underline">Datenschutzerklärung</Link>.
          </p>
          {fehler && <p className="text-sm text-danger">{fehler}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => schliessen(false)}>Nicht jetzt</button>
            <button className="btn-primary flex-1" onClick={zustimmen} disabled={speichert}>
              {speichert ? 'Speichern…' : 'Zustimmen & weiter'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </KiContext.Provider>
  )
}

export function useKi() {
  const ctx = useContext(KiContext)
  if (!ctx) throw new Error('useKi must be used within KiProvider')
  return ctx
}

/** Kleines Schloss-Abzeichen an KI-Funktionen, solange KI nicht aktiviert ist */
export function KiSchloss({ className = '' }: { className?: string }) {
  const { kiAktiv } = useKi()
  if (kiAktiv) return null
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-bg-elevated border border-border px-1.5 py-px text-[10px] font-semibold text-text-muted align-middle ${className}`}>
      <Lock size={9} /> KI
    </span>
  )
}
