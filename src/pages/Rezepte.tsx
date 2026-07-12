import { useState, useEffect, useRef } from 'react'
import {
  BookOpen, Plus, Trash2, ChefHat, CalendarDays, Sparkles,
  ChevronLeft, ChevronRight, X, Check, Info, UtensilsCrossed,
  ShoppingCart, Copy, Share2, Send, MessageCircle, Wallet,
  Home, Image, Link, Wand2, CalendarPlus, Layers, Minus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'
import type { Rezept, ClientSettings, MealPlanEntry } from '../types/database'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'rezepte' | 'wochenplan' | 'ki'
type KiStep = 'config' | 'loading' | 'review' | 'done'
type ReviewTab = 'plan' | 'einkauf' | 'kochen'

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

interface EinkaufsArtikel {
  menge: string
  name: string
}

interface EinkaufsKategorie {
  name: string
  emoji: string
  artikel: EinkaufsArtikel[]
}

interface Einkaufsliste {
  kategorien: EinkaufsKategorie[]
  budget_gesamt_ca: string
  hinweis?: string
}

interface GeneratedPlan {
  tage: GeneratedDay[]
  einkaufsliste?: Einkaufsliste
  meal_prep_guide: string
}

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_SLOTS = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMonday(weekOffset = 0): Date {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function toISO(d: Date): string { return d.toISOString().split('T')[0] }
function todayISO(): string { return new Date().toISOString().split('T')[0] }

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

// ─── Shopping list export ─────────────────────────────────────────────────────

function buildShareText(liste: Einkaufsliste): string {
  const lines = ['🛒 Einkaufsliste\n']
  for (const kat of liste.kategorien) {
    if (kat.artikel.length === 0) continue
    lines.push(`${kat.emoji} ${kat.name}`)
    for (const a of kat.artikel) lines.push(`  • ${a.menge} ${a.name}`)
    lines.push('')
  }
  if (liste.budget_gesamt_ca) lines.push(`💰 Geschätztes Budget: ~${liste.budget_gesamt_ca} €`)
  return lines.join('\n')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MacroRow({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value == null) return null
  return <span className={`text-xs ${color}`}>{label} {Math.round(value)}g</span>
}

function RezeptCard({ r, onDelete, onImageGenerated, onOpenDetail }: {
  r: Rezept; onDelete: () => void; onImageGenerated: (id: string, url: string) => void; onOpenDetail: () => void
}) {
  const [generatingImg, setGeneratingImg] = useState(false)

  async function generateImage(e: React.MouseEvent) {
    e.stopPropagation()
    setGeneratingImg(true)
    const { data } = await supabase.functions.invoke('generate-recipe-image', {
      body: { rezeptName: r.name, zutaten: r.zutaten_text ?? undefined },
    })
    if (data?.imageDataUrl) {
      await supabase.from('rezepte').update({ bild_url: data.imageDataUrl }).eq('id', r.id)
      onImageGenerated(r.id, data.imageDataUrl)
    }
    setGeneratingImg(false)
  }

  return (
    <div onClick={onOpenDetail}
      className="bg-bg-elevated rounded-xl border border-border overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-3 p-3">
        {r.bild_url ? (
          <img src={r.bild_url} alt={r.name}
            className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <button onClick={generateImage} disabled={generatingImg}
            className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0 hover:bg-primary/20 transition-colors group/img"
            title="Bild generieren">
            {generatingImg
              ? <Spinner size={16} />
              : <>
                  <Image size={14} className="text-primary/50 group-hover/img:text-primary transition-colors" />
                  <span className="text-[9px] text-primary/50 group-hover/img:text-primary mt-0.5">KI</span>
                </>}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-text-primary truncate">{r.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-text-muted">{r.kalorien} kcal · {r.portionen} Port.</span>
            <MacroRow label="P" value={r.protein_g} color="text-blue-400" />
            <MacroRow label="K" value={r.kohlenhydrate_g} color="text-yellow-400" />
            <MacroRow label="F" value={r.fett_g} color="text-orange-400" />
          </div>
          {(r.zutaten_text || r.kochanleitung) && (
            <div className="flex items-center gap-1.5 mt-1">
              {r.zutaten_text && <span className="text-[10px] bg-bg-card rounded px-1.5 py-0.5 text-text-muted border border-border">🛒 Zutaten</span>}
              {r.kochanleitung && <span className="text-[10px] bg-bg-card rounded px-1.5 py-0.5 text-text-muted border border-border">📖 Anleitung</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ChevronLeft size={16} className="text-text-muted rotate-180" />
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function RezeptDetailModal({ r, userId, onClose, onDelete, onImageGenerated, onInstructionsGenerated }: {
  r: Rezept; userId: string; onClose: () => void; onDelete: () => void
  onImageGenerated: (id: string, url: string) => void
  onInstructionsGenerated: (id: string, kochanleitung: string) => void
}) {
  const basePort = r.portionen || 1
  const [portionen, setPortionen] = useState(basePort)
  const [generatingImg, setGeneratingImg] = useState(false)
  const [generatingInstr, setGeneratingInstr] = useState(false)
  const [localKochanleitung, setLocalKochanleitung] = useState<string | null>(null)
  const [addToPlanOpen, setAddToPlanOpen] = useState(false)
  const [planDatum, setPlanDatum] = useState(todayISO())
  const [planSlot, setPlanSlot] = useState('Mittagessen')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const scale = portionen / basePort
  const scaledKal = Math.round(r.kalorien * scale)
  const scaledProt = r.protein_g != null ? parseFloat((r.protein_g * scale).toFixed(1)) : null
  const scaledKarbs = r.kohlenhydrate_g != null ? parseFloat((r.kohlenhydrate_g * scale).toFixed(1)) : null
  const scaledFett = r.fett_g != null ? parseFloat((r.fett_g * scale).toFixed(1)) : null

  async function generateImage() {
    setGeneratingImg(true)
    const { data } = await supabase.functions.invoke('generate-recipe-image', {
      body: { rezeptName: r.name, zutaten: r.zutaten_text ?? undefined },
    })
    if (data?.imageDataUrl) {
      await supabase.from('rezepte').update({ bild_url: data.imageDataUrl }).eq('id', r.id)
      onImageGenerated(r.id, data.imageDataUrl)
    }
    setGeneratingImg(false)
  }

  async function generateInstructions() {
    setGeneratingInstr(true)
    const { data } = await supabase.functions.invoke('generate-recipe-instructions', {
      body: {
        rezeptName: r.name, zutaten_text: r.zutaten_text,
        kalorien: r.kalorien, protein_g: r.protein_g,
        kohlenhydrate_g: r.kohlenhydrate_g, fett_g: r.fett_g,
        portionen: r.portionen,
      },
    })
    if (data?.kochanleitung) {
      await supabase.from('rezepte').update({ kochanleitung: data.kochanleitung }).eq('id', r.id)
      setLocalKochanleitung(data.kochanleitung)
      onInstructionsGenerated(r.id, data.kochanleitung)
    }
    setGeneratingInstr(false)
  }

  // Auto-generate missing image and instructions when modal opens
  useEffect(() => {
    if (!r.bild_url) generateImage()
    if (!r.kochanleitung) generateInstructions()
  }, [])

  async function addToPlan() {
    setAdding(true)
    await supabase.from('meal_plans').insert({
      user_id: userId, datum: planDatum, mahlzeit: planSlot,
      rezept_id: r.id, rezept_name: r.name, portionen,
      kalorien: scaledKal, protein_g: scaledProt,
      kohlenhydrate_g: scaledKarbs, fett_g: scaledFett,
    })
    setAdding(false)
    setAdded(true)
    setTimeout(() => { setAdded(false); setAddToPlanOpen(false) }, 2000)
  }

  function datumLabel(iso: string): string {
    if (iso === todayISO()) return 'Heute'
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    if (iso === toISO(tomorrow)) return 'Morgen'
    return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border shrink-0">
          {r.bild_url ? (
            <img src={r.bild_url} alt={r.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
          ) : (
            <button onClick={generateImage} disabled={generatingImg}
              className="w-16 h-16 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 hover:bg-primary/20 transition-colors">
              {generatingImg ? <Spinner size={20} /> : <>
                <Image size={18} className="text-primary/60" />
                <span className="text-[9px] text-primary/60 mt-0.5">KI Bild</span>
              </>}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary text-base">{r.name}</div>
            <div className="text-sm text-text-muted mt-0.5">
              {scaledKal} kcal
              {scaledProt != null && <span className="text-blue-400"> · P {scaledProt}g</span>}
              {scaledKarbs != null && <span className="text-yellow-400"> · K {scaledKarbs}g</span>}
              {scaledFett != null && <span className="text-orange-400"> · F {scaledFett}g</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Portion adjuster */}
          <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl border border-border">
            <span className="text-sm text-text-secondary flex-1">Portionen</span>
            <button onClick={() => setPortionen(p => Math.max(0.5, parseFloat((p - 0.5).toFixed(1))))}
              className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-primary/50 transition-colors">
              <Minus size={14} className="text-text-secondary" />
            </button>
            <span className="w-14 text-center font-semibold text-text-primary">
              {portionen % 1 === 0 ? portionen : portionen.toFixed(1)}
            </span>
            <button onClick={() => setPortionen(p => parseFloat((p + 0.5).toFixed(1)))}
              className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center hover:border-primary/50 transition-colors">
              <Plus size={14} className="text-text-secondary" />
            </button>
          </div>

          {/* Zutaten */}
          {r.zutaten_text && (
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ShoppingCart size={12} /> Zutaten
                {scale !== 1 && (
                  <span className="text-primary font-medium normal-case tracking-normal ml-1">
                    (×{scale % 1 === 0 ? scale : scale.toFixed(1)} für {portionen} Port.)
                  </span>
                )}
              </div>
              <div className="text-sm text-text-secondary whitespace-pre-line leading-relaxed bg-bg-elevated rounded-xl p-3 border border-border">
                {r.zutaten_text}
              </div>
              {scale !== 1 && (
                <div className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                  <Info size={11} className="shrink-0" />
                  Angaben für {basePort} Portion(en) — alle Mengen mit ×{scale % 1 === 0 ? scale : scale.toFixed(1)} multiplizieren
                </div>
              )}
            </div>
          )}

          {/* Kochanleitung */}
          {(r.kochanleitung || localKochanleitung || generatingInstr) && (
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ChefHat size={12} /> Kochanleitung
                {generatingInstr && <Spinner size={12} />}
              </div>
              {generatingInstr ? (
                <div className="text-sm text-text-muted italic p-3 bg-bg-elevated rounded-xl border border-border">
                  KI erstellt Kochanleitung…
                </div>
              ) : (
                <div className="text-sm text-text-secondary whitespace-pre-line leading-relaxed bg-bg-elevated rounded-xl p-3 border border-border">
                  {localKochanleitung ?? r.kochanleitung}
                </div>
              )}
            </div>
          )}

          {!r.zutaten_text && !r.kochanleitung && !localKochanleitung && !generatingInstr && (
            <div className="text-sm text-text-muted text-center py-6">
              Keine Zutaten oder Kochanleitung hinterlegt.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3 shrink-0">
          {!addToPlanOpen ? (
            <div className="flex gap-2">
              <button onClick={() => setAddToPlanOpen(true)}
                className="btn-primary flex items-center gap-2 flex-1 justify-center">
                <CalendarPlus size={16} /> Zum Wochenplan
              </button>
              <button onClick={() => { onDelete(); onClose() }}
                className="p-2.5 rounded-xl text-danger hover:bg-danger/10 border border-border transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-text-primary">Zum Wochenplan hinzufügen</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Tag</label>
                  <input type="date" className="input text-sm" value={planDatum}
                    min={todayISO()} onChange={e => setPlanDatum(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Mahlzeit</label>
                  <select className="input text-sm" value={planSlot} onChange={e => setPlanSlot(e.target.value)}>
                    {MEAL_SLOTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {added ? (
                <div className="flex items-center gap-2 text-sm text-success font-medium justify-center py-1">
                  <Check size={16} /> Hinzugefügt!
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={addToPlan} disabled={adding}
                    className="btn-primary flex-1 flex items-center gap-2 justify-center">
                    {adding ? <Spinner size={14} /> : <Check size={14} />}
                    {adding ? 'Speichern…' : `${datumLabel(planDatum)} · ${planSlot}`}
                  </button>
                  <button onClick={() => setAddToPlanOpen(false)} className="btn-secondary shrink-0 px-3">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface NewRezeptState {
  name: string; kalorien: string; protein_g: string
  kohlenhydrate_g: string; fett_g: string; portionen: string
  zutaten_text: string; kochanleitung: string
}
const emptyRezept: NewRezeptState = {
  name: '', kalorien: '', protein_g: '', kohlenhydrate_g: '', fett_g: '',
  portionen: '1', zutaten_text: '', kochanleitung: '',
}

function NewRezeptForm({ userId, onSaved, onCancel }: {
  userId: string; onSaved: (r: Rezept) => void; onCancel: () => void
}) {
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [form, setForm] = useState<NewRezeptState>(emptyRezept)
  const [generateImage, setGenerateImage] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof NewRezeptState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function importFromUrl() {
    const url = importUrl.trim()
    if (!url) return
    setImporting(true)
    setImportError('')
    const { data, error: fnErr } = await supabase.functions.invoke('extract-recipe-url', {
      body: { url },
    })
    setImporting(false)
    if (fnErr || data?.error) {
      setImportError(data?.error ?? fnErr?.message ?? 'Fehler beim Importieren')
      return
    }
    const r = data.recipe
    setForm({
      name: r.name ?? '',
      kalorien: r.kalorien ? String(Math.round(r.kalorien)) : '',
      protein_g: r.protein_g ? String(Math.round(r.protein_g)) : '',
      kohlenhydrate_g: r.kohlenhydrate_g ? String(Math.round(r.kohlenhydrate_g)) : '',
      fett_g: r.fett_g ? String(Math.round(r.fett_g)) : '',
      portionen: r.portionen ? String(r.portionen) : '1',
      zutaten_text: r.zutaten_text ?? '',
      kochanleitung: r.kochanleitung ?? '',
    })
  }

  async function save() {
    if (!form.name.trim() || !form.kalorien) { setError('Name und Kalorien sind Pflichtfelder.'); return }
    setSaving(true)

    let bild_url: string | null = null
    if (generateImage) {
      const { data: imgData } = await supabase.functions.invoke('generate-recipe-image', {
        body: { rezeptName: form.name.trim(), zutaten: form.zutaten_text || undefined },
      })
      bild_url = imgData?.imageDataUrl ?? null
    }

    const { data, error: err } = await supabase.from('rezepte').insert({
      user_id: userId,
      name: form.name.trim(),
      kalorien: parseInt(form.kalorien),
      protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
      kohlenhydrate_g: form.kohlenhydrate_g ? parseFloat(form.kohlenhydrate_g) : null,
      fett_g: form.fett_g ? parseFloat(form.fett_g) : null,
      portionen: parseInt(form.portionen) || 1,
      zutaten_text: form.zutaten_text.trim() || null,
      kochanleitung: form.kochanleitung.trim() || null,
      bild_url,
    }).select().single()

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Rezept)
  }

  return (
    <div className="p-4 bg-bg-elevated rounded-xl border border-primary/30 space-y-4">
      <div className="font-semibold text-sm text-text-primary">Neues Rezept</div>

      {/* URL Import */}
      <div className="space-y-2">
        <label className="label flex items-center gap-1.5"><Link size={13} /> Von Instagram / TikTok importieren</label>
        <div className="flex gap-2">
          <input className="input flex-1 text-sm" placeholder="https://www.instagram.com/p/... oder tiktok.com/..."
            value={importUrl} onChange={e => setImportUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && importFromUrl()} />
          <button onClick={importFromUrl} disabled={importing || !importUrl.trim()}
            className="btn-primary px-3 flex items-center gap-1.5 text-sm shrink-0 disabled:opacity-50">
            {importing ? <Spinner size={14} /> : <Wand2 size={14} />}
            {importing ? 'Lädt…' : 'Extrahieren'}
          </button>
        </div>
        {importError && <div className="text-xs text-danger">{importError}</div>}
      </div>

      <div className="border-t border-border" />

      {error && <div className="text-xs text-danger">{error}</div>}

      <input className="input" placeholder="Rezeptname *" value={form.name} onChange={set('name')} />

      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="number" placeholder="Kalorien *" value={form.kalorien} onChange={set('kalorien')} />
        <input className="input" type="number" placeholder="Portionen" value={form.portionen} onChange={set('portionen')} />
        <input className="input" type="number" placeholder="Protein (g)" value={form.protein_g} onChange={set('protein_g')} />
        <input className="input" type="number" placeholder="Kohlenhydrate (g)" value={form.kohlenhydrate_g} onChange={set('kohlenhydrate_g')} />
        <input className="input" type="number" placeholder="Fett (g)" value={form.fett_g} onChange={set('fett_g')} />
      </div>

      <textarea className="input resize-none text-sm" rows={2} placeholder="Zutaten (optional)"
        value={form.zutaten_text} onChange={set('zutaten_text')} />

      <textarea className="input resize-none text-sm" rows={4}
        placeholder="Kochanleitung (z.B.: 1. Zwiebeln schneiden... 2. Öl erhitzen...)"
        value={form.kochanleitung} onChange={set('kochanleitung')} />

      {/* Image generation toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div onClick={() => setGenerateImage(g => !g)}
          className={`w-9 h-5 rounded-full transition-colors relative ${generateImage ? 'bg-primary' : 'bg-border'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${generateImage ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-sm text-text-secondary flex items-center gap-1.5">
          <Image size={14} className="text-primary" /> KI-Bild automatisch generieren
        </span>
      </label>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="btn-primary flex items-center gap-1.5 text-sm flex-1 justify-center">
          {saving ? <Spinner size={14} /> : <Check size={14} />}
          {saving ? (generateImage ? 'Bild wird generiert…' : 'Speichern…') : 'Speichern'}
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm">Abbrechen</button>
      </div>
    </div>
  )
}

function RecipePickerModal({ rezepte, slot, datum, userId, onAdded, onClose }: {
  rezepte: Rezept[]; slot: string; datum: string; userId: string
  onAdded: (entry: MealPlanEntry) => void; onClose: () => void
}) {
  const [selected, setSelected] = useState<Rezept | null>(null)
  const [portionen, setPortionen] = useState(1)
  const [saving, setSaving] = useState(false)

  async function confirm() {
    if (!selected) return
    setSaving(true)
    const { data, error } = await supabase.from('meal_plans').insert({
      user_id: userId, datum, mahlzeit: slot,
      rezept_id: selected.id, rezept_name: selected.name, portionen,
      kalorien: Math.round(selected.kalorien * portionen),
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {rezepte.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">Noch keine Rezepte vorhanden.</p>
          )}
          {rezepte.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selected?.id === r.id ? 'border-primary bg-primary/10' : 'border-border hover:border-border-light bg-bg-elevated'
              }`}>
              <div className="font-medium text-sm text-text-primary">{r.name}</div>
              <div className="text-xs text-text-muted mt-0.5">{r.kalorien} kcal · {r.portionen} Port.</div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="p-4 border-t border-border space-y-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">Portionen:</span>
              <button onClick={() => setPortionen(p => Math.max(0.5, p - 0.5))} className="p-1.5 rounded-lg bg-bg-elevated border border-border">–</button>
              <span className="w-10 text-center font-medium text-text-primary">{portionen}</span>
              <button onClick={() => setPortionen(p => p + 0.5)} className="p-1.5 rounded-lg bg-bg-elevated border border-border">+</button>
              <span className="text-sm text-text-muted ml-auto">= {Math.round(selected.kalorien * portionen)} kcal</span>
            </div>
            <button onClick={confirm} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving ? <Spinner size={16} /> : <Check size={16} />} {selected.name} hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Wochenplan Tab ───────────────────────────────────────────────────────────

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
      const { data } = await supabase.from('meal_plans').select('*')
        .eq('user_id', userId).gte('datum', weekDays[0]).lte('datum', weekDays[6]).order('created_at')
      setEntries((data ?? []) as MealPlanEntry[])
      setLoading(false)
    }
    load()
  }, [weekOffset, userId])

  async function removeEntry(id: string) {
    await supabase.from('meal_plans').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
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

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <div className="space-y-3">
          {weekDays.map(datum => {
            const dayEntries = (slot: string) => entries.filter(e => e.datum === datum && e.mahlzeit === slot)
            const total = entries.filter(e => e.datum === datum).reduce((s, e) => s + (e.kalorien ?? 0), 0)
            const isToday = datum === todayISO()
            return (
              <div key={datum} className={`card border ${isToday ? 'border-primary/40' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold text-sm ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                    {fmtDayHeader(datum)}{isToday && <span className="ml-2 text-xs font-medium">Heute</span>}
                  </span>
                  {total > 0 && <span className="text-xs text-text-muted">{total.toLocaleString('de')} kcal</span>}
                </div>
                <div className="space-y-2">
                  {MEAL_SLOTS.map(slot => (
                    <div key={slot} className="flex items-start gap-2">
                      <span className="text-xs text-text-muted w-24 shrink-0 mt-1.5">{slot}</span>
                      <div className="flex-1 space-y-1">
                        {dayEntries(slot).map(e => (
                          <div key={e.id} className="flex items-center gap-2 px-2 py-1.5 bg-bg-elevated rounded-lg">
                            <span className="text-xs text-text-primary flex-1 truncate">
                              {e.rezept_name}{e.portionen !== 1 && <span className="text-text-muted"> ×{e.portionen}</span>}
                            </span>
                            {e.kalorien != null && <span className="text-xs text-text-muted shrink-0">{e.kalorien} kcal</span>}
                            <button onClick={() => removeEntry(e.id)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setPicker({ slot, datum })} className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors py-1">
                          <Plus size={12} /> Hinzufügen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {picker && (
        <RecipePickerModal rezepte={rezepte} slot={picker.slot} datum={picker.datum} userId={userId}
          onAdded={entry => { setEntries(e => [...e, entry]); setPicker(null) }}
          onClose={() => setPicker(null)} />
      )}
    </div>
  )
}

// ─── Einkaufsliste View ───────────────────────────────────────────────────────

function EinkaufslisteView({ liste }: { liste: Einkaufsliste }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const toggle = (key: string) =>
    setChecked(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  const shareText = buildShareText(liste)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Einkaufsliste', text: shareText })
    } else {
      copyToClipboard()
    }
  }

  const nonEmpty = liste.kategorien.filter(k => k.artikel.length > 0)
  const total = nonEmpty.reduce((s, k) => s + k.artikel.length, 0)
  const doneCount = checked.size

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            {doneCount}/{total} Artikel erledigt
          </div>
          {liste.budget_gesamt_ca && (
            <div className="text-xs text-text-muted mt-0.5">
              Geschätztes Budget: ~{liste.budget_gesamt_ca} €
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary transition-colors">
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            {copied ? 'Kopiert!' : 'Kopieren'}
          </button>
          <button onClick={share} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary hover:bg-primary/20 transition-colors">
            <Share2 size={13} /> Teilen
          </button>
        </div>
      </div>

      {liste.hinweis && (
        <div className="flex items-start gap-2 p-3 bg-bg-elevated rounded-xl border border-border text-xs text-text-muted">
          <Info size={13} className="shrink-0 mt-0.5" /> {liste.hinweis}
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {nonEmpty.map(kat => (
          <div key={kat.name} className="card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{kat.emoji}</span>
              <span className="font-semibold text-sm text-text-primary">{kat.name}</span>
              <span className="text-xs text-text-muted ml-auto">
                {kat.artikel.filter(a => checked.has(`${kat.name}::${a.name}`)).length}/{kat.artikel.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {kat.artikel.map(a => {
                const key = `${kat.name}::${a.name}`
                const done = checked.has(key)
                return (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                      done ? 'bg-success border-success' : 'border-border group-hover:border-primary/50'
                    }`} onClick={() => toggle(key)}>
                      {done && <Check size={11} className="text-white" />}
                    </div>
                    <span className={`text-sm transition-colors flex-1 ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      <span className="font-medium">{a.menge}</span> {a.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Koch-Chat View ───────────────────────────────────────────────────────────

function KochplanView({ guide }: { guide: string }) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  async function sendQuestion() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setChatHistory(h => [...h, { role: 'user', text: q }])
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('cooking-chat', {
        body: { guide, question: q, history: chatHistory.slice(-6) },
      })
      if (error) throw error
      setChatHistory(h => [...h, { role: 'ai', text: data.answer ?? 'Keine Antwort erhalten.' }])
    } catch {
      setChatHistory(h => [...h, { role: 'ai', text: 'Fehler beim Abrufen der Antwort. Bitte erneut versuchen.' }])
    }
    setLoading(false)
  }

  // Parse guide into sections (## heading\n steps)
  const sections = guide.split(/\n(?=##\s)/).filter(Boolean)

  return (
    <div className="space-y-4">
      {/* Cooking guide */}
      <div className="card border border-border space-y-4">
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <ChefHat size={18} className="text-primary" /> Meal Prep Anleitung
        </div>
        {sections.map((section, si) => {
          const lines = section.split('\n').filter(Boolean)
          const heading = lines[0].replace(/^##\s*/, '')
          const steps = lines.slice(1)
          return (
            <div key={si}>
              <div className="text-sm font-semibold text-primary mb-2">{heading}</div>
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const match = step.match(/^(\d+)\.\s*(.*)/)
                  if (match) {
                    return (
                      <div key={i} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {match[1]}
                        </span>
                        <span className="text-sm text-text-secondary leading-relaxed">{match[2]}</span>
                      </div>
                    )
                  }
                  return <p key={i} className="text-sm text-text-secondary leading-relaxed">{step}</p>
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chat */}
      <div className="card border border-border space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
          <MessageCircle size={16} className="text-primary" /> Fragen während dem Kochen
        </div>
        <p className="text-xs text-text-muted">
          Hast du eine Zutat nicht zur Hand? Frage hier — z.B. "Womit kann ich Brokkoli ersetzen?" oder "Wie lange hält das im Kühlschrank?"
        </p>

        {chatHistory.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-bg-elevated text-text-primary rounded-bl-sm border border-border'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-bg-elevated border border-border rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Frage stellen..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuestion()}
            disabled={loading}
          />
          <button
            onClick={sendQuestion}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {loading ? <Spinner size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── KI Planer Tab ────────────────────────────────────────────────────────────

interface MyHaushalt {
  id: string
  haushalt_name: string
  mitglieder: { user_id: string; anzeige_name: string; kalorien_ziel: number | null; praeferenzen: string | null }[]
}

function KiPlanerTab({ rezepte, userId, settings }: {
  rezepte: Rezept[]; userId: string; settings: Partial<ClientSettings>
}) {
  const [step, setStep] = useState<KiStep>('config')
  const [reviewTab, setReviewTab] = useState<ReviewTab>('plan')

  // Haushalt
  const [myHaushalt, setMyHaushalt] = useState<MyHaushalt | null>(null)
  const [fuerHaushalt, setFuerHaushalt] = useState(false)

  // Config
  const [budget, setBudget] = useState('')
  const [tage, setTage] = useState(5)
  const [startDatum, setStartDatum] = useState(todayISO())
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['Frühstück', 'Mittagessen', 'Abendessen'])
  const [wuensche, setWuensche] = useState('')
  const [planModus, setPlanModus] = useState<'abwechslungsreich' | 'baukasten'>('abwechslungsreich')

  // Result
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const kalorien = settings.kalorie_tagesziel ?? 2000
  const personen = fuerHaushalt && myHaushalt ? myHaushalt.mitglieder.length : 1

  useEffect(() => {
    async function loadHaushalt() {
      const { data: mem } = await supabase
        .from('haushalt_mitglieder')
        .select('haushalt_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (!mem?.haushalt_id) return

      const [{ data: haushalt }, { data: members }] = await Promise.all([
        supabase.from('haushalte').select('name').eq('id', mem.haushalt_id).single(),
        supabase.from('haushalt_mitglieder').select('*').eq('haushalt_id', mem.haushalt_id),
      ])

      if (haushalt && members) {
        setMyHaushalt({
          id: mem.haushalt_id,
          haushalt_name: haushalt.name,
          mitglieder: members,
        })
      }
    }
    loadHaushalt()
  }, [userId])

  function toggleMeal(slot: string) {
    setSelectedMeals(s => s.includes(slot) ? s.filter(x => x !== slot) : [...s, slot])
  }

  async function generatePlan() {
    setStep('loading')
    setError('')
    try {
      const haushaltData = fuerHaushalt && myHaushalt ? {
        name: myHaushalt.haushalt_name,
        mitglieder: myHaushalt.mitglieder.map(m => ({
          name: m.anzeige_name,
          kalorien: m.kalorien_ziel ?? kalorien,
          praeferenzen: m.praeferenzen ?? '',
        })),
      } : null

      const { data, error: fnErr } = await supabase.functions.invoke('plan-meals', {
        body: {
          rezepte: rezepte.map(r => ({
            id: r.id, name: r.name, kalorien: r.kalorien,
            protein_g: r.protein_g, kohlenhydrate_g: r.kohlenhydrate_g,
            fett_g: r.fett_g, portionen: r.portionen, zutaten_text: r.zutaten_text,
          })),
          goals: {
            kalorien, protein: settings.protein_ziel ?? null,
            karbs: settings.karbs_ziel ?? null, fett: settings.fett_ziel ?? null,
          },
          tage, mahlzeiten: MEAL_SLOTS.filter(s => selectedMeals.includes(s)), startDatum,
          wuensche,
          planModus,
          budget: budget || null,
          personen: haushaltData ? haushaltData.mitglieder.length : 1,
          haushalt: haushaltData,
        },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (!data?.plan) throw new Error('Kein Plan erhalten.')
      setPlan(data.plan)
      setExpandedDay(data.plan.tage?.[0]?.datum ?? null)
      setReviewTab('plan')
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
        user_id: userId, datum: day.datum, mahlzeit: m.mahlzeit,
        rezept_id: m.rezept_id ?? null, rezept_name: m.rezept_name,
        portionen: m.portionen, kalorien: m.kalorien,
        protein_g: m.protein_g, kohlenhydrate_g: m.kohlenhydrate_g, fett_g: m.fett_g,
      }))
    )
    await supabase.from('meal_plans').insert(rows)
    setSaving(false)
    setStep('done')
  }

  const btnGroup = (value: number, options: number[], onChange: (v: number) => void, suffix = '') => (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            value === o ? 'bg-primary text-white border-primary' : 'bg-bg-elevated text-text-secondary border-border hover:border-primary/50'
          }`}>
          {o}{suffix}
        </button>
      ))}
    </div>
  )

  if (step === 'loading') return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size={40} />
      <div className="text-center">
        <div className="font-medium text-text-primary">KI erstellt deinen Plan & Einkaufsliste...</div>
        <div className="text-sm text-text-muted mt-1">Das dauert ca. 15–30 Sekunden.</div>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
        <Check size={32} className="text-success" />
      </div>
      <div>
        <div className="font-semibold text-text-primary text-lg">Plan gespeichert!</div>
        <div className="text-sm text-text-muted mt-1">Dein Meal Plan ist jetzt im Wochenplan sichtbar.</div>
      </div>
      <button onClick={() => setStep('config')} className="btn-secondary text-sm mt-2">Neuen Plan erstellen</button>
    </div>
  )

  if (step === 'review' && plan) {
    const reviewTabs: { id: ReviewTab; icon: React.ElementType; label: string }[] = [
      { id: 'plan', icon: CalendarDays, label: 'Wochenplan' },
      { id: 'einkauf', icon: ShoppingCart, label: 'Einkaufsliste' },
      { id: 'kochen', icon: ChefHat, label: 'Kochplan' },
    ]
    return (
      <div className="space-y-4">
        {/* Review tab nav */}
        <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border">
          {reviewTabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setReviewTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                reviewTab === id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}>
              <Icon size={14} /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Wochenplan review */}
        {reviewTab === 'plan' && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-text-primary">
              {plan.tage.length}-Tage Plan · {personen} Person{personen > 1 ? 'en' : ''}
            </div>
            {plan.tage.map(day => (
              <div key={day.datum} className="card border border-border">
                <button onClick={() => setExpandedDay(expandedDay === day.datum ? null : day.datum)}
                  className="w-full flex items-center justify-between text-left">
                  <span className="font-medium text-sm text-text-primary">
                    {day.tag}, {fmtDayHeader(day.datum).split(',')[1]?.trim()}
                  </span>
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
                            {m.rezept_name}{m.portionen !== 1 && <span className="text-text-muted"> ×{m.portionen}</span>}
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
            <div className="flex gap-3 pt-2">
              <button onClick={savePlan} disabled={saving} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                {saving ? <Spinner size={16} /> : <Check size={16} />} Plan im Wochenplan speichern
              </button>
              <button onClick={() => setStep('config')} className="btn-secondary shrink-0">Neu</button>
            </div>
          </div>
        )}

        {/* Einkaufsliste */}
        {reviewTab === 'einkauf' && plan.einkaufsliste && (
          <EinkaufslisteView liste={plan.einkaufsliste} />
        )}
        {reviewTab === 'einkauf' && !plan.einkaufsliste && (
          <div className="text-center py-12 text-text-muted text-sm">Keine Einkaufsliste im Plan enthalten.</div>
        )}

        {/* Kochplan + Chat */}
        {reviewTab === 'kochen' && <KochplanView guide={plan.meal_prep_guide} />}
      </div>
    )
  }

  // Config step
  return (
    <div className="space-y-6 max-w-lg">
      {/* Haushalt toggle (if available) */}
      {myHaushalt && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
            <Home size={16} className="text-primary" /> Haushalt: {myHaushalt.haushalt_name}
          </div>
          <p className="text-xs text-text-muted">
            Soll die KI den Plan für beide Personen mit ihren individuellen Präferenzen erstellen?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setFuerHaushalt(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                !fuerHaushalt ? 'bg-primary text-white border-primary' : 'bg-bg-elevated text-text-secondary border-border hover:border-primary/50'
              }`}>
              Nur für mich
            </button>
            <button onClick={() => setFuerHaushalt(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                fuerHaushalt ? 'bg-primary text-white border-primary' : 'bg-bg-elevated text-text-secondary border-border hover:border-primary/50'
              }`}>
              🏠 Für uns beide
            </button>
          </div>
          {fuerHaushalt && (
            <div className="space-y-1.5">
              {myHaushalt.mitglieder.map(m => (
                <div key={m.user_id} className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-text-primary w-20 shrink-0">{m.anzeige_name}:</span>
                  <span className="text-text-muted">{m.praeferenzen || 'Keine besonderen Präferenzen'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Planungsmodus */}
      <div className="space-y-2">
        <label className="label flex items-center gap-1.5"><Layers size={14} /> Planungsart</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setPlanModus('abwechslungsreich')}
            className={`p-3 rounded-xl text-left border transition-colors ${
              planModus === 'abwechslungsreich' ? 'bg-primary/10 border-primary' : 'bg-bg-elevated border-border hover:border-primary/40'
            }`}>
            <div className={`font-medium text-sm ${planModus === 'abwechslungsreich' ? 'text-text-primary' : 'text-text-secondary'}`}>🔄 Abwechslungsreich</div>
            <div className="text-xs text-text-muted mt-0.5">Täglich unterschiedliche Gerichte</div>
          </button>
          <button onClick={() => setPlanModus('baukasten')}
            className={`p-3 rounded-xl text-left border transition-colors ${
              planModus === 'baukasten' ? 'bg-primary/10 border-primary' : 'bg-bg-elevated border-border hover:border-primary/40'
            }`}>
            <div className={`font-medium text-sm ${planModus === 'baukasten' ? 'text-text-primary' : 'text-text-secondary'}`}>🧱 Baukasten</div>
            <div className="text-xs text-text-muted mt-0.5">Wenig kochen, mehrere Tage gleich</div>
          </button>
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <label className="label flex items-center gap-1.5"><Wallet size={14} /> Wöchentliches Budget <span className="text-text-muted font-normal">(optional)</span></label>
        <div className="relative">
          <input type="number" className="input pr-10" placeholder="z.B. 60" value={budget} onChange={e => setBudget(e.target.value)} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">€</span>
        </div>
      </div>

      {/* Days + date */}
      <div className="space-y-2">
        <label className="label">Für wie viele Tage?</label>
        {btnGroup(tage, [3, 5, 7], setTage)}
      </div>
      <div className="space-y-2">
        <label className="label">Ab welchem Datum?</label>
        <input type="date" className="input" value={startDatum} min={todayISO()} onChange={e => setStartDatum(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="label">Welche Mahlzeiten?</label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_SLOTS.map(slot => (
            <button key={slot} onClick={() => toggleMeal(slot)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                selectedMeals.includes(slot) ? 'bg-primary text-white border-primary' : 'bg-bg-elevated text-text-secondary border-border hover:border-primary/50'
              }`}>
              {selectedMeals.includes(slot) && <Check size={11} className="inline mr-1" />}
              {slot}
            </button>
          ))}
        </div>
        {selectedMeals.length === 0 && (
          <p className="text-xs text-danger">Wähle mindestens eine Mahlzeit aus.</p>
        )}
      </div>

      {/* Calorie goal info */}
      <div className="p-3 bg-bg-elevated rounded-xl border border-border flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-text-muted">Kalorienziel (aus Einstellungen)</div>
          <div className="font-bold text-text-primary">
            {fuerHaushalt && myHaushalt
              ? myHaushalt.mitglieder.map(m => `${m.anzeige_name}: ${(m.kalorien_ziel ?? kalorien).toLocaleString('de')} kcal`).join(' · ')
              : `${kalorien.toLocaleString('de')} kcal/Tag`}
          </div>
        </div>
      </div>

      {/* Wishes */}
      <div className="space-y-2">
        <label className="label">Besondere Wünsche <span className="text-text-muted font-normal">(optional)</span></label>
        <textarea className="input resize-none text-sm" rows={3}
          placeholder="z.B. viel Protein, glutenfrei, schnell zuzubereiten, vegan..."
          value={wuensche} onChange={e => setWuensche(e.target.value)} />
      </div>

      {rezepte.length === 0 && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning">
          Noch keine Rezepte vorhanden — die KI schlägt eigene Rezepte vor. Füge erst Rezepte hinzu für personalisierte Planung.
        </div>
      )}

      {error && <div className="text-sm text-danger">{error}</div>}

      <button onClick={generatePlan} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        <Sparkles size={18} /> Plan & Einkaufsliste erstellen
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
  const [detailRezept, setDetailRezept] = useState<Rezept | null>(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

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

  async function generateAllMissing() {
    const incomplete = rezepte.filter(r => !r.bild_url || !r.kochanleitung)
    if (incomplete.length === 0) return
    setBulkGenerating(true)
    setBulkProgress({ done: 0, total: incomplete.length })
    for (let i = 0; i < incomplete.length; i++) {
      const r = incomplete[i]
      setBulkProgress({ done: i, total: incomplete.length })
      try {
        if (!r.bild_url) {
          const { data } = await supabase.functions.invoke('generate-recipe-image', {
            body: { rezeptName: r.name, zutaten: r.zutaten_text ?? undefined },
          })
          if (data?.imageDataUrl) {
            await supabase.from('rezepte').update({ bild_url: data.imageDataUrl }).eq('id', r.id)
            setRezepte(prev => prev.map(x => x.id === r.id ? { ...x, bild_url: data.imageDataUrl } : x))
          }
        }
        if (!r.kochanleitung) {
          const { data } = await supabase.functions.invoke('generate-recipe-instructions', {
            body: {
              rezeptName: r.name, zutaten_text: r.zutaten_text,
              kalorien: r.kalorien, protein_g: r.protein_g,
              kohlenhydrate_g: r.kohlenhydrate_g, fett_g: r.fett_g,
              portionen: r.portionen,
            },
          })
          if (data?.kochanleitung) {
            await supabase.from('rezepte').update({ kochanleitung: data.kochanleitung }).eq('id', r.id)
            setRezepte(prev => prev.map(x => x.id === r.id ? { ...x, kochanleitung: data.kochanleitung } : x))
          }
        }
      } catch { /* continue */ }
    }
    setBulkProgress({ done: incomplete.length, total: incomplete.length })
    setBulkGenerating(false)
    setTimeout(() => setBulkProgress(null), 3000)
  }

  const filtered = rezepte.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const missingCount = rezepte.filter(r => !r.bild_url || !r.kochanleitung).length

  const tabs = [
    { id: 'rezepte' as Tab, icon: BookOpen, label: 'Rezepte' },
    { id: 'wochenplan' as Tab, icon: CalendarDays, label: 'Wochenplan' },
    { id: 'ki' as Tab, icon: Sparkles, label: 'KI Planer' },
  ]

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-2xl flex items-center gap-2">
          <ChefHat size={24} className="text-primary" /> Rezepte & Meal Prep
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Rezepte verwalten, Woche planen oder KI-Meal-Plan mit Einkaufsliste erstellen.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}>
            <Icon size={15} /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'rezepte' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input className="input flex-1" placeholder="Rezepte durchsuchen..." value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={() => setShowForm(f => !f)} className="btn-primary flex items-center gap-2 shrink-0">
              <Plus size={16} /><span className="hidden sm:inline">Neues Rezept</span>
            </button>
          </div>

          {/* Bulk generation banner */}
          {!rezepteLoading && missingCount > 0 && (
            <div className="flex items-center justify-between bg-bg-elevated rounded-xl border border-border px-4 py-3">
              <div className="text-sm text-text-secondary">
                {bulkProgress
                  ? `KI vervollständigt… ${bulkProgress.done}/${bulkProgress.total}`
                  : `${missingCount} Rezept${missingCount > 1 ? 'e fehlen' : ' fehlt'} Bild oder Anleitung`}
              </div>
              <button
                onClick={generateAllMissing}
                disabled={bulkGenerating}
                className="btn-secondary flex items-center gap-2 text-sm shrink-0"
              >
                {bulkGenerating ? <Spinner size={14} /> : <Wand2 size={14} />}
                {bulkGenerating ? 'Läuft…' : 'Alle vervollständigen'}
              </button>
            </div>
          )}
          {showForm && (
            <NewRezeptForm userId={user.id}
              onSaved={r => { setRezepte(prev => [...prev, r].sort((a, b) => a.name.localeCompare(b.name))); setShowForm(false) }}
              onCancel={() => setShowForm(false)} />
          )}
          {rezepteLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : filtered.length === 0 ? (
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
                  <RezeptCard key={r.id} r={r}
                    onOpenDetail={() => setDetailRezept(r)}
                    onDelete={() => deleteRezept(r.id)}
                    onImageGenerated={(id, url) =>
                      setRezepte(prev => prev.map(x => x.id === id ? { ...x, bild_url: url } : x))
                    }
                  />
                ))}
              </div>
            )}
        </div>
      )}

      {tab === 'wochenplan' && <WochenplanTab rezepte={rezepte} userId={user.id} />}
      {tab === 'ki' && <KiPlanerTab rezepte={rezepte} userId={user.id} settings={settings} />}

      {detailRezept && (
        <RezeptDetailModal
          r={detailRezept}
          userId={user.id}
          onClose={() => setDetailRezept(null)}
          onDelete={() => { deleteRezept(detailRezept.id); setDetailRezept(null) }}
          onImageGenerated={(id, url) => {
            setRezepte(prev => prev.map(x => x.id === id ? { ...x, bild_url: url } : x))
            setDetailRezept(prev => prev ? { ...prev, bild_url: url } : null)
          }}
          onInstructionsGenerated={(id, kochanleitung) => {
            setRezepte(prev => prev.map(x => x.id === id ? { ...x, kochanleitung } : x))
            setDetailRezept(prev => prev ? { ...prev, kochanleitung } : null)
          }}
        />
      )}
    </div>
  )
}
