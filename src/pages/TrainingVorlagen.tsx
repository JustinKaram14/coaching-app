import { useEffect, useState } from 'react'
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

const TRAINING_TYPES = ['Kraft', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Schwimmen', 'Radfahren', 'Laufen', 'Sonstiges']

interface UebungRow {
  id?: string; uebungsname: string; saetze: string; wdh: string; gewicht_kg: string
}

interface Vorlage {
  id: string; name: string; trainingstyp: string | null; created_at: string
  uebungen?: UebungRow[]; expanded?: boolean
}

export function TrainingVorlagen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', trainingstyp: 'Kraft' })
  const [uebungen, setUebungen] = useState<UebungRow[]>([
    { uebungsname: '', saetze: '', wdh: '', gewicht_kg: '' }
  ])

  async function load() {
    if (!user) return
    const { data: vData } = await supabase
      .from('training_vorlagen')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!vData?.length) { setVorlagen([]); setLoading(false); return }

    const ids = vData.map((v: any) => v.id)
    const { data: uData } = await supabase
      .from('vorlagen_uebungen')
      .select('*')
      .in('vorlage_id', ids)
      .order('reihenfolge')

    const uMap = (uData ?? []).reduce<Record<string, UebungRow[]>>((acc, u: any) => {
      if (!acc[u.vorlage_id]) acc[u.vorlage_id] = []
      acc[u.vorlage_id].push({ id: u.id, uebungsname: u.uebungsname, saetze: String(u.saetze ?? ''), wdh: String(u.wdh ?? ''), gewicht_kg: String(u.gewicht_kg ?? '') })
      return acc
    }, {})

    setVorlagen(vData.map((v: any) => ({ ...v, uebungen: uMap[v.id] ?? [] })))
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function addUebung() {
    setUebungen(u => [...u, { uebungsname: '', saetze: '', wdh: '', gewicht_kg: '' }])
  }

  function updateUebung(i: number, field: string, val: string) {
    setUebungen(u => { const n = [...u]; n[i] = { ...n[i], [field]: val }; return n })
  }

  function removeUebung(i: number) {
    setUebungen(u => u.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!user || !form.name) return
    setSaving(true)

    const { data: vorlage } = await supabase
      .from('training_vorlagen')
      .insert({ user_id: user.id, name: form.name, trainingstyp: form.trainingstyp })
      .select()
      .single()

    if (vorlage) {
      const validUebungen = uebungen.filter(u => u.uebungsname.trim())
      if (validUebungen.length) {
        await supabase.from('vorlagen_uebungen').insert(
          validUebungen.map((u, i) => ({
            vorlage_id: vorlage.id,
            uebungsname: u.uebungsname,
            saetze: u.saetze ? parseInt(u.saetze) : null,
            wdh: u.wdh ? parseInt(u.wdh) : null,
            gewicht_kg: u.gewicht_kg ? parseFloat(u.gewicht_kg) : null,
            reihenfolge: i,
          }))
        )
      }
    }

    await load()
    setOpen(false)
    setForm({ name: '', trainingstyp: 'Kraft' })
    setUebungen([{ uebungsname: '', saetze: '', wdh: '', gewicht_kg: '' }])
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('training_vorlagen').delete().eq('id', id)
    setVorlagen(v => v.filter(x => x.id !== id))
  }

  function toggle(id: string) {
    setVorlagen(v => v.map(x => x.id === id ? { ...x, expanded: !x.expanded } : x))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/training')} className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="section-title text-2xl">Trainingsvorlagen</h1>
            <p className="text-text-secondary text-sm mt-0.5">Push Day, Pull Day, Legs…</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Vorlage erstellen
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : vorlagen.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={BookOpen}
              title="Noch keine Vorlagen"
              description="Erstelle Vorlagen für deine typischen Trainingstage — Push Day, Pull Day, Legs…"
              action={
                <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2 mx-auto">
                  <Plus size={16} /> Erste Vorlage erstellen
                </button>
              }
            />
          </div>
        ) : vorlagen.map(v => (
          <div key={v.id} className="card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-text-primary">{v.name}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {v.trainingstyp} · {v.uebungen?.length ?? 0} Übungen
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(v.id)} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
                  {v.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {v.expanded && (v.uebungen?.length ?? 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                {v.uebungen!.map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-bg-elevated">
                    <span className="font-medium text-text-primary">{u.uebungsname}</span>
                    <span className="text-text-secondary text-xs">
                      {u.saetze && u.wdh ? `${u.saetze}×${u.wdh}` : ''}
                      {u.gewicht_kg ? ` @ ${u.gewicht_kg}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Vorlage erstellen" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                className="input"
                placeholder="z.B. Push Day"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.trainingstyp} onChange={e => setForm(f => ({ ...f, trainingstyp: e.target.value }))}>
                {TRAINING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Übungen</div>
            <div className="space-y-3">
              {uebungen.map((u, i) => (
                <div key={i} className="p-3 bg-bg-elevated rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm py-2"
                      placeholder="Übungsname (z.B. Bankdrücken)"
                      value={u.uebungsname}
                      onChange={e => updateUebung(i, 'uebungsname', e.target.value)}
                    />
                    <button onClick={() => removeUebung(i)} className="p-2 rounded hover:bg-danger/10 hover:text-danger text-text-muted">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Sätze</label>
                      <input type="number" className="input text-sm py-2" placeholder="4" value={u.saetze} onChange={e => updateUebung(i, 'saetze', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Wdh.</label>
                      <input type="number" className="input text-sm py-2" placeholder="8" value={u.wdh} onChange={e => updateUebung(i, 'wdh', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Gewicht (kg)</label>
                      <input type="number" step="0.5" className="input text-sm py-2" placeholder="80" value={u.gewicht_kg} onChange={e => updateUebung(i, 'gewicht_kg', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addUebung} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Plus size={14} /> Übung hinzufügen
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving || !form.name}>
              {saving && <Spinner size={16} />}
              Vorlage speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
