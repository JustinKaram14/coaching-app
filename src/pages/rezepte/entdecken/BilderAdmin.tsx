import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Spinner } from '../../../components/ui/Spinner'
import { START_DEFS } from '../../../lib/entdecken/startbibliothek'
import { ZUTATEN } from '../../../lib/entdecken/zutaten'

/** Nur für Coaches: erzeugt die fehlenden KI-Fotos der Startbibliothek und legt sie im Bucket „rezept-bilder“ ab */
export function BilderAdmin() {
  const [vorhanden, setVorhanden] = useState<Set<string> | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fertig, setFertig] = useState(0)
  const [fehlerAnzahl, setFehlerAnzahl] = useState(0)
  const [letzterFehler, setLetzterFehler] = useState('')
  const stopp = useRef(false)

  const pruefen = useCallback(async () => {
    const { data, error } = await supabase.storage.from('rezept-bilder').list('start', { limit: 1000 })
    if (error) { setVorhanden(null); setLetzterFehler('Der Bilder-Speicher ist noch nicht eingerichtet.'); return }
    setVorhanden(new Set((data ?? []).map(f => f.name.replace(/\.jpg$/, ''))))
  }, [])
  useEffect(() => { void pruefen() }, [pruefen])

  const fehlend = vorhanden ? START_DEFS.filter(d => !vorhanden.has(d.id)) : []

  async function starten() {
    setLaeuft(true); setFertig(0); setFehlerAnzahl(0); setLetzterFehler(''); stopp.current = false
    const warteschlange = [...fehlend]
    let hintereinander = 0
    async function arbeiter() {
      while (!stopp.current) {
        const d = warteschlange.shift()
        if (!d) return
        const { data, error } = await supabase.functions.invoke('generate-entdecken-bild', {
          body: {
            modus: 'start', id: d.id, name: d.name, mahlzeit: d.mahlzeiten[0],
            zutaten: d.zutaten.map(z => ZUTATEN[z.id]?.name).filter(Boolean).slice(0, 8),
          },
        })
        if (error || data?.error) {
          let text: string = data?.error ?? ''
          const ctx = (error as { context?: unknown } | null)?.context
          if (!text && ctx instanceof Response) text = (await ctx.json().catch(() => null))?.error ?? ''
          setLetzterFehler(text || 'Unbekannter Fehler')
          setFehlerAnzahl(n => n + 1)
          if (++hintereinander >= 3) stopp.current = true
        } else {
          hintereinander = 0
          setFertig(n => n + 1)
          setVorhanden(v => new Set(v).add(d.id))
        }
      }
    }
    await Promise.all([arbeiter(), arbeiter()])
    setLaeuft(false)
    void pruefen()
  }

  if (vorhanden && fehlend.length === 0) return null
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-4 space-y-2" data-testid="bilder-admin">
      <div className="flex items-center gap-3">
        <ImagePlus size={18} className="text-brand shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 text-sm">
          <div className="font-semibold text-text-primary">Fotos der Startbibliothek</div>
          <div className="text-xs text-text-secondary">
            {vorhanden ? `${START_DEFS.length - fehlend.length} von ${START_DEFS.length} Fotos vorhanden` : 'Wird geprüft…'}
            {laeuft && ` · ${fertig} neu erstellt`}
          </div>
        </div>
        <button onClick={laeuft ? () => { stopp.current = true } : starten} disabled={!vorhanden}
          className="btn-secondary text-sm flex items-center gap-2 shrink-0">
          {laeuft ? <><Spinner size={14} /> Stoppen</> : 'Fehlende erzeugen'}
        </button>
      </div>
      {fehlerAnzahl > 0 && <div className="text-xs text-danger" role="alert">{fehlerAnzahl} Fehler. Zuletzt: {letzterFehler}</div>}
      {!vorhanden && letzterFehler && <div className="text-xs text-warning">{letzterFehler}</div>}
    </div>
  )
}
