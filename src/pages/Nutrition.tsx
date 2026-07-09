import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, Camera, Sparkles, X, Search,
  ChevronLeft, ChevronRight, Droplets, Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { todayISO } from '../lib/utils'
import { Spinner } from '../components/ui/Spinner'
import type { FoodLogItem, WasserLogEntry } from '../types/database'

// ─── Local types ──────────────────────────────────────────────────────────────

interface OFFNutriments {
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
}

interface OFFProduct {
  product_name?: string
  product_name_de?: string
  brands?: string
  nutriments?: OFFNutriments
  serving_quantity?: number
}

interface NutritionGoals {
  kalorie_tagesziel: number
  protein_ziel: number
  karbs_ziel: number
  fett_ziel: number
}

interface FoodItemInput {
  name: string
  menge_g: number | null
  kalorien: number
  protein_g: number
  kohlenhydrate_g: number
  fett_g: number
  barcode?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEALS = [
  { id: 'Frühstück', icon: '🌅', color: '#f59e0b' },
  { id: 'Mittagessen', icon: '☀️', color: '#6366f1' },
  { id: 'Abendessen', icon: '🌙', color: '#8b5cf6' },
  { id: 'Snack', icon: '🍎', color: '#10b981' },
] as const

const WATER_GOAL_ML = 2000
const WATER_GLASS_ML = 250

// ─── Date helpers ─────────────────────────────────────────────────────────────

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateLabel(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Heute'
  if (iso === shiftDate(today, -1)) return 'Gestern'
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

// ─── CalorieRing ──────────────────────────────────────────────────────────────

function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0
  const over = eaten > goal

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <svg width="136" height="136" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={over ? '#ef4444' : '#6366f1'} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="60" y="53" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">{eaten}</text>
        <text x="60" y="67" textAnchor="middle" fill="#6b7280" fontSize="8">kcal gegessen</text>
        <text x="60" y="81" textAnchor="middle" fill={over ? '#ef4444' : '#10b981'} fontSize="8" fontWeight="600">
          {over ? `+${eaten - goal} über Ziel` : `${goal - eaten} übrig`}
        </text>
      </svg>
      <div className="text-[11px] text-text-muted">Ziel: {goal} kcal</div>
    </div>
  )
}

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0
  const over = value > goal
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className={over ? 'text-danger font-medium' : 'text-text-primary'}>
          {value}g <span className="text-text-muted">/ {goal}g</span>
        </span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }} />
      </div>
    </div>
  )
}

// ─── WaterTracker ─────────────────────────────────────────────────────────────

