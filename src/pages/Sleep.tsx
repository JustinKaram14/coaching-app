import { useEffect, useState } from 'react'
import { Plus, Trash2, Moon, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, calcSleepHours, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { SchlafEntry } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      <div className="text-text-primary font-bold">{payload[0]?.value}h</div>
    </div>
  )
}

function QualityStars({ value }: { value: number | null }) {
  if (!value) return <span className="text-text-muted">--</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < value ? 'bg-primary' : 'bg-border'}`} />
      ))}
      <span className="ml-1.5 text-xs text-text-secondary">{value}/10</span>
    </div>
  )
}

export function Sleep() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<SchlafEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sleepGoal, setSleepGoal] = useState(8)
  const [form, setForm] = useState({ datum: todayISO(), einschlafzeit: '23:00', aufwachzeit: '07:00', schlafqualitaet: '7', notizen: '' })

  async function load() {
    if (!user) return
    const [entriesRes, settingsRes] = await Promise.all([
      supabase.from('schlaf').select('*').eq('user_id', user.id).order('datum', { ascending: true }),
      supabase.from('client_settings').select('schlaf_ziel').eq('user_id', user.id).single(),
    ])
    setEntries(entriesRes.data ?? [])
    setSleepGoal(settingsRes.data?.schlaf_ziel ?? 8)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('schlaf').upsert({
      user_id: user.id,
      datum: form.datum,
      einschlafzeit: form.einschlafzeit,
      aufwachzeit: form.aufwachzeit,
      schlafqualitaet: form.schlafqualitaet ? parseInt(form.schlafqualitaet) : null,
      notizen: form.notizen || null,
    }, { onConflict: 'user_id,datum' })
    await load()
    setOpen(false)
    setForm({ datum: todayISO(), einschlafzeit: '23:00', aufwachzeit: '07:00', schlafqualitaet: '7', notizen: '' })
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('schlaf').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const withHours = entries
    .filter(e => e.einschlafzeit && e.aufwachzeit)
    .map(e => ({
      ...e,
      stunden: calcSleepHours(e.einschlafzeit!, e.aufwachzeit!),
      datumLabel: formatDate(e.datum, 'dd.MM'),
    }))

  const avgSleep = withHours.length
    ? Math.round(withHours.reduce((a, b) => a + b.stunden, 0) / withHours.length * 10) / 10
    : null

  const avgQuality = entries.filter(e => e.schlafqualitaet).length
    ? Math.round(entries.filter(e => e.schlafqualitaet).reduce((a, b) => a + (b.schlafqualitaet ?? 0), 0) / entries.filter(e => e.schlafqualitaet).length * 10) / 10
    : null

  const chartData = withHours.slice(-21)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Schlaf</h1>
          <p className="text-text-secondary text-sm mt-0.5">Schlafdauer & Qualitätstracking</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Eintragen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgSleep ? `${avgSleep}h` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Schlafdauer</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{sleepGoal}h</div>
          <div className="text-xs text-text-muted mt-1">Schlafziel</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgQuality ? `${avgQuality}/10` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Qualität</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-6">Schlafdauer Verlauf</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
              <XAxis dataKey="datumLabel" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 12]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={sleepGoal} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Ziel', fill: '#10b981', fontSize: 11 }} />
              <Bar dataKey="stunden" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <h2 className="section-title mb-4">Einträge</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Moon} title="Noch keine Schlafeinträge" description="Trage täglich deine Schlafzeiten ein." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th>
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Eingeschlafen</th>
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Aufgewacht</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Dauer</th>
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Qualität</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map(e => {
                  const stunden = e.einschlafzeit && e.aufwachzeit ? calcSleepHours(e.einschlafzeit, e.aufwachzeit) : null
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-2.5 px-3 text-text-secondary">{formatDate(e.datum)}</td>
                      <td className="py-2.5 px-3 text-text-primary">{e.einschlafzeit ?? '--'}</td>
                      <td className="py-2.5 px-3 text-text-primary">{e.aufwachzeit ?? '--'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-semibold ${stunden !== null && stunden >= sleepGoal ? 'text-success' : stunden !== null ? 'text-warning' : 'text-text-muted'}`}>
                          {stunden !== null ? `${stunden}h` : '--'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <QualityStars value={e.schlafqualitaet} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Schlaf eintragen">
        <div className="space-y-4">
          <div>
            <label className="label">Datum</label>
            <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Eingeschlafen um</label>
              <input type="time" className="input" value={form.einschlafzeit} onChange={e => setForm(f => ({ ...f, einschlafzeit: e.target.value }))} />
            </div>
            <div>
              <label className="label">Aufgewacht um</label>
              <input type="time" className="input" value={form.aufwachzeit} onChange={e => setForm(f => ({ ...f, aufwachzeit: e.target.value }))} />
            </div>
          </div>
          {form.einschlafzeit && form.aufwachzeit && (
            <div className="p-3 bg-bg-elevated rounded-lg text-center">
              <span className="text-text-muted text-sm">Schlafdauer: </span>
              <span className="font-bold text-text-primary">{calcSleepHours(form.einschlafzeit, form.aufwachzeit)}h</span>
            </div>
          )}
          <div>
            <label className="label">Schlafqualität (1–10)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="1" max="10" className="flex-1 accent-primary"
                value={form.schlafqualitaet}
                onChange={e => setForm(f => ({ ...f, schlafqualitaet: e.target.value }))}
              />
              <span className="w-8 text-center font-bold text-text-primary">{form.schlafqualitaet}</span>
            </div>
          </div>
          <div>
            <label className="label">Notizen (optional)</label>
            <input type="text" className="input" placeholder="Wie hast du geschlafen?" value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
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
