import { useEffect, useState } from 'react'
import { Plus, Trash2, Scale } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { GewichtEntry } from '../types/database'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      <div className="text-text-primary font-bold">{payload[0]?.value} kg</div>
    </div>
  )
}

export function Weight() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<GewichtEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [form, setForm] = useState({ datum: todayISO(), gewicht: '', notizen: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!user) return
    const [entriesRes, settingsRes] = await Promise.all([
      supabase.from('gewicht').select('*').eq('user_id', user.id).order('datum', { ascending: true }),
      supabase.from('client_settings').select('zielgewicht').eq('user_id', user.id).single(),
    ])
    setEntries(entriesRes.data ?? [])
    setTargetWeight(settingsRes.data?.zielgewicht ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleSave() {
    if (!user || !form.gewicht) return
    setSaving(true)
    const val = parseFloat(form.gewicht)
    await supabase.from('gewicht').upsert({
      user_id: user.id,
      datum: form.datum,
      gewicht: val,
      notizen: form.notizen || null,
    }, { onConflict: 'user_id,datum' })
    await load()
    setOpen(false)
    setForm({ datum: todayISO(), gewicht: '', notizen: '' })
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('gewicht').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const chartData = entries.map(e => ({
    datum: formatDate(e.datum, 'dd.MM'),
    gewicht: e.gewicht,
  }))

  const currentWeight = entries.at(-1)?.gewicht
  const startWeight = entries[0]?.gewicht
  const change = currentWeight && startWeight ? currentWeight - startWeight : null
  const domainMin = entries.length ? Math.min(...entries.map(e => e.gewicht)) - 2 : 50
  const domainMax = entries.length ? Math.max(...entries.map(e => e.gewicht)) + 2 : 100

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Gewicht</h1>
          <p className="text-text-secondary text-sm mt-0.5">Tägliches Gewichtstracking</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Eintragen
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktuell', value: currentWeight ? `${currentWeight} kg` : '--' },
          { label: 'Start', value: startWeight ? `${startWeight} kg` : '--' },
          { label: 'Veränderung', value: change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg` : '--' },
          { label: 'Ziel', value: targetWeight ? `${targetWeight} kg` : '--' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-xl font-bold text-text-primary">{s.value}</div>
            <div className="text-xs text-text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {entries.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-6">Gewichtsverlauf</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
              <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={[domainMin, domainMax]} />
              <Tooltip content={<CustomTooltip />} />
              {targetWeight && (
                <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Ziel', fill: '#10b981', fontSize: 11 }} />
              )}
              <Area type="monotone" dataKey="gewicht" stroke="#6366f1" strokeWidth={2.5} fill="url(#wGrad)" dot={{ fill: '#6366f1', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <h2 className="section-title mb-4">Einträge</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Scale} title="Noch keine Einträge" description="Trage täglich dein Gewicht ein um deinen Fortschritt zu verfolgen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Gewicht</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Veränderung</th>
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Notizen</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((e, i, arr) => {
                  const prev = arr[i + 1]
                  const diff = prev ? e.gewicht - prev.gewicht : null
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-2.5 px-3 text-text-secondary">{formatDate(e.datum)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-text-primary">{e.gewicht} kg</td>
                      <td className={`py-2.5 px-3 text-right text-xs font-medium ${diff === null ? 'text-text-muted' : diff < 0 ? 'text-success' : diff > 0 ? 'text-danger' : 'text-text-muted'}`}>
                        {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-text-muted">{e.notizen ?? '--'}</td>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Gewicht eintragen">
        <div className="space-y-4">
          <div>
            <label className="label">Datum</label>
            <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
          </div>
          <div>
            <label className="label">Gewicht (kg)</label>
            <input type="number" step="0.1" className="input" placeholder="75.5" value={form.gewicht} onChange={e => setForm(f => ({ ...f, gewicht: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Notizen (optional)</label>
            <input type="text" className="input" placeholder="Z.B. nach dem Sport" value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving || !form.gewicht}>
              {saving && <Spinner size={16} />}
              Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
