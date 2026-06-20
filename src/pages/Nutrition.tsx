import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Apple, Camera, Sparkles, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { ErnaehrungEntry } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const MAHLZEITEN = ['Tagesgesamt', 'Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

const MAHLZEIT_COLORS: Record<string, string> = {
  Frühstück: '#f59e0b',
  Mittagessen: '#6366f1',
  Abendessen: '#8b5cf6',
  Snack: '#10b981',
  Tagesgesamt: '#6366f1',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs space-y-1">
      <div className="text-text-muted">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-medium">{p.name}: {p.value} {p.unit || 'kcal'}</div>
      ))}
    </div>
  )
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number | null; color: string }) {
  const pct = value && goal ? Math.min((value / goal) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{value}g {goal ? `/ ${goal}g` : ''}</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function sumEntries(entries: ErnaehrungEntry[]) {
  return {
    kalorien: entries.reduce((a, e) => a + (e.kalorien ?? 0), 0),
    protein_g: Math.round(entries.reduce((a, e) => a + (e.protein_g ?? 0), 0) * 10) / 10,
    kohlenhydrate_g: Math.round(entries.reduce((a, e) => a + (e.kohlenhydrate_g ?? 0), 0) * 10) / 10,
    fett_g: Math.round(entries.reduce((a, e) => a + (e.fett_g ?? 0), 0) * 10) / 10,
    wasser_ml: entries.reduce((a, e) => a + (e.wasser_ml ?? 0), 0),
  }
}

export function Nutrition() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ErnaehrungEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState({ kalorie_tagesziel: 2000, protein_ziel: 150, karbs_ziel: 200, fett_ziel: 70 })
  const [form, setForm] = useState({
    datum: todayISO(), mahlzeit: 'Tagesgesamt', kalorien: '', protein_g: '', kohlenhydrate_g: '', fett_g: '', wasser_ml: '', notizen: '',
  })

  async function load() {
    if (!user) return
    const [entriesRes, settingsRes] = await Promise.all([
      supabase.from('ernaehrung').select('*').eq('user_id', user.id).order('datum', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('client_settings').select('kalorie_tagesziel,protein_ziel,karbs_ziel,fett_ziel').eq('user_id', user.id).single(),
    ])
    setEntries(entriesRes.data ?? [])
    if (settingsRes.data) setSettings(s => ({ ...s, ...settingsRes.data }))
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

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
          const n = data.result
          setForm(f => ({
            ...f,
            kalorien: n.kalorien ? String(Math.round(n.kalorien)) : f.kalorien,
            protein_g: n.protein_g ? String(Math.round(n.protein_g * 10) / 10) : f.protein_g,
            kohlenhydrate_g: n.kohlenhydrate_g ? String(Math.round(n.kohlenhydrate_g * 10) / 10) : f.kohlenhydrate_g,
            fett_g: n.fett_g ? String(Math.round(n.fett_g * 10) / 10) : f.fett_g,
            notizen: n.notizen || f.notizen,
          }))
        }
      } catch (e) {
        console.error('Analysis failed:', e)
      }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('ernaehrung').upsert({
      user_id: user.id,
      datum: form.datum,
      mahlzeit: form.mahlzeit,
      kalorien: form.kalorien ? parseInt(form.kalorien) : null,
      protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
      kohlenhydrate_g: form.kohlenhydrate_g ? parseFloat(form.kohlenhydrate_g) : null,
      fett_g: form.fett_g ? parseFloat(form.fett_g) : null,
      wasser_ml: form.wasser_ml ? parseInt(form.wasser_ml) : null,
      notizen: form.notizen || null,
    }, { onConflict: 'user_id,datum,mahlzeit' })
    await load()
    setOpen(false)
    setPhotoPreview(null)
    setForm({ datum: todayISO(), mahlzeit: 'Tagesgesamt', kalorien: '', protein_g: '', kohlenhydrate_g: '', fett_g: '', wasser_ml: '', notizen: '' })
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('ernaehrung').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const todayEntries = entries.filter(e => e.datum === todayISO())
  const todaySum = sumEntries(todayEntries)
  const hasToday = todayEntries.length > 0

  // Group entries by date for log display
  const byDate = entries.reduce<Record<string, ErnaehrungEntry[]>>((acc, e) => {
    if (!acc[e.datum]) acc[e.datum] = []
    acc[e.datum].push(e)
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Chart: sum per day
  const chartData = sortedDates.slice(0, 21).reverse().map(datum => ({
    datum: formatDate(datum, 'dd.MM'),
    kalorien: sumEntries(byDate[datum]).kalorien,
  }))

  const allDates = Object.keys(byDate)
  const avgKal = allDates.length
    ? Math.round(allDates.reduce((a, d) => a + sumEntries(byDate[d]).kalorien, 0) / allDates.length)
    : null
  const avgWater = allDates.filter(d => byDate[d].some(e => e.wasser_ml)).length
    ? Math.round(allDates.reduce((a, d) => a + sumEntries(byDate[d]).wasser_ml, 0) / allDates.filter(d => byDate[d].some(e => e.wasser_ml)).length)
    : null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Ernährung</h1>
          <p className="text-text-secondary text-sm mt-0.5">Makros & Kalorientracking</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Eintragen
        </button>
      </div>

      {/* Today's Overview */}
      {hasToday && (
        <div className="card bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Heute</h2>
            <span className="badge bg-success/10 text-success">{todaySum.kalorien} / {settings.kalorie_tagesziel} kcal</span>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-secondary">Kalorien</span>
              <span className="text-text-primary font-semibold">{Math.round((todaySum.kalorien / settings.kalorie_tagesziel) * 100)}%</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min((todaySum.kalorien / settings.kalorie_tagesziel) * 100, 100)}%` }} />
            </div>
          </div>
          {/* Per-meal breakdown if multiple entries */}
          {todayEntries.length > 1 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {todayEntries.map(e => (
                <span key={e.id} className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{ backgroundColor: `${MAHLZEIT_COLORS[e.mahlzeit ?? 'Tagesgesamt']}20`, color: MAHLZEIT_COLORS[e.mahlzeit ?? 'Tagesgesamt'] }}>
                  {e.mahlzeit}: {e.kalorien ?? 0} kcal
                </span>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <MacroBar label="Protein" value={todaySum.protein_g} goal={settings.protein_ziel} color="#6366f1" />
            <MacroBar label="Kohlenhydrate" value={todaySum.kohlenhydrate_g} goal={settings.karbs_ziel} color="#f59e0b" />
            <MacroBar label="Fett" value={todaySum.fett_g} goal={settings.fett_ziel} color="#10b981" />
          </div>
          {todaySum.wasser_ml > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Wasser heute:</span>
              <span className="font-semibold text-text-primary">{todaySum.wasser_ml} ml</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgKal ?? '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Kalorien/Tag</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{settings.kalorie_tagesziel}</div>
          <div className="text-xs text-text-muted mt-1">Kalorienziel</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgWater ? `${avgWater}ml` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Wasseraufnahme</div>
        </div>
      </div>

      {/* Calorie Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-6">Kalorienübersicht</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
              <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={settings.kalorie_tagesziel} stroke="#10b981" strokeDasharray="6 3" />
              <Bar dataKey="kalorien" fill="#6366f1" radius={[4, 4, 0, 0]} name="Kalorien" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log — grouped by date */}
      <div className="card">
        <h2 className="section-title mb-4">Ernährungslog</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Apple} title="Noch keine Ernährungseinträge" description="Trage täglich deine Makros und Kalorien ein." />
        ) : (
          <div className="space-y-4">
            {sortedDates.map(datum => {
              const dayEntries = byDate[datum]
              const daySum = sumEntries(dayEntries)
              return (
                <div key={datum}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{formatDate(datum)}</span>
                    <span className={`text-xs font-bold ${daySum.kalorien <= settings.kalorie_tagesziel ? 'text-success' : 'text-danger'}`}>
                      {daySum.kalorien} kcal gesamt
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayEntries.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl border border-border/50">
                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: MAHLZEIT_COLORS[e.mahlzeit ?? 'Tagesgesamt'] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text-primary">{e.mahlzeit ?? 'Tagesgesamt'}</span>
                            {e.notizen && <span className="text-xs text-text-muted truncate">{e.notizen}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-text-secondary flex-wrap">
                            {e.kalorien && <span>{e.kalorien} kcal</span>}
                            {e.protein_g && <span>P: {e.protein_g}g</span>}
                            {e.kohlenhydrate_g && <span>K: {e.kohlenhydrate_g}g</span>}
                            {e.fett_g && <span>F: {e.fett_g}g</span>}
                            {e.wasser_ml && <span>💧 {e.wasser_ml}ml</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setPhotoPreview(null) }} title="Ernährung eintragen">
        <div className="space-y-4">
          {/* Photo AI Analysis */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) analyzePhoto(e.target.files[0]) }} />
          <div onClick={() => fileRef.current?.click()}
            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
              ${photoPreview ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'}`}>
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Mahlzeit" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  {analyzing
                    ? <div className="flex items-center gap-2 text-sm text-primary"><Spinner size={14} /><span>Analysiere mit KI...</span></div>
                    : <div className="text-sm text-success font-medium flex items-center gap-1.5"><Sparkles size={14} />Makros automatisch ausgefüllt</div>
                  }
                  <div className="text-xs text-text-muted mt-0.5">Anderes Bild wählen</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setPhotoPreview(null) }}
                  className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors shrink-0">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Camera size={18} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Sparkles size={13} className="text-accent" /> KI-Analyse: Foto hochladen
                  </div>
                  <div className="text-xs text-text-muted">Mahlzeit, Rezept oder Screenshot — Makros werden automatisch erkannt</div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div>
              <label className="label">Mahlzeit</label>
              <select className="input" value={form.mahlzeit} onChange={e => setForm(f => ({ ...f, mahlzeit: e.target.value }))}>
                {MAHLZEITEN.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kalorien (kcal)</label>
              <input type="number" className="input" placeholder="2000" value={form.kalorien}
                onChange={e => setForm(f => ({ ...f, kalorien: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Wasser (ml)</label>
              <input type="number" className="input" placeholder="2500" value={form.wasser_ml}
                onChange={e => setForm(f => ({ ...f, wasser_ml: e.target.value }))} />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input type="number" step="0.1" className="input" placeholder="150" value={form.protein_g}
                onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))} />
            </div>
            <div>
              <label className="label">Kohlenhydrate (g)</label>
              <input type="number" step="0.1" className="input" placeholder="200" value={form.kohlenhydrate_g}
                onChange={e => setForm(f => ({ ...f, kohlenhydrate_g: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fett (g)</label>
              <input type="number" step="0.1" className="input" placeholder="70" value={form.fett_g}
                onChange={e => setForm(f => ({ ...f, fett_g: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notizen</label>
              <input type="text" className="input" placeholder="Optional" value={form.notizen}
                onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setOpen(false); setPhotoPreview(null) }} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving && <Spinner size={16} />}
              Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