function WaterTracker({ entries, onAdd, onRemoveLast }: {
  entries: WasserLogEntry[]
  onAdd: () => void
  onRemoveLast: () => void
}) {
  const totalMl = entries.reduce((a, e) => a + e.menge_ml, 0)
  const glasses = entries.length
  const goalGlasses = WATER_GOAL_ML / WATER_GLASS_ML

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={16} className="text-blue-400" />
          <span className="font-semibold text-text-primary text-sm">Wasser</span>
        </div>
        <span className="text-xs text-text-secondary">{totalMl} / {WATER_GOAL_ML} ml</span>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {Array.from({ length: goalGlasses }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-center rounded-lg border transition-all ${
              i < glasses
                ? 'bg-blue-500/20 border-blue-400 text-blue-400'
                : 'bg-bg border-border text-border'
            }`}
            style={{ width: 36, height: 44 }}
          >
            <Droplets size={14} />
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{glasses} von {goalGlasses} Gläsern</span>
        <div className="flex gap-1">
          {glasses > 0 && (
            <button onClick={onRemoveLast}
              className="text-xs text-text-muted hover:text-danger transition-colors px-2 py-1 rounded">
              entfernen
            </button>
          )}
          <button onClick={onAdd}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5 px-2 py-1 rounded">
            <Plus size={11} /> 250 ml
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FoodSearch (Open Food Facts) ────────────────────────────────────────────

function FoodSearch({ onSelect }: { onSelect: (p: OFFProduct) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<OFFProduct[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&json=1&page_size=20&fields=product_name,product_name_de,brands,nutriments,serving_quantity&lc=de&cc=de`
      )
      const data = await res.json()
      const products = ((data.products ?? []) as OFFProduct[]).filter(p =>
        (p.product_name || p.product_name_de) && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0
      )
      setResults(products.slice(0, 15))
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q), 500)
    return () => clearTimeout(timer.current)
  }, [q, doSearch])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="search" className="input pl-9"
          placeholder="Lebensmittel suchen..."
          value={q} onChange={e => setQ(e.target.value)}
          autoFocus
        />
      </div>
      {loading && <div className="flex justify-center py-4"><Spinner /></div>}
      {results.length > 0 && (
        <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 260 }}>
          {results.map((p, i) => {
            const n = p.nutriments ?? {}
            const name = p.product_name_de || p.product_name || ''
            return (
              <button key={i} onClick={() => onSelect(p)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-bg-elevated hover:bg-primary/10 text-left transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{name}</div>
                  {p.brands && <div className="text-xs text-text-muted truncate">{p.brands}</div>}
                </div>
                <div className="text-right text-xs ml-3 shrink-0">
                  <div className="font-semibold text-text-primary">
                    {Math.round(n['energy-kcal_100g'] ?? 0)} kcal
                  </div>
                  <div className="text-text-secondary">
                    P:{Math.round((n.proteins_100g ?? 0) * 10) / 10}
                    {' '}K:{Math.round((n.carbohydrates_100g ?? 0) * 10) / 10}
                    {' '}F:{Math.round((n.fat_100g ?? 0) * 10) / 10}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
      {q.length >= 2 && !loading && results.length === 0 && (
        <p className="text-center py-6 text-sm text-text-muted">Keine Ergebnisse gefunden</p>
      )}
    </div>
  )
}

// ─── PortionSelector ─────────────────────────────────────────────────────────

function PortionSelector({ product, barcode, onConfirm, onBack }: {
  product: OFFProduct
  barcode?: string
  onConfirm: (item: FoodItemInput) => void
  onBack: () => void
}) {
  const [menge, setMenge] = useState(String(product.serving_quantity ?? 100))
  const n = product.nutriments ?? {}
  const g = parseFloat(menge) || 0
  const f = g / 100
  const name = product.product_name_de || product.product_name || 'Unbekannt'

  const macros = {
    kalorien: Math.round((n['energy-kcal_100g'] ?? 0) * f),
    protein_g: Math.round((n.proteins_100g ?? 0) * f * 10) / 10,
    kohlenhydrate_g: Math.round((n.carbohydrates_100g ?? 0) * f * 10) / 10,
    fett_g: Math.round((n.fat_100g ?? 0) * f * 10) / 10,
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="font-semibold text-text-primary text-sm">{name}</div>
        {product.brands && <div className="text-xs text-text-muted">{product.brands}</div>}
        <div className="text-[11px] text-text-muted mt-0.5">
          pro 100g: {Math.round(n['energy-kcal_100g'] ?? 0)} kcal ·
          {' '}P:{Math.round((n.proteins_100g ?? 0) * 10) / 10}g ·
          {' '}K:{Math.round((n.carbohydrates_100g ?? 0) * 10) / 10}g ·
          {' '}F:{Math.round((n.fat_100g ?? 0) * 10) / 10}g
        </div>
      </div>
      <div>
        <label className="label">Menge (g)</label>
        <input type="number" className="input" value={menge}
          onChange={e => setMenge(e.target.value)} min="1" max="5000" autoFocus />
      </div>
      {g > 0 && (
        <div className="grid grid-cols-4 gap-2 p-3 bg-bg-elevated rounded-xl">
          {([
            { l: 'Kalorien', v: macros.kalorien, u: 'kcal' },
            { l: 'Protein', v: macros.protein_g, u: 'g' },
            { l: 'Karbs', v: macros.kohlenhydrate_g, u: 'g' },
            { l: 'Fett', v: macros.fett_g, u: 'g' },
          ] as const).map(m => (
            <div key={m.l} className="text-center">
              <div className="text-sm font-bold text-text-primary">{m.v}</div>
              <div className="text-[10px] text-text-muted">{m.u}</div>
              <div className="text-[10px] text-text-muted">{m.l}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">Zurück</button>
        <button
          onClick={() => onConfirm({ name, menge_g: g, ...macros, barcode })}
          disabled={g <= 0}
          className="btn-primary flex-1"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  )
}

// ─── AddFoodModal ─────────────────────────────────────────────────────────────

type AddTab = 'search' | 'barcode' | 'photo' | 'manual'

function AddFoodModal({ meal, onClose, onAdd }: {
  meal: string
  onClose: () => void
  onAdd: (item: FoodItemInput) => Promise<void>
}) {
  const [tab, setTab] = useState<AddTab>('search')
  const [selectedProduct, setSelectedProduct] = useState<OFFProduct | null>(null)
  const [selectedBarcode, setSelectedBarcode] = useState<string | undefined>()
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<FoodItemInput | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [manual, setManual] = useState({
    name: '', kalorien: '', protein_g: '', kohlenhydrate_g: '', fett_g: '', menge_g: '',
  })

  async function lookupBarcode(code: string) {
    setBarcodeLoading(true)
    setBarcodeError('')
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      const p = data.product as OFFProduct | undefined
      if (data.status === 1 && p?.nutriments?.['energy-kcal_100g']) {
        setSelectedProduct(p)
        setSelectedBarcode(code)
      } else {
        setBarcodeError('Produkt nicht gefunden. Bitte Nummer prüfen oder manuell eingeben.')
      }
    } catch {
      setBarcodeError('Netzwerkfehler. Bitte erneut versuchen.')
    }
    setBarcodeLoading(false)
  }

  function handleCameraCapture(file: File) {
    if (!('BarcodeDetector' in window)) {
      setBarcodeError('Barcode-Scanner nicht verfügbar. Bitte Nummer unten eingeben.')
      return
    }
    createImageBitmap(file)
      .then(img => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        })
        return detector.detect(img) as Promise<Array<{ rawValue: string }>>
      })
      .then(codes => {
        if (codes.length > 0) {
          lookupBarcode(codes[0].rawValue)
        } else {
          setBarcodeError('Kein Barcode erkannt. Bitte manuell eingeben.')
        }
      })
      .catch(() => setBarcodeError('Scan fehlgeschlagen. Bitte manuell eingeben.'))
  }

  async function analyzePhoto(file: File) {
    setAnalyzing(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      setPhotoPreview(reader.result as string)
      try {
        const { data } = await supabase.functions.invoke('analyze-screenshot', {
          body: { imageBase64: base64, mimeType: file.type, context: 'nutrition' },
        })
        if (data?.result) {
          const r = data.result
          setAiResult({
            name: r.notizen || r.name || 'KI-Analyse',
            kalorien: Math.round(r.kalorien ?? 0),
            protein_g: Math.round((r.protein_g ?? 0) * 10) / 10,
            kohlenhydrate_g: Math.round((r.kohlenhydrate_g ?? 0) * 10) / 10,
            fett_g: Math.round((r.fett_g ?? 0) * 10) / 10,
            menge_g: null,
          })
        }
      } catch {
        setBarcodeError('KI-Analyse fehlgeschlagen.')
      }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleAdd(item: FoodItemInput) {
    setSaving(true)
    await onAdd(item)
    setSaving(false)
  }

  function switchTab(t: AddTab) {
    setTab(t)
    setSelectedProduct(null)
    setSelectedBarcode(undefined)
    setBarcodeError('')
  }

  const TABS: { id: AddTab; emoji: string; label: string }[] = [
    { id: 'search', emoji: '🔍', label: 'Suchen' },
    { id: 'barcode', emoji: '📷', label: 'Barcode' },
    { id: 'photo', emoji: '✨', label: 'KI-Foto' },
    { id: 'manual', emoji: '✏️', label: 'Manuell' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-t-2xl overflow-y-auto"
        style={{ background: '#1a1d24', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 pt-3 pb-3 border-b border-border" style={{ background: '#1a1d24' }}>
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary text-sm">Hinzufügen — {meal}</h3>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded-lg">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-0.5 bg-bg rounded-xl p-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all ${
                  tab === t.id ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-sm">{t.emoji}</span>
                <span className="text-[11px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {selectedProduct && (tab === 'search' || tab === 'barcode') ? (
            <PortionSelector
              product={selectedProduct}
              barcode={selectedBarcode}
              onConfirm={item => handleAdd(item)}
              onBack={() => { setSelectedProduct(null); setSelectedBarcode(undefined) }}
            />
          ) : (
            <>
              {tab === 'search' && (
                <FoodSearch onSelect={p => { setSelectedProduct(p); setSelectedBarcode(undefined) }} />
              )}

              {tab === 'barcode' && (
                <div className="space-y-4">
                  {barcodeLoading ? (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Spinner />
                      <p className="text-sm text-text-secondary">Produkt wird geladen...</p>
                    </div>
                  ) : (
                    <>
                      <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Camera size={22} className="text-primary" />
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-text-primary text-sm">Barcode fotografieren</div>
                          <div className="text-xs text-text-muted mt-0.5">Kamera auf Produktbarcode richten</div>
                        </div>
                        <input
                          type="file" accept="image/*" className="hidden"
                          capture="environment"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCameraCapture(f) }}
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-text-muted whitespace-nowrap">oder manuell eingeben</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text" inputMode="numeric" className="input flex-1"
                          placeholder="Barcode-Nummer (z.B. 4008400401836)"
                          value={barcodeInput}
                          onChange={e => setBarcodeInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && barcodeInput) lookupBarcode(barcodeInput) }}
                        />
                        <button
                          onClick={() => lookupBarcode(barcodeInput)}
                          disabled={!barcodeInput}
                          className="btn-primary shrink-0 px-4 text-sm"
                        >
                          Suchen
                        </button>
                      </div>
                      {barcodeError && <p className="text-sm text-danger text-center">{barcodeError}</p>}
                    </>
                  )}
                </div>
              )}

              {tab === 'photo' && (
                <div className="space-y-4">
                  <input
                    ref={photoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) analyzePhoto(f) }}
                  />
                  {!photoPreview ? (
                    <button
                      onClick={() => photoRef.current?.click()}
                      className="w-full flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera size={24} className="text-primary" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-text-primary flex items-center gap-1.5 justify-center">
                          <Sparkles size={13} className="text-yellow-400" /> KI-Foto-Analyse
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          Foto der Mahlzeit, Verpackung oder Rezept
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <img src={photoPreview} alt="Mahlzeit" className="w-full h-44 object-cover rounded-xl" />
                        <button
                          onClick={() => { setPhotoPreview(null); setAiResult(null) }}
                          className="absolute top-2 right-2 p-1 rounded-full text-white"
                          style={{ background: 'rgba(0,0,0,0.55)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {analyzing ? (
                        <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl">
                          <Spinner size={18} />
                          <span className="text-sm text-text-secondary">KI analysiert Mahlzeit...</span>
                        </div>
                      ) : aiResult ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-bg-elevated rounded-xl">
                            <div className="text-sm font-medium text-text-primary mb-2">{aiResult.name}</div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {([
                                { l: 'Kalorien', v: aiResult.kalorien, u: 'kcal' },
                                { l: 'Protein', v: aiResult.protein_g, u: 'g' },
                                { l: 'Karbs', v: aiResult.kohlenhydrate_g, u: 'g' },
                                { l: 'Fett', v: aiResult.fett_g, u: 'g' },
                              ] as const).map(m => (
                                <div key={m.l}>
                                  <div className="text-sm font-bold text-text-primary">{m.v}</div>
                                  <div className="text-[10px] text-text-muted">{m.u}</div>
                                  <div className="text-[10px] text-text-muted">{m.l}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setPhotoPreview(null); setAiResult(null) }}
                              className="btn-secondary flex-1 text-sm"
                            >
                              Neu
                            </button>
                            <button
                              onClick={() => handleAdd(aiResult)}
                              disabled={saving}
                              className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm"
                            >
                              {saving ? <Spinner size={14} /> : <Check size={14} />}
                              Hinzufügen
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {tab === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      type="text" className="input" placeholder="z.B. Haferflocken"
                      value={manual.name}
                      onChange={e => setManual(m => ({ ...m, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Menge (g)</label>
                      <input type="number" className="input" placeholder="100"
                        value={manual.menge_g}
                        onChange={e => setManual(m => ({ ...m, menge_g: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Kalorien (kcal) *</label>
                      <input type="number" className="input" placeholder="350"
                        value={manual.kalorien}
                        onChange={e => setManual(m => ({ ...m, kalorien: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Protein (g)</label>
                      <input type="number" step="0.1" className="input" placeholder="12"
                        value={manual.protein_g}
                        onChange={e => setManual(m => ({ ...m, protein_g: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Kohlenhydrate (g)</label>
                      <input type="number" step="0.1" className="input" placeholder="50"
                        value={manual.kohlenhydrate_g}
                        onChange={e => setManual(m => ({ ...m, kohlenhydrate_g: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Fett (g)</label>
                      <input type="number" step="0.1" className="input" placeholder="8"
                        value={manual.fett_g}
                        onChange={e => setManual(m => ({ ...m, fett_g: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1 text-sm">Abbrechen</button>
                    <button
                      onClick={() => handleAdd({
                        name: manual.name,
                        kalorien: parseInt(manual.kalorien) || 0,
                        protein_g: parseFloat(manual.protein_g) || 0,
                        kohlenhydrate_g: parseFloat(manual.kohlenhydrate_g) || 0,
                        fett_g: parseFloat(manual.fett_g) || 0,
                        menge_g: manual.menge_g ? parseFloat(manual.menge_g) : null,
                      })}
                      disabled={!manual.name || !manual.kalorien || saving}
                      className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm"
                    >
                      {saving && <Spinner size={14} />}
                      Hinzufügen
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MealSection ─────────────────────────────────────────────────────────────

function MealSection({ meal, items, onAdd, onDelete }: {
  meal: typeof MEALS[number]
  items: FoodLogItem[]
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  const kcal = Math.round(items.reduce((a, i) => a + (i.kalorien ?? 0), 0))
  const prot = Math.round(items.reduce((a, i) => a + (i.protein_g ?? 0), 0) * 10) / 10

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{meal.icon}</span>
          <div>
            <div className="font-semibold text-text-primary text-sm">{meal.id}</div>
            {kcal > 0 && (
              <div className="text-xs text-text-secondary">{kcal} kcal · {prot}g Protein</div>
            )}
          </div>
        </div>
        <button
          onClick={onAdd}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>

      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl bg-bg">
              <div className="w-1.5 h-7 rounded-full shrink-0" style={{ backgroundColor: meal.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">{item.name}</div>
                <div className="text-xs text-text-secondary">
                  {item.kalorien} kcal
                  {item.menge_g ? ` · ${item.menge_g}g` : ''}
                  {item.protein_g ? ` · P: ${item.protein_g}g` : ''}
                </div>
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="w-full py-2.5 text-xs text-text-muted border border-dashed border-border/50 rounded-xl hover:border-primary/30 hover:text-text-secondary transition-colors"
        >
          + Lebensmittel hinzufügen
        </button>
      )}
    </div>
  )
}

// ─── Nutrition Page ───────────────────────────────────────────────────────────

export function Nutrition() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [items, setItems] = useState<FoodLogItem[]>([])
  const [water, setWater] = useState<WasserLogEntry[]>([])
  const [goals, setGoals] = useState<NutritionGoals>({
    kalorie_tagesziel: 2000,
    protein_ziel: 150,
    karbs_ziel: 250,
    fett_ziel: 70,
  })
  const [loading, setLoading] = useState(true)
  const [addingToMeal, setAddingToMeal] = useState<string | null>(null)

  const today = todayISO()

  async function load() {
    if (!user) return
    const [foodRes, waterRes, goalsRes] = await Promise.all([
      supabase.from('food_log').select('*').eq('user_id', user.id).eq('datum', date).order('created_at'),
      supabase.from('wasser_log').select('*').eq('user_id', user.id).eq('datum', date).order('created_at'),
      supabase.from('client_settings')
        .select('kalorie_tagesziel,protein_ziel,karbs_ziel,fett_ziel')
        .eq('user_id', user.id).single(),
    ])
    setItems((foodRes.data ?? []) as FoodLogItem[])
    setWater((waterRes.data ?? []) as WasserLogEntry[])
    if (goalsRes.data) {
      const d = goalsRes.data as Partial<NutritionGoals>
      setGoals(g => ({
        kalorie_tagesziel: d.kalorie_tagesziel ?? g.kalorie_tagesziel,
        protein_ziel: d.protein_ziel ?? g.protein_ziel,
        karbs_ziel: d.karbs_ziel ?? g.karbs_ziel,
        fett_ziel: d.fett_ziel ?? g.fett_ziel,
      }))
    }
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [user, date])

  const totals = {
    kalorien: Math.round(items.reduce((a, i) => a + (i.kalorien ?? 0), 0)),
    protein_g: Math.round(items.reduce((a, i) => a + (i.protein_g ?? 0), 0) * 10) / 10,
    kohlenhydrate_g: Math.round(items.reduce((a, i) => a + (i.kohlenhydrate_g ?? 0), 0) * 10) / 10,
    fett_g: Math.round(items.reduce((a, i) => a + (i.fett_g ?? 0), 0) * 10) / 10,
  }

  async function handleAdd(meal: string, item: FoodItemInput) {
    if (!user) return
    const { data } = await supabase.from('food_log').insert({
      user_id: user.id,
      datum: date,
      mahlzeit: meal,
      name: item.name,
      menge_g: item.menge_g,
      kalorien: item.kalorien,
      protein_g: item.protein_g,
      kohlenhydrate_g: item.kohlenhydrate_g,
      fett_g: item.fett_g,
      barcode: item.barcode ?? null,
    }).select().single()
    if (data) setItems(prev => [...prev, data as FoodLogItem])
    setAddingToMeal(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('food_log').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAddWater() {
    if (!user) return
    const { data } = await supabase.from('wasser_log').insert({
      user_id: user.id, datum: date, menge_ml: WATER_GLASS_ML,
    }).select().single()
    if (data) setWater(prev => [...prev, data as WasserLogEntry])
  }

  async function handleRemoveLastWater() {
    const last = water[water.length - 1]
    if (!last) return
    await supabase.from('wasser_log').delete().eq('id', last.id)
    setWater(prev => prev.slice(0, -1))
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="p-2 rounded-xl hover:bg-bg-elevated transition-colors text-text-secondary"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-text-primary">{formatDateLabel(date)}</div>
          <div className="text-xs text-text-muted">
            {new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </div>
        </div>
        <button
          onClick={() => date < today && setDate(shiftDate(date, 1))}
          disabled={date >= today}
          className={`p-2 rounded-xl transition-colors ${
            date >= today ? 'text-border cursor-default' : 'hover:bg-bg-elevated text-text-secondary'
          }`}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={36} /></div>
      ) : (
        <>
          {/* Calorie ring + macros */}
          <div className="card">
            <div className="flex items-center gap-4">
              <CalorieRing eaten={totals.kalorien} goal={goals.kalorie_tagesziel} />
              <div className="flex-1 space-y-3">
                <MacroBar label="Protein" value={totals.protein_g} goal={goals.protein_ziel} color="#6366f1" />
                <MacroBar label="Kohlenhydrate" value={totals.kohlenhydrate_g} goal={goals.karbs_ziel} color="#f59e0b" />
                <MacroBar label="Fett" value={totals.fett_g} goal={goals.fett_ziel} color="#10b981" />
              </div>
            </div>
          </div>

          {/* Meal sections */}
          {MEALS.map(meal => (
            <MealSection
              key={meal.id}
              meal={meal}
              items={items.filter(i => i.mahlzeit === meal.id)}
              onAdd={() => setAddingToMeal(meal.id)}
              onDelete={handleDelete}
            />
          ))}

          {/* Water */}
          <WaterTracker
            entries={water}
            onAdd={handleAddWater}
            onRemoveLast={handleRemoveLastWater}
          />
        </>
      )}

      {addingToMeal && (
        <AddFoodModal
          meal={addingToMeal}
          onClose={() => setAddingToMeal(null)}
          onAdd={item => handleAdd(addingToMeal, item)}
        />
      )}
    </div>
  )
}
