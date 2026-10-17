import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { bewerte, type Bewertung, type Produkt } from '../../lib/produktcheck/bewertung'
import { ladeProdukt, scanSpeichern, warnungen } from '../../lib/produktcheck/produkt'
import { leseAnamnese } from '../../lib/entdecken/filter'
import { useAnamneseTexte } from '../../lib/entdecken/daten'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ProduktDetail, Punktzahl } from './ProduktDetail'

/** Kompakte Produktbewertung nach einem Barcode-Scan in Ernährung, mit Detailansicht im Sheet */
export function ProduktCheckKarte({ barcode }: { barcode: string }) {
  const { user } = useAuth()
  const anamnese = useAnamneseTexte(user?.id ?? '')
  const profil = useMemo(() => (anamnese ? leseAnamnese(anamnese.allergien, anamnese.erkrankungen) : null), [anamnese])
  const [daten, setDaten] = useState<{ produkt: Produkt; bewertung: Bewertung; offline: boolean } | null>(null)
  const [offen, setOffen] = useState(false)

  useEffect(() => {
    let aktiv = true
    setDaten(null)
    ladeProdukt(barcode).then(r => {
      if (!aktiv || !r) return
      const bewertung = bewerte(r.produkt)
      setDaten({ ...r, bewertung })
      if (user) scanSpeichern(user.id, r.produkt, bewertung.punkte)
    })
    return () => { aktiv = false }
  }, [barcode, user])

  if (!daten) return null
  const warn = warnungen(daten.produkt, profil, {})
  return (
    <>
      <button onClick={() => setOffen(true)} className="w-full mb-4 flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated text-left">
        <span className="flex-1"><Punktzahl bewertung={daten.bewertung} /></span>
        {warn.length > 0 && <span className="text-xs font-semibold text-danger">{warn.length} Warnung{warn.length > 1 ? 'en' : ''}</span>}
        <span className="text-xs text-brand font-medium">Analyse</span>
        <ChevronRight size={16} className="text-text-muted" />
      </button>
      <BottomSheet open={offen} onClose={() => setOffen(false)} title="Produkt-Check" tall>
        <ProduktDetail produkt={daten.produkt} bewertung={daten.bewertung} offline={daten.offline} warnungen={warn} onTagebuch={() => setOffen(false)} />
      </BottomSheet>
    </>
  )
}
