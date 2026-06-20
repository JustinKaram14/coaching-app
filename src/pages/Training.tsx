import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Timer, Flame, Activity, BookOpen, Camera, Sparkles, X, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { TrainingEntry, UebungEntry } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TRAINING_TYPES = ['Kraft', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Schwimmen', 'Radfahren', 'Laufen', 'Sonstiges']

interface TrainingWithExercises extends TrainingEntry {
  uebungen?: UebungEntry[]
  expanded?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      <div className="text-text-primary font-bold">{payload[0]?.value} min</div>
    </div>
  )
}

type UebungFormEntry = { uebungsname: string; saetze: string; wdh: string; gewicht_kg: string; notizen: string }
function UebungForm({ entries, onChange }: {
  entries: UebungFormEntry[]
  onChange: (entries: UebungFormEntry[]) => void
}) {
  function add() {
    onChange([...entries, { uebungsname: '', saetze: '', wdh: '', gewicht_kg: '', notizen: '' }])
  }
  function remove(i: number) {
    onChange(entries.filter((_, idx) => idx !== i))
  }
  function update(i: number, field: string, val: string) {
    const next = [...entries]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={i} className="p-3 bg-bg-elevated rounded-lg space-y-2">
          <div className="flex gap-2">
            <input className="input flex-1 text-sm py-2" placeholder="Übungsname" value={e.uebungsname} onChange={ev => update(i, 'uebungsname', ev.target.value)} />
            <button onClick={() => remove(i)} className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Sätze</label>
              <input type="number" className="input text-sm py-2" placeholder="3" value={e.saetze} onChange={ev => update(i, 'saetze', ev.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Wdh.</label>
              <input type="number" className="input text-sm py-2" placeholder="10" value={e.wdh} onChange={ev => update(i, 'wdh', ev.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Gewicht (kg)</label>
              <input type="number" step="0.5" className="input text-sm py-2" placeholder="80" value={e.gewicht_kg} onChange={ev => update(i, 'gewicht_kg', ev.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
        <Plus size={14} /> Übung hinzufügen
      </button>
    </div>
  )
}

export function Training() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<TrainingWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [selectedVorlage, setSelectedVorlage] = useState('')
  const [form, setForm] = useState({
    datum: todayISO(), trainingstyp: 'Kraft', dauer_min: '', avg_puls: '', kalorien_verbrannt: '', notizen: '',
  })
  const [uebungen, setUebungen] = useState<{ uebungsname: string; saetze: string; wdh: string; gewicht_kg: string; notizen: string }[]>([])

  async function load() {
    if (!user) return
    const { data } = await supabase.from('training').select('*').eq('user_id', user.id).order('datum', { ascending: false })
    const trainings = (data ?? []) as TrainingWithExercises[]
    // Load exercises for each training
    const ids = trainings.map(t => t.id)
    if (ids.length) {
      const { data: ex } = await supabase.from('uebungen').select('*').in('training_id', ids)
      const exMap = (ex ?? []).reduce<Record<string, UebungEntry[]>>((acc, e) => {
        if (!acc[e.training_id]) acc[e.training_id] = []
        acc[e.training_id].push(e)
        return acc
      }, {})
      trainings.forEach(t => { t.uebungen = exMap[t.id] ?? [] })
    }
    setEntries(trainings)
    setLoading(false)
  }

  async function loadVorlagen() {
    if (!user) return
    const { data: vData } = await supabase.from('training_vorlagen').select('*').eq('user_id', user.id)
    if (!vData?.length) return
    const { data: uData } = await supabase.from('vorlagen_uebungen').select('*').in('vorlage_id', vData.map((v: any) => v.id)).order('reihenfolge')
    const uMap = (uData ?? []).reduce<Record<string, any[]>>((acc, u: any) => {
      if (!acc[u.vorlage_id]) acc[u.vorlage_id] = []
      acc[u.vorlage_id].push(u)
      return acc
    }, {})
    setVorlagen(vData.map((v: any) => ({ ...v, uebungen: uMap[v.id] ?? [] })))
  }

  function applyVorlage(vorlageId: string) {
    const v = vorlagen.find(x => x.id === vorlageId)
    if (!v) return
    setForm(f => ({ ...f, trainingstyp: v.trainingstyp ?? f.trainingstyp }))
    setUebungen(v.uebungen.map((u: any) => ({
      uebungsname: u.uebungsname,
      saetze: String(u.saetze ?? ''),
      wdh: String(u.wdh ?? ''),
      gewicht_kg: String(u.gewicht_kg ?? ''),
      notizen: '',
    })))
    setSelectedVorlage(vorlageId)
  }

  useEffect(() => { load(); loadVorlagen() }, [user])

  async function analyzePhoto(file: File) {
    setAnalyzing(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      setPhotoPreview(reader.result as string)
      try {
        const { data } = await supabase.functions.invoke('analyze-screenshot', {
          body: { imageBase64: base64, mimeType: file.type, context: 'training' },
        })
        if (data?.result) {
          const r = data.result
          setForm(f => ({
            ...f,
            dauer_min: r.dauer_min ? String(r.dauer_min) : f.dauer_min,
            avg_puls: r.avg_puls ? String(r.avg_puls) : f.avg_puls,
            kalorien_verbrannt: r.kalorien_verbrannt ? String(r.kalorien_verbrannt) : f.kalorien_verbrannt,
            trainingstyp: r.trainingstyp && TRAINING_TYPES.includes(r.trainingstyp) ? r.trainingstyp : f.trainingstyp,
            notizen: r.notizen || f.notizen,
          }))
        }
      } catch (e) {
        console.error('Analysis failed:', e)
      }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  function toggleExpand(id: string) {
    setEntries(e => e.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t))
  }

  function openEdit(t: TrainingWithExercises) {
    setEditingId(t.id)
    setForm({
      datum: t.datum,
      trainingstyp: t.trainingstyp ?? 'Kraft',
      dauer_min: t.dauer_min ? String(t.dauer_min) : '',
      avg_puls: t.avg_puls ? String(t.avg_puls) : '',
      kalorien_verbrannt: t.kalorien_verbrannt ? String(t.kalorien_verbrannt) : '',
      notizen: t.notizen ?? '',
    })
    setUebungen(t.uebungen?.map(u => ({
      uebungsname: u.uebungsname,
      saetze: u.saetze ? String(u.saetze) : '',
      wdh: u.wdh ? String(u.wdh) : '',
      gewicht_kg: u.gewicht_kg ? String(u.gewicht_kg) : '',
      notizen: u.notizen ?? '',
    })) ?? [])
    setPhotoPreview(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditingId(null)
    setPhotoPreview(null)
    setForm({ datum: todayISO(), trainingstyp: 'Kraft', dauer_min: '', avg_puls: '', kalorien_verbrannt: '', notizen: '' })
    setUebungen([])
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)

    const payload = {
      datum: form.datum,
      trainingstyp: form.trainingstyp || null,
      dauer_min: form.dauer_min ? parseInt(form.dauer_min) : null,
      avg_puls: form.avg_puls ? parseInt(form.avg_puls) : null,
      kalorien_verbrannt: form.kalorien_verbrannt ? parseInt(form.kalorien_verbrannt) : null,
      notizen: form.notizen || null,
    }

    let trainingId: string

    if (editingId) {
      await supabase.from('training').update(payload).eq('id', editingId)
      trainingId = editingId
      // Replace exercises: delete old, insert new
      await supabase.from('uebungen').delete().eq('training_id', editingId)
    } else {
      const count = entries.length
      const einheit_id = `E-${String(count + 1).padStart(3, '0')}`
      const { data: training } = await supabase.from('training').insert({
        user_id: user.id, einheit_id, ...payload,
      }).select().single()
      trainingId = training!.id
    }

    if (uebungen.filter(u => u.uebungsname).length > 0) {
      await supabase.from('uebungen').insert(
        uebungen.filter(u => u.uebungsname).map(u => ({
          user_id: user.id,
          training_id: trainingId,
          uebungsname: u.uebungsname,
          saetze: u.saetze ? parseInt(u.saetze) : null,
          wdh: u.wdh ? parseInt(u.wdh) : null,
          gewicht_kg: u.gewicht_kg ? parseFloat(u.gewicht_kg) : null,
          notizen: u.notizen || null,
        }))
      )
    }

    await load()
    closeModal()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('uebungen').delete().eq('training_id', id)
    await supabase.from('training').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const chartData = [...entries].reverse().slice(-14).map(t => ({
    datum: formatDate(t.datum, 'dd.MM'),
    dauer: t.dauer_min ?? 0,
  }))

  const totalDauer = entries.reduce((a, t) => a + (t.dauer_min ?? 0), 0)
  const avgPuls = entries.filter(t => t.avg_puls).length
    ? Math.round(entries.reduce((a, t) => a + (t.avg_puls ?? 0), 0) / entries.filter(t => t.avg_puls).length)
    : null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Training</h1>
          <p className="text-text-secondary text-sm mt-0.5">Einheiten & Übungslog</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/training/vorlagen')} className="btn-secondary flex items-center gap-2">
            <BookOpen size={16} /> Vorlagen
          </button>
          <button onClick={() => { setEditingId(null); setForm({ datum: todayISO(), trainingstyp: 'Kraft', dauer_min: '', avg_puls: '', kalorien_verbrannt: '', notizen: '' }); setUebungen([]); setPhotoPreview(null); setOpen(true) }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Einheit eintragen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{entries.length}</div>
          <div className="text-xs text-text-muted mt-1">Einheiten gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{totalDauer > 0 ? `${Math.round(totalDauer / 60)}h` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Trainingszeit gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgPuls ? `${avgPuls} bpm` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Herzfrequenz</div>
        </div>
      </div>

      {/* Chart */}
      {entries.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-6">Trainingsdauer (letzte 14 Einheiten)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
              <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="dauer" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Training List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : entries.length === 0 ? (
          <div className="card">
            <EmptyState icon={Dumbbell} title="Noch keine Trainingseinheiten" description="Trage deine erste Trainingseinheit ein." />
          </div>
        ) : entries.map(t => (
          <div key={t.id} className="card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-primary">{t.trainingstyp ?? 'Training'}</span>
                  <span className="badge bg-primary/10 text-primary text-xs">{t.einheit_id}</span>
                  <span className="text-xs text-text-muted">{formatDate(t.datum)}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                  {t.dauer_min && <span className="flex items-center gap-1"><Timer size={12} /> {t.dauer_min} min</span>}
                  {t.avg_puls && <span className="flex items-center gap-1"><Activity size={12} /> {t.avg_puls} bpm</span>}
                  {t.kalorien_verbrannt && <span className="flex items-center gap-1"><Flame size={12} /> {t.kalorien_verbrannt} kcal</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(t.uebungen?.length ?? 0) > 0 && (
                  <button onClick={() => toggleExpand(t.id)} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
                    {t.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-text-muted transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {t.expanded && t.uebungen && t.uebungen.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs font-medium text-text-muted mb-3">Übungen</div>
                <div className="space-y-2">
                  {t.uebungen.map(u => (
                    <div key={u.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-bg-elevated">
                      <span className="font-medium text-text-primary">{u.uebungsname}</span>
                      <span className="text-text-secondary text-xs">
                        {u.saetze}×{u.wdh} {u.gewicht_kg ? `@ ${u.gewicht_kg}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={closeModal} title={editingId ? 'Trainingseinheit bearbeiten' : 'Trainingseinheit eintragen'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Photo AI */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) analyzePhoto(e.target.files[0]) }} />
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
              ${photoPreview ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'}`}
          >
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Workout" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  {analyzing ? (
                    <div className="flex items-center gap-2 text-sm text-primary"><Spinner size={14} /><span>Analysiere Workout...</span></div>
                  ) : (
                    <div className="text-sm text-success font-medium flex items-center gap-1.5"><Sparkles size={14} />Daten automatisch ausgefüllt</div>
                  )}
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
                    <Sparkles size={13} className="text-accent" />
                    Apple Watch Screenshot analysieren
                  </div>
                  <div className="text-xs text-text-muted">Dauer, Kalorien & Herzfrequenz werden automatisch erkannt</div>
                </div>
              </>
            )}
          </div>
          {/* Vorlage Selector */}
          {vorlagen.length > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <label className="label text-xs text-primary">Vorlage laden</label>
              <div className="flex gap-2">
                <select
                  className="input flex-1 text-sm"
                  value={selectedVorlage}
                  onChange={e => applyVorlage(e.target.value)}
                >
                  <option value="">— Vorlage auswählen —</option>
                  {vorlagen.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.uebungen.length} Übungen)</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div>
              <label className="label">Trainingstyp</label>
              <select className="input" value={form.trainingstyp} onChange={e => setForm(f => ({ ...f, trainingstyp: e.target.value }))}>
                {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dauer (Minuten)</label>
              <input type="number" className="input" placeholder="60" value={form.dauer_min} onChange={e => setForm(f => ({ ...f, dauer_min: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ø Puls (bpm)</label>
              <input type="number" className="input" placeholder="140" value={form.avg_puls} onChange={e => setForm(f => ({ ...f, avg_puls: e.target.value }))} />
            </div>
            <div>
              <label className="label">Kalorien verbrannt</label>
              <input type="number" className="input" placeholder="450" value={form.kalorien_verbrannt} onChange={e => setForm(f => ({ ...f, kalorien_verbrannt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notizen</label>
              <input type="text" className="input" placeholder="Optionale Notizen" value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Übungen (optional)</div>
            <UebungForm entries={uebungen} onChange={setUebungen} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
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
