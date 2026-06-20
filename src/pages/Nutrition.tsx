import { useEffect, useState } from 'react'
import { Plus, Trash2, Apple } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { ErnaehrungEntry } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts'

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

function MacroBar({ label, value, goal, color }: { label: string; value: number | null; goal: number | null; color: string }) {
  const pct = value && goal ? Math.min((value / goal) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{value ?? 0}g {goal ? `/ ${goal}g` : ''}</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function Nutrition() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ErnaehrungEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({ kalorie_tagesziel: 2000, protein_ziel: 150, karbs_ziel: 200, fett_ziel: 70 })
  const [form, setForm] = useState({
    datum: todayISO(), kalorien: '', protein_g: '', kohlenhydrate_g: '', fett_g: '', wasser_ml: '', notizen: '',
  })

  async function load() {
    if (!user) return
    const [entriesRes, settingsRes] = await Promise.all([
      supabase.from('ernaehrung').select('*').eq('user_id', user.id).order('datum', { ascending: true }),
      supabase.from('client_settings').select('kalorie_tagesziel').eq('user_id', user.id).single(),
    ])
    setEntries(entriesRes.data ?? [])
    if (settingsRes.data) setSettings(s => ({ ...s, kalorie_tagesziel: settingsRes.data.kalorie_tagesziel ?? 2000 }))
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('ernaehrung').upsert({
      user_id: user.id,
      datum: form.datum,
      kalorien: form.kalorien ? parseInt(form.kalorien) : null,
      protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
      kohlenhydrate_g: form.kohlenhydrate_g ? parseFloat(form.kohlenhydrate_g) : null,
      fett_g: form.fett_g ? parseFloat(form.fett_g) : null,
      wasser_ml: form.wasser_ml ? parseInt(form.wasser_ml) : null,
      notizen: form.notizen || null,
    }, { onConflict: 'user_id,datum' })
    await load()
    setOpen(false)
    setForm({ datum: todayISO(), kalorien: '', protein_g: '', kohlenhydrate_g: '', fett_g: '', wasser_ml: '', notizen: '' })
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('ernaehrung').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const today = entries.find(e => e.datum === todayISO())
  const avgKal = entries.filter(e => e.kalorien).length
    ? Math.round(entries.filter(e => e.kalorien).reduce((a, b) => a + (b.kalorien ?? 0), 0) / entries.filter(e => e.kalorien).length)
    : null

  const chartData = entries.slice(-21).map(e => ({
    datum: formatDate(e.datum, 'dd.MM'),
    kalorien: e.kalorien ?? 0,
    protein: e.protein_g ?? 0,
  }))

  const avgWater = entries.filter(e => e.wasser_ml).length
    ? Math.round(entries.filter(e => e.wasser_ml).reduce((a, b) => a + (b.wasser_ml ?? 0), 0) / entries.filter(e => e.wasser_ml).length)
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
      {today && (
        <div className="card bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Heute</h2>
            <span className="badge bg-success/10 text-success">{today.kalorien ?? 0} / {settings.kalorie_tagesziel} kcal</span>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-secondary">Kalorien</span>
              <span className="text-text-primary font-semibold">{Math.round(((today.kalorien ?? 0) / settings.kalorie_tagesziel) * 100)}%</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(((today.kalorien ?? 0) / settings.kalorie_tagesziel) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <MacroBar label="Protein" value={today.protein_g} goal={settings.protein_ziel} color="#6366f1" />
            <MacroBar label="Kohlenhydrate" value={today.kohlenhydrate_g} goal={settings.karbs_ziel} color="#f59e0b" />
            <MacroBar label="Fett" value={today.fett_g} goal={settings.fett_ziel} color="#10b981" />
          </div>
          {today.wasser_ml && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Wasser heute:</span>
              <span className="font-semibold text-text-primary">{today.wasser_ml} ml</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgKal ? `${avgKal}` : '--'}</div>
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

      {/* Log Table */}
      <div className="card">
        <h2 className="section-title mb-4">Ernährungslog</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Apple} title="Noch keine Ernährungseinträge" description="Trage täglich deine Makros und Kalorien ein." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Kalorien</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Protein</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Karbs</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Fett</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Wasser</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map(e => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-2.5 px-3 text-text-secondary">{formatDate(e.datum)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-semibold ${e.kalorien && e.kalorien <= settings.kalorie_tagesziel ? 'text-success' : 'text-danger'}`}>
                        {e.kalorien ? `${e.kalorien} kcal` : '--'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{e.protein_g ? `${e.protein_g}g` : '--'}</td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{e.kohlenhydrate_g ? `${e.kohlenhydrate_g}g` : '--'}</td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{e.fett_g ? `${e.fett_g}g` : '--'}</td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{e.wasser_ml ? `${e.wasser_ml}ml` : '--'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ernährung eintragen">
        <div className="space-y-4">
          <div>
            <label className="label">Datum</label>
            <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kalorien (kcal)</label>
              <input type="number" className="input" placeholder="2000" value={form.kalorien} onChange={e => setForm(f => ({ ...f, kalorien: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Wasser (ml)</label>
              <input type="number" className="input" placeholder="2500" value={form.wasser_ml} onChange={e => setForm(f => ({ ...f, wasser_ml: e.target.value }))} />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input type="number" step="0.1" className="input" placeholder="150" value={form.protein_g} onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))} />
            </div>
            <div>
              <label className="label">Kohlenhydrate (g)</label>
              <input type="number" step="0.1" className="input" placeholder="200" value={form.kohlenhydrate_g} onChange={e => setForm(f => ({ ...f, kohlenhydrate_g: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fett (g)</label>
              <input type="number" step="0.1" className="input" placeholder="70" value={form.fett_g} onChange={e => setForm(f => ({ ...f, fett_g: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notizen</label>
              <input type="text" className="input" placeholder="Optional" value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
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
