import { useState } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'

interface AnamneseData {
  // Step 1 — Körperdaten
  alter: string
  geschlecht: string
  koerpergroesse: string
  koerpergewicht: string
  zielgewicht: string
  beruf: string
  gewichtsverlauf: string
  // Step 2 — Ziele & Gesundheit
  ziele: string[]
  zeitraum: string
  erkrankungen: string
  allergien: string
  supplements: string
  // Step 3 — Ernährung
  aktivitaet: string
  fruehstueck: string
  mittagessen: string
  abendessen: string
  snacks: string
  alkohol: string
  heisshunger: string
  // Step 4 — Mahlzeiten & Timing
  mahlzeiten_typ: string
  meal_prep: string
  intervallfasten: string
  proteinquellen: string[]
  smartwatch: string
}

const EMPTY: AnamneseData = {
  alter: '', geschlecht: '', koerpergroesse: '', koerpergewicht: '',
  zielgewicht: '', beruf: '', gewichtsverlauf: '',
  ziele: [], zeitraum: '', erkrankungen: '', allergien: '', supplements: '',
  aktivitaet: '', fruehstueck: '', mittagessen: '', abendessen: '', snacks: '',
  alkohol: '', heisshunger: '',
  mahlzeiten_typ: '', meal_prep: '', intervallfasten: '', proteinquellen: [], smartwatch: '',
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
        selected
          ? 'bg-primary text-white border-primary'
          : 'border-border text-text-secondary hover:border-primary/50 hover:text-text-primary'
      }`}>
      {label}
    </button>
  )
}

function Radio({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-xl border text-sm text-center transition-all ${
        selected
          ? 'bg-primary/10 border-primary text-primary font-medium'
          : 'border-border text-text-secondary hover:border-primary/40'
      }`}>
      {label}
    </button>
  )
}

