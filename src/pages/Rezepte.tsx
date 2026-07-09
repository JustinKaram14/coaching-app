import { useState, useEffect } from 'react'
import {
  BookOpen, Plus, Trash2, ChefHat, CalendarDays, Sparkles,
  ChevronLeft, ChevronRight, X, Check, Info, UtensilsCrossed,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'
import type { Rezept, ClientSettings, MealPlanEntry } from '../types/database'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'rezepte' | 'wochenplan' | 'ki'
type KiStep = 'config' | 'loading' | 'review' | 'done'

interface GeneratedMeal {
  mahlzeit: string
  rezept_name: string
  rezept_id: string | null
  portionen: number
  kalorien: number
  protein_g: number
  kohlenhydrate_g: number
  fett_g: number
}

interface GeneratedDay {
  datum: string
  tag: string
  mahlzeiten: GeneratedMeal[]
  gesamt_kalorien: number
}

interface GeneratedPlan {
  tage: GeneratedDay[]
  meal_prep_guide: string
}

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const MEAL_SLOTS = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

function getMonday(weekOffset = 0): Date {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDayHeader(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit',
  })
}

function fmtWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const f = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  return `${f(monday)} – ${f(sunday)}`
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────

function MacroRow({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value == null) return null
  return (
    <span className={`text-xs ${color}`}>
      {label} {Math.round(value)}g
    </span>
  )
}

// ─── Recipe Card ─────────────────────────────────────────────────────────────

function RezeptCard({ r, onDelete }: { r: Rezept; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl border border-border group">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <UtensilsCrossed size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-text-primary truncate">{r.name}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-text-muted">{r.kalorien} kcal · {r.portionen} Port.</span>
          <MacroRow label="P" value={r.protein_g} color="text-blue-400" />
          <MacroRow label="K" value={r.kohlenhydrate_g} color="text-yellow-400" />
          <MacroRow label="F" value={r.fett_g} color="text-orange-400" />
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── New Recipe Form ──────────────────────────────────────────────────────────

interface NewRezeptState {
  name: string
  kalorien: string
  protein_g: string
  kohlenhydrate_g: string
  fett_g: string
  portionen: string
  zutaten_text: string
}

const emptyRezept: NewRezeptState = {
  name: '', kalorien: '', protein_g: '', kohlenhydrate_g: '',
  fett_g: '', portionen: '1', zutaten_text: '',
}

function NewRezeptForm({ userId, onSaved, onCancel }: {
  userId: string
  onSaved: (r: Rezept) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<NewRezeptState>(emptyRezept)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof NewRezeptState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim() || !form.kalorien) { setError('Name und Kalorien sind Pflichtfelder.'); return }
    setSaving(true)
    const { data, error: err } = await supabase.from('rezepte').insert({
      user_id: userId,
      name: form.name.trim(),
      kalorien: parseInt(form.kalorien),
      protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
      kohlenhydrate_g: form.kohlenhydrate_g ? parseFloat(form.kohlenhydrate_g) : null,
      fett_g: form.fett_g ? parseFloat(form.fett_g) : null,
      portionen: parseInt(form.portionen) || 1,
      zutaten_text: form.zutaten_text.trim() || null,
    }).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Rezept)
  }

  return (
    <div className="p-4 bg-bg-elevated rounded-xl border border-primary/30 space-y-3">
      <div className="font-medium text-sm text-text-primary">Neues Rezept</div>
      {error && <div className="text-xs text-danger">{error}</div>}
      <input className="input" placeholder="Rezeptname *" value={form.name} onChange={set('name')} />
      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="number" placeholder="Kalorien *" value={form.kalorien} onChange={set('kalorien')} />
        <input className="input" type="number" placeholder="Portionen" value={form.portionen} onChange={set('portionen')} />
        <input className="input" type="number" placeholder="Protein (g)" value={form.protein_g} onChange={set('protein_g')} />
        <input className="input" type="number" placeholder="Kohlenhydrate (g)" value={form.kohlenhydrate_g} onChange={set('kohlenhydrate_g')} />
        <input className="input" type="number" placeholder="Fett (g)" value={form.fett_g} onChange={set('fett_g')} />
      </div>
      <textarea
        className="input resize-none text-sm"
        rows={2}
        placeholder="Zutaten (optional)"
        value={form.zutaten_text}
        onChange={set('zutaten_text')}
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
          {saving ? <Spinner size={14} /> : <Check size={14} />} Speichern
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm">Abbrechen</button>
      </div>
    </div>
  )
}

