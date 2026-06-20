import { useEffect, useState } from 'react'
import { Plus, Trash2, Pill, Check, X as XIcon, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { Supplement, SupplementLog } from '../types/database'

interface SupplementWithLog extends Supplement {
  todayLog?: SupplementLog
  consistency?: number
}

export function Supplements() {
  const { user } = useAuth()
  const [supplements, setSupplements] = useState<SupplementWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', beschreibung: '', dosierung: '', zeitpunkt: '' })

  async function load() {
    if (!user) return
    const [supRes, logRes] = await Promise.all([
      supabase.from('supplements').select('*').eq('user_id', user.id).eq('aktiv', true).order('created_at'),
      supabase.from('supplement_log').select('*').eq('user_id', user.id),
    ])
    const sups = supRes.data ?? []
    const logs = logRes.data ?? []
    const today = todayISO()

    const enriched: SupplementWithLog[] = sups.map(s => {
      const todayLog = logs.find(l => l.supplement_id === s.id && l.datum === today)
      const allLogs = logs.filter(l => l.supplement_id === s.id)
      const taken = allLogs.filter(l => l.eingenommen).length
      const consistency = allLogs.length > 0 ? Math.round((taken / allLogs.length) * 100) : 0
      return { ...s, todayLog, consistency }
    })
    setSupplements(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleAddSupplement() {
    if (!user || !form.name) return
    setSaving(true)
    await supabase.from('supplements').insert({
      user_id: user.id,
      name: form.name,
      beschreibung: form.beschreibung || null,
      dosierung: form.dosierung || null,
      zeitpunkt: form.zeitpunkt || null,
      aktiv: true,
    })
    await load()
    setAddOpen(false)
    setForm({ name: '', beschreibung: '', dosierung: '', zeitpunkt: '' })
    setSaving(false)
  }

  async function toggleToday(supId: string, currentLog?: SupplementLog) {
    if (!user) return
    const today = todayISO()
    if (currentLog) {
      await supabase.from('supplement_log')
        .update({ eingenommen: !currentLog.eingenommen })
        .eq('id', currentLog.id)
    } else {
      await supabase.from('supplement_log').insert({
        user_id: user.id,
        supplement_id: supId,
        datum: today,
        eingenommen: true,
      })
    }
    await load()
  }

  async function handleDelete(id: string) {
    await supabase.from('supplements').update({ aktiv: false }).eq('id', id)
    setSupplements(s => s.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Supplements</h1>
          <p className="text-text-secondary text-sm mt-0.5">Tägliche Einnahme-Tracking</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Supplement hinzufügen
        </button>
      </div>

      {/* Today overview */}
      {supplements.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Heute — {formatDate(new Date())}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplements.map(s => {
              const taken = s.todayLog?.eingenommen ?? false
              return (
                <div
                  key={s.id}
                  onClick={() => toggleToday(s.id, s.todayLog)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    taken
                      ? 'bg-success/10 border-success/30 hover:bg-success/15'
                      : 'bg-bg-elevated border-border hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${taken ? 'bg-success/20' : 'bg-bg'}`}>
                      <Pill size={16} className={taken ? 'text-success' : 'text-text-muted'} />
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      taken ? 'border-success bg-success' : 'border-border'
                    }`}>
                      {taken && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                  <div className="font-medium text-text-primary text-sm">{s.name}</div>
                  {s.dosierung && <div className="text-xs text-text-muted mt-0.5">{s.dosierung}</div>}
                  {s.zeitpunkt && <div className="text-xs text-text-secondary mt-0.5">⏰ {s.zeitpunkt}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Supplement List */}
      <div className="card">
        <h2 className="section-title mb-4">Meine Supplements</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : supplements.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="Keine Supplements eingetragen"
            description="Füge deine Supplements hinzu und tracke die tägliche Einnahme."
          />
        ) : (
          <div className="space-y-3">
            {supplements.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-4 bg-bg-elevated rounded-xl border border-border">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Pill size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary">{s.name}</div>
                  <div className="text-xs text-text-muted mt-0.5 space-x-3">
                    {s.dosierung && <span>{s.dosierung}</span>}
                    {s.zeitpunkt && <span>· {s.zeitpunkt}</span>}
                    {s.beschreibung && <span>· {s.beschreibung}</span>}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-lg font-bold text-text-primary">{s.consistency}%</div>
                  <div className="text-xs text-text-muted">Konsistenz</div>
                  <div className="w-16 h-1.5 bg-bg rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.consistency}%`,
                        backgroundColor: (s.consistency ?? 0) >= 80 ? '#10b981' : (s.consistency ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Supplement hinzufügen">
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input type="text" className="input" placeholder="Z.B. Vitamin D3" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Dosierung</label>
            <input type="text" className="input" placeholder="Z.B. 2000 IU" value={form.dosierung} onChange={e => setForm(f => ({ ...f, dosierung: e.target.value }))} />
          </div>
          <div>
            <label className="label">Einnahmezeitpunkt</label>
            <input type="text" className="input" placeholder="Z.B. Morgens mit Frühstück" value={form.zeitpunkt} onChange={e => setForm(f => ({ ...f, zeitpunkt: e.target.value }))} />
          </div>
          <div>
            <label className="label">Beschreibung / Zweck</label>
            <input type="text" className="input" placeholder="Z.B. Immunsystem, Knochen" value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setAddOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleAddSupplement} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving || !form.name}>
              {saving && <Spinner size={16} />}
              Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