function Step1({ data, set }: { data: AnamneseData; set: (d: Partial<AnamneseData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Alter</label>
          <input type="number" className="input" placeholder="25" value={data.alter} onChange={e => set({ alter: e.target.value })} />
        </div>
        <div>
          <label className="label">Beruf</label>
          <input type="text" className="input" placeholder="z.B. Bürojob" value={data.beruf} onChange={e => set({ beruf: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Geschlecht</label>
        <div className="flex gap-2">
          {['Männlich', 'Weiblich', 'Divers'].map(g => (
            <Radio key={g} label={g} selected={data.geschlecht === g} onClick={() => set({ geschlecht: g })} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Körpergröße (cm)</label>
          <input type="number" className="input" placeholder="175" value={data.koerpergroesse} onChange={e => set({ koerpergroesse: e.target.value })} />
        </div>
        <div>
          <label className="label">Gewicht (kg)</label>
          <input type="number" step="0.1" className="input" placeholder="75" value={data.koerpergewicht} onChange={e => set({ koerpergewicht: e.target.value })} />
        </div>
        <div>
          <label className="label">Zielgewicht (kg)</label>
          <input type="number" step="0.1" className="input" placeholder="70" value={data.zielgewicht} onChange={e => set({ zielgewicht: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Gewichtsverlauf letzte 12 Monate</label>
        <div className="flex gap-2">
          {['Zugenommen', 'Abgenommen', 'Stabil'].map(g => (
            <Radio key={g} label={g} selected={data.gewichtsverlauf === g} onClick={() => set({ gewichtsverlauf: g })} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Step2({ data, set }: { data: AnamneseData; set: (d: Partial<AnamneseData>) => void }) {
  const ZIELE = ['Fettabbau', 'Muskelaufbau', 'Leistungssteigerung', 'Gewicht halten', 'Gesundheit verbessern', 'Verdauung verbessern', 'Mehr Energie']
  function toggleZiel(z: string) {
    set({ ziele: data.ziele.includes(z) ? data.ziele.filter(x => x !== z) : [...data.ziele, z] })
  }
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Hauptziel(e)</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {ZIELE.map(z => <Chip key={z} label={z} selected={data.ziele.includes(z)} onClick={() => toggleZiel(z)} />)}
        </div>
      </div>
      <div>
        <label className="label">Zeitraum / Deadline</label>
        <input type="text" className="input" placeholder="z.B. 3 Monate, bis Sommer" value={data.zeitraum} onChange={e => set({ zeitraum: e.target.value })} />
      </div>
      <div>
        <label className="label">Erkrankungen / Diagnosen (falls vorhanden)</label>
        <textarea className="input min-h-[70px] resize-none" placeholder="z.B. Diabetes, Schilddrüse, keine" value={data.erkrankungen} onChange={e => set({ erkrankungen: e.target.value })} />
      </div>
      <div>
        <label className="label">Allergien / Unverträglichkeiten</label>
        <textarea className="input min-h-[60px] resize-none" placeholder="z.B. Laktose, Gluten, keine" value={data.allergien} onChange={e => set({ allergien: e.target.value })} />
      </div>
      <div>
        <label className="label">Aktuelle Supplements</label>
        <input type="text" className="input" placeholder="z.B. Kreatin, Whey, keine" value={data.supplements} onChange={e => set({ supplements: e.target.value })} />
      </div>
    </div>
  )
}

function Step3({ data, set }: { data: AnamneseData; set: (d: Partial<AnamneseData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Aktivitätsniveau im Alltag</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {['Sitzend / kaum Bewegung', 'Leicht aktiv', 'Moderat aktiv', 'Sehr aktiv', 'Extrem aktiv'].map(a => (
            <Radio key={a} label={a} selected={data.aktivitaet === a} onClick={() => set({ aktivitaet: a })} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Typisches Frühstück</label>
          <textarea className="input min-h-[60px] resize-none text-sm" placeholder="z.B. Haferflocken, Eier, überspringen" value={data.fruehstueck} onChange={e => set({ fruehstueck: e.target.value })} />
        </div>
        <div>
          <label className="label">Typisches Mittagessen</label>
          <textarea className="input min-h-[60px] resize-none text-sm" placeholder="z.B. Mensa, Meal Prep, Restaurant" value={data.mittagessen} onChange={e => set({ mittagessen: e.target.value })} />
        </div>
        <div>
          <label className="label">Typisches Abendessen</label>
          <textarea className="input min-h-[60px] resize-none text-sm" placeholder="z.B. Pasta, Fleisch & Gemüse" value={data.abendessen} onChange={e => set({ abendessen: e.target.value })} />
        </div>
        <div>
          <label className="label">Snacks</label>
          <textarea className="input min-h-[60px] resize-none text-sm" placeholder="z.B. Obst, Nüsse, keine" value={data.snacks} onChange={e => set({ snacks: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Alkohol</label>
          <div className="flex flex-wrap gap-1.5">
            {['Nie', 'Selten', '1–2×/Woche', 'Täglich'].map(a => (
              <Chip key={a} label={a} selected={data.alkohol === a} onClick={() => set({ alkohol: a })} />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Heißhunger?</label>
          <div className="flex flex-wrap gap-1.5">
            {['Nie', 'Selten', 'Manchmal', 'Oft'].map(a => (
              <Chip key={a} label={a} selected={data.heisshunger === a} onClick={() => set({ heisshunger: a })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Step4({ data, set }: { data: AnamneseData; set: (d: Partial<AnamneseData>) => void }) {
  const QUELLEN = ['Fleisch', 'Fisch', 'Eier', 'Milchprodukte', 'Hülsenfrüchte', 'Proteinshake', 'Tofu/Tempeh']
  function toggleQ(q: string) {
    set({ proteinquellen: data.proteinquellen.includes(q) ? data.proteinquellen.filter(x => x !== q) : [...data.proteinquellen, q] })
  }
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Mahlzeiten bevorzugt</label>
        <div className="flex gap-2">
          {['Warm', 'Kalt', 'Gemischt'].map(m => (
            <Radio key={m} label={m} selected={data.mahlzeiten_typ === m} onClick={() => set({ mahlzeiten_typ: m })} />
          ))}
        </div>
      </div>
      <div>
        <label className="label">Meal Prep gewünscht?</label>
        <div className="flex gap-2">
          {['Ja', 'Manchmal', 'Nein'].map(m => (
            <Radio key={m} label={m} selected={data.meal_prep === m} onClick={() => set({ meal_prep: m })} />
          ))}
        </div>
      </div>
      <div>
        <label className="label">Intervallfasten</label>
        <div className="flex gap-2">
          {['Nein', 'Ja, bereits', 'Möchte anfangen'].map(m => (
            <Radio key={m} label={m} selected={data.intervallfasten === m} onClick={() => set({ intervallfasten: m })} />
          ))}
        </div>
      </div>
      <div>
        <label className="label">Bevorzugte Proteinquellen</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {QUELLEN.map(q => <Chip key={q} label={q} selected={data.proteinquellen.includes(q)} onClick={() => toggleQ(q)} />)}
        </div>
      </div>
      <div>
        <label className="label">Smartwatch / Fitness-Tracker vorhanden?</label>
        <div className="flex gap-2">
          {['Ja', 'Nein'].map(m => (
            <Radio key={m} label={m} selected={data.smartwatch === m} onClick={() => set({ smartwatch: m })} />
          ))}
        </div>
      </div>
    </div>
  )
}

const STEPS = [
  { title: 'Körperdaten', subtitle: 'Deine Ausgangslage' },
  { title: 'Ziele & Gesundheit', subtitle: 'Was willst du erreichen?' },
  { title: 'Ernährungsgewohnheiten', subtitle: 'Wie isst du aktuell?' },
  { title: 'Mahlzeiten & Timing', subtitle: 'Wie planst du deine Mahlzeiten?' },
]

export function Anamnese({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<AnamneseData>(EMPTY)
  const [saving, setSaving] = useState(false)

  function set(partial: Partial<AnamneseData>) {
    setData(d => ({ ...d, ...partial }))
  }

  async function finish() {
    setSaving(true)
    const anamneseJson = JSON.stringify({ ...data, anamnese_done: true })
    await supabase.from('client_settings').update({
      alter_jahre: data.alter ? parseInt(data.alter) : null,
      koerpergroesse: data.koerpergroesse ? parseInt(data.koerpergroesse) : null,
      startgewicht: data.koerpergewicht ? parseFloat(data.koerpergewicht) : null,
      zielgewicht: data.zielgewicht ? parseFloat(data.zielgewicht) : null,
      ernaehrungs_notizen: anamneseJson,
    }).eq('user_id', userId)
    setSaving(false)
    onDone()
  }

  function skip() {
    supabase.from('client_settings').update({
      ernaehrungs_notizen: JSON.stringify({ anamnese_done: true, skipped: true }),
    }).eq('user_id', userId).then(() => {})
    onDone()
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            Erstanamnese · Schritt {step + 1} / {STEPS.length}
          </div>
          <h2 className="text-xl font-bold text-text-primary">{STEPS[step].title}</h2>
          <p className="text-sm text-text-secondary mt-0.5">{STEPS[step].subtitle}</p>
        </div>
        <button onClick={skip} className="p-2 rounded-xl hover:bg-bg-elevated text-text-muted" title="Später ausfüllen">
          <X size={18} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-5 mb-6">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-bg-elevated'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-4">
        {step === 0 && <Step1 data={data} set={set} />}
        {step === 1 && <Step2 data={data} set={set} />}
        {step === 2 && <Step3 data={data} set={set} />}
        {step === 3 && <Step4 data={data} set={set} />}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pb-8 pt-4 border-t border-border space-y-3">
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
              Zurück
            </button>
          )}
          {isLast ? (
            <button onClick={finish} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Spinner size={16} /> : <Check size={16} />}
              {saving ? 'Speichern…' : 'Abschließen'}
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Weiter <ChevronRight size={16} />
            </button>
          )}
        </div>
        <button onClick={skip} className="w-full text-xs text-text-muted hover:text-text-secondary text-center py-1">
          Später ausfüllen
        </button>
      </div>
    </div>
  )
}