// ─── Recipe Picker Modal ──────────────────────────────────────────────────────

function RecipePickerModal({ rezepte, slot, datum, userId, onAdded, onClose }: {
  rezepte: Rezept[]
  slot: string
  datum: string
  userId: string
  onAdded: (entry: MealPlanEntry) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Rezept | null>(null)
  const [portionen, setPortionen] = useState(1)
  const [saving, setSaving] = useState(false)

  async function confirm() {
    if (!selected) return
    setSaving(true)
    const kal = Math.round(selected.kalorien * portionen)
    const { data, error } = await supabase.from('meal_plans').insert({
      user_id: userId,
      datum,
      mahlzeit: slot,
      rezept_id: selected.id,
      rezept_name: selected.name,
      portionen,
      kalorien: kal,
      protein_g: selected.protein_g != null ? parseFloat((selected.protein_g * portionen).toFixed(1)) : null,
      kohlenhydrate_g: selected.kohlenhydrate_g != null ? parseFloat((selected.kohlenhydrate_g * portionen).toFixed(1)) : null,
      fett_g: selected.fett_g != null ? parseFloat((selected.fett_g * portionen).toFixed(1)) : null,
    }).select().single()
    setSaving(false)
    if (!error && data) onAdded(data as MealPlanEntry)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card rounded-2xl border border-border w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <div className="font-semibold text-text-primary">{slot} hinzufügen</div>
            <div className="text-xs text-text-muted">{fmtDayHeader(datum)}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {rezepte.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">
              Noch keine Rezepte vorhanden. Erstelle zuerst Rezepte im Tab "Rezepte".
            </p>
          )}
          {rezepte.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selected?.id === r.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border-light bg-bg-elevated'
              }`}
            >
              <div className="font-medium text-sm text-text-primary">{r.name}</div>
              <div className="text-xs text-text-muted mt-0.5">{r.kalorien} kcal · {r.portionen} Port.</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="p-4 border-t border-border space-y-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">Portionen:</span>
              <button onClick={() => setPortionen(p => Math.max(0.5, p - 0.5))} className="p-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary">
                –
              </button>
              <span className="w-10 text-center font-medium text-text-primary">{portionen}</span>
              <button onClick={() => setPortionen(p => p + 0.5)} className="p-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary">
                +
              </button>
              <span className="text-sm text-text-muted ml-auto">
                = {Math.round(selected.kalorien * portionen)} kcal
              </span>
            </div>
            <button onClick={confirm} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving ? <Spinner size={16} /> : <Check size={16} />}
              {selected.name} hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Weekly Plan Tab ──────────────────────────────────────────────────────────

function WochenplanTab({ rezepte, userId }: { rezepte: Rezept[]; userId: string }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [picker, setPicker] = useState<{ slot: string; datum: string } | null>(null)

  const monday = getMonday(weekOffset)
  const weekDays = Array.from({ length: 7 }, (_, i) => toISO(addDays(monday, i)))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = weekDays[0]
      const to = weekDays[6]
      const { data } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('datum', from)
        .lte('datum', to)
        .order('created_at')
      setEntries((data ?? []) as MealPlanEntry[])
      setLoading(false)
    }
    load()
  }, [weekOffset, userId])

  async function removeEntry(id: string) {
    await supabase.from('meal_plans').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  function dayEntries(datum: string, slot: string) {
    return entries.filter(e => e.datum === datum && e.mahlzeit === slot)
  }

  function dayTotal(datum: string) {
    return entries.filter(e => e.datum === datum).reduce((s, e) => s + (e.kalorien ?? 0), 0)
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-xl hover:bg-bg-elevated border border-border text-text-secondary">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-text-primary text-sm">{fmtWeekRange(monday)}</div>
          {weekOffset === 0 && <div className="text-xs text-primary mt-0.5">Diese Woche</div>}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-xl hover:bg-bg-elevated border border-border text-text-secondary">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {weekDays.map(datum => {
            const total = dayTotal(datum)
            const isToday = datum === todayISO()
            return (
              <div key={datum} className={`card border ${isToday ? 'border-primary/40' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className={`font-semibold text-sm ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                      {fmtDayHeader(datum)}
                    </span>
                    {isToday && <span className="ml-2 text-xs text-primary font-medium">Heute</span>}
                  </div>
                  {total > 0 && (
                    <span className="text-xs text-text-muted">{total.toLocaleString('de')} kcal</span>
                  )}
                </div>

                <div className="space-y-2">
                  {MEAL_SLOTS.map(slot => {
                    const slotEntries = dayEntries(datum, slot)
                    return (
                      <div key={slot} className="flex items-start gap-2">
                        <span className="text-xs text-text-muted w-24 shrink-0 mt-1.5">{slot}</span>
                        <div className="flex-1 space-y-1">
                          {slotEntries.map(e => (
                            <div key={e.id} className="flex items-center gap-2 px-2 py-1.5 bg-bg-elevated rounded-lg">
                              <span className="text-xs text-text-primary flex-1 truncate">
                                {e.rezept_name}
                                {e.portionen !== 1 && <span className="text-text-muted"> ×{e.portionen}</span>}
                              </span>
                              {e.kalorien != null && (
                                <span className="text-xs text-text-muted shrink-0">{e.kalorien} kcal</span>
                              )}
                              <button onClick={() => removeEntry(e.id)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setPicker({ slot, datum })}
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors py-1"
                          >
                            <Plus size={12} /> Hinzufügen
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {picker && (
        <RecipePickerModal
          rezepte={rezepte}
          slot={picker.slot}
          datum={picker.datum}
          userId={userId}
          onAdded={entry => {
            setEntries(e => [...e, entry])
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

// ─── KI Planer Tab ────────────────────────────────────────────────────────────

function KiPlanerTab({ rezepte, userId, settings }: {
  rezepte: Rezept[]
  userId: string
  settings: Partial<ClientSettings>
}) {
  const [step, setStep] = useState<KiStep>('config')
  const [tage, setTage] = useState(5)
  const [startDatum, setStartDatum] = useState(todayISO())
  const [mahlzeitenProTag, setMahlzeitenProTag] = useState(3)
  const [wuensche, setWuensche] = useState('')
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const kalorien = settings.kalorie_tagesziel ?? 2000

  async function generatePlan() {
    setStep('loading')
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('plan-meals', {
        body: {
          rezepte: rezepte.map(r => ({
            id: r.id, name: r.name, kalorien: r.kalorien,
            protein_g: r.protein_g, kohlenhydrate_g: r.kohlenhydrate_g,
            fett_g: r.fett_g, portionen: r.portionen,
          })),
          goals: {
            kalorien,
            protein: settings.protein_ziel ?? null,
            karbs: settings.karbs_ziel ?? null,
            fett: settings.fett_ziel ?? null,
          },
          tage,
          mahlzeitenProTag,
          startDatum,
          wuensche,
        },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (!data?.plan) throw new Error('Kein Plan erhalten.')
      setPlan(data.plan)
      setExpandedDay(data.plan.tage?.[0]?.datum ?? null)
      setStep('review')
    } catch (err: any) {
      setError(err.message ?? 'Fehler beim Erstellen des Plans.')
      setStep('config')
    }
  }

  async function savePlan() {
    if (!plan) return
    setSaving(true)
    const rows = plan.tage.flatMap(day =>
      day.mahlzeiten.map(m => ({
        user_id: userId,
        datum: day.datum,
        mahlzeit: m.mahlzeit,
        rezept_id: m.rezept_id ?? null,
        rezept_name: m.rezept_name,
        portionen: m.portionen,
        kalorien: m.kalorien,
        protein_g: m.protein_g,
        kohlenhydrate_g: m.kohlenhydrate_g,
        fett_g: m.fett_g,
      }))
    )
    await supabase.from('meal_plans').insert(rows)
    setSaving(false)
    setStep('done')
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size={40} />
        <div className="text-center">
          <div className="font-medium text-text-primary">KI erstellt deinen Plan...</div>
          <div className="text-sm text-text-muted mt-1">Das dauert ca. 10–20 Sekunden.</div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <Check size={32} className="text-success" />
        </div>
        <div>
          <div className="font-semibold text-text-primary text-lg">Plan gespeichert!</div>
          <div className="text-sm text-text-muted mt-1">Dein Meal Plan ist jetzt im Wochenplan sichtbar.</div>
        </div>
        <button onClick={() => setStep('config')} className="btn-secondary text-sm mt-2">
          Neuen Plan erstellen
        </button>
      </div>
    )
  }

  if (step === 'review' && plan) {
    return (
      <div className="space-y-4">
        {/* Meal Prep Guide */}
        {plan.meal_prep_guide && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-primary">
              <Info size={16} /> Meal Prep Anleitung
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {plan.meal_prep_guide}
            </p>
          </div>
        )}

        {/* Plan days */}
        <div className="text-sm font-semibold text-text-primary">
          Dein {plan.tage.length}-Tage Plan
        </div>
        <div className="space-y-2">
          {plan.tage.map(day => (
            <div key={day.datum} className="card border border-border">
              <button
                onClick={() => setExpandedDay(expandedDay === day.datum ? null : day.datum)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <span className="font-medium text-sm text-text-primary">{day.tag}, {fmtDayHeader(day.datum).split(',')[1]?.trim()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{day.gesamt_kalorien.toLocaleString('de')} kcal</span>
                  <ChevronRight size={14} className={`text-text-muted transition-transform ${expandedDay === day.datum ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {expandedDay === day.datum && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {day.mahlzeiten.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-text-muted w-24 shrink-0">{m.mahlzeit}</span>
                      <div className="flex-1">
                        <div className="text-xs text-text-primary">
                          {m.rezept_name}
                          {m.portionen !== 1 && <span className="text-text-muted"> ×{m.portionen}</span>}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-xs text-text-muted">{m.kalorien} kcal</span>
                          {m.protein_g > 0 && <span className="text-xs text-blue-400">P {m.protein_g}g</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={savePlan} disabled={saving} className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {saving ? <Spinner size={16} /> : <Check size={16} />}
            Plan übernehmen
          </button>
          <button onClick={() => setStep('config')} className="btn-secondary">
            Neu planen
          </button>
        </div>
      </div>
    )
  }

  // Config step
  const btnGroup = (value: number, options: number[], onChange: (v: number) => void) => (
    <div className="flex gap-2">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            value === o
              ? 'bg-primary text-white border-primary'
              : 'bg-bg-elevated text-text-secondary border-border hover:border-primary/50'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="p-4 bg-bg-elevated rounded-xl border border-border space-y-1">
        <div className="text-xs text-text-muted">Dein Kalorienziel aus den Einstellungen</div>
        <div className="font-bold text-text-primary text-xl">{kalorien.toLocaleString('de')} kcal/Tag</div>
      </div>

      <div className="space-y-2">
        <label className="label">Für wie viele Tage?</label>
        {btnGroup(tage, [3, 5, 7], setTage)}
      </div>

      <div className="space-y-2">
        <label className="label">Ab welchem Datum?</label>
        <input
          type="date"
          className="input"
          value={startDatum}
          min={todayISO()}
          onChange={e => setStartDatum(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="label">Mahlzeiten pro Tag?</label>
        {btnGroup(mahlzeitenProTag, [2, 3, 4], setMahlzeitenProTag)}
      </div>

      <div className="space-y-2">
        <label className="label">Besondere Wünsche <span className="text-text-muted font-normal">(optional)</span></label>
        <textarea
          className="input resize-none text-sm"
          rows={3}
          placeholder="z.B. viel Protein, wenig Zucker, glutenfrei, schnelle Zubereitung..."
          value={wuensche}
          onChange={e => setWuensche(e.target.value)}
        />
      </div>

      {rezepte.length === 0 && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning">
          Du hast noch keine Rezepte. Die KI wird eigene Rezepte vorschlagen. Für personalisierte Empfehlungen füge zuerst Rezepte hinzu.
        </div>
      )}

      {error && <div className="text-sm text-danger">{error}</div>}

      <button onClick={generatePlan} className="btn-primary w-full flex items-center justify-center gap-2">
        <Sparkles size={18} /> Plan erstellen
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Rezepte() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('rezepte')
  const [rezepte, setRezepte] = useState<Rezept[]>([])
  const [rezepteLoading, setRezepteLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState<Partial<ClientSettings>>({})

  useEffect(() => {
    if (!user) return
    async function load() {
      const [rezRes, settingsRes] = await Promise.all([
        supabase.from('rezepte').select('*').eq('user_id', user!.id).order('name'),
        supabase.from('client_settings').select('*').eq('user_id', user!.id).maybeSingle(),
      ])
      if (rezRes.data) setRezepte(rezRes.data as Rezept[])
      if (settingsRes.data) setSettings(settingsRes.data)
      setRezepteLoading(false)
    }
    load()
  }, [user])

  async function deleteRezept(id: string) {
    await supabase.from('rezepte').delete().eq('id', id)
    setRezepte(r => r.filter(x => x.id !== id))
  }

  const filtered = rezepte.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { id: 'rezepte' as Tab, icon: BookOpen, label: 'Rezepte' },
    { id: 'wochenplan' as Tab, icon: CalendarDays, label: 'Wochenplan' },
    { id: 'ki' as Tab, icon: Sparkles, label: 'KI Planer' },
  ]

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title text-2xl flex items-center gap-2">
          <ChefHat size={24} className="text-primary" /> Rezepte & Meal Prep
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Verwalte deine Rezepte, plane deine Woche oder lass die KI einen Plan erstellen.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Rezepte Tab */}
      {tab === 'rezepte' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Rezepte durchsuchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setShowForm(f => !f)}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Neues Rezept</span>
            </button>
          </div>

          {showForm && (
            <NewRezeptForm
              userId={user.id}
              onSaved={r => { setRezepte(prev => [...prev, r].sort((a, b) => a.name.localeCompare(b.name))); setShowForm(false) }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {rezepteLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mx-auto">
                <UtensilsCrossed size={24} className="text-text-muted" />
              </div>
              <div className="text-text-muted text-sm">
                {search ? 'Keine Rezepte gefunden.' : 'Noch keine Rezepte. Erstelle dein erstes Rezept!'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => (
                <RezeptCard key={r.id} r={r} onDelete={() => deleteRezept(r.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wochenplan Tab */}
      {tab === 'wochenplan' && (
        <WochenplanTab rezepte={rezepte} userId={user.id} />
      )}

      {/* KI Planer Tab */}
      {tab === 'ki' && (
        <KiPlanerTab rezepte={rezepte} userId={user.id} settings={settings} />
      )}
    </div>
  )
}
