import { useEffect, useState } from 'react'
import { Home, Plus, Trash2, Check, X, Edit2, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile, HaushaltMitglied } from '../../types/database'

interface HaushaltData {
  id: string
  name: string
  mitglieder: (HaushaltMitglied & { profile?: { name: string | null; email: string } })[]
}

export function HaushaltTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [haushalt, setHaushalt] = useState<HaushaltData | null>(null)
  const [allClients, setAllClients] = useState<Profile[]>([])
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPraef, setEditPraef] = useState('')

  // Form state for creating
  const [form, setForm] = useState({
    name: '',
    partnerId: '',
    meineAnzeige: clientName,
    meinePraef: '',
    partnerAnzeige: '',
    partnerPraef: '',
    meineKal: '',
    partnerKal: '',
  })

  useEffect(() => {
    if (!user || !clientId) return
    load()
  }, [user, clientId])

  async function load() {
    setLoading(true)
    // Check if client is already in a haushalt
    const { data: mem } = await supabase
      .from('haushalt_mitglieder')
      .select('haushalt_id')
      .eq('user_id', clientId)
      .maybeSingle()

    if (mem?.haushalt_id) {
      const [haushaltRes, membersRes] = await Promise.all([
        supabase.from('haushalte').select('*').eq('id', mem.haushalt_id).single(),
        supabase.from('haushalt_mitglieder').select('*').eq('haushalt_id', mem.haushalt_id),
      ])

      if (haushaltRes.data && membersRes.data) {
        // Enrich with profiles
        const profileIds = membersRes.data.map(m => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles').select('id, name, email').in('id', profileIds)
        const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

        setHaushalt({
          id: haushaltRes.data.id,
          name: haushaltRes.data.name,
          mitglieder: membersRes.data.map(m => ({
            ...m,
            profile: profileMap[m.user_id],
          })),
        })
      }
    }

    // Load other clients for partner dropdown
    const { data: clients } = await supabase
      .from('profiles').select('id, name, email').eq('coach_id', user!.id)
      .eq('role', 'client').neq('id', clientId).order('name')
    setAllClients((clients ?? []) as Profile[])
    setLoading(false)
  }

  async function createHaushalt() {
    if (!form.name.trim() || !form.partnerId || !user) return
    setSaving(true)

    const { data: h, error } = await supabase.from('haushalte')
      .insert({ coach_id: user.id, name: form.name.trim() })
      .select().single()

    if (error || !h) { setSaving(false); return }

    await supabase.from('haushalt_mitglieder').insert([
      {
        haushalt_id: h.id,
        user_id: clientId,
        anzeige_name: form.meineAnzeige || clientName,
        kalorien_ziel: form.meineKal ? parseInt(form.meineKal) : null,
        praeferenzen: form.meinePraef || null,
      },
      {
        haushalt_id: h.id,
        user_id: form.partnerId,
        anzeige_name: form.partnerAnzeige || allClients.find(c => c.id === form.partnerId)?.name || 'Partner',
        kalorien_ziel: form.partnerKal ? parseInt(form.partnerKal) : null,
        praeferenzen: form.partnerPraef || null,
      },
    ])

    setSaving(false)
    setCreating(false)
    load()
  }

  async function updatePraeferenzen(mitgliedId: string, praeferenzen: string) {
    await supabase.from('haushalt_mitglieder')
      .update({ praeferenzen: praeferenzen || null }).eq('id', mitgliedId)
    setEditingId(null)
    load()
  }

  async function dissolveHaushalt() {
    if (!haushalt || !confirm(`Haushalt "${haushalt.name}" wirklich auflösen?`)) return
    await supabase.from('haushalte').delete().eq('id', haushalt.id)
    setHaushalt(null)
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
          <Home size={20} className="text-primary" /> Haushalt
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Verknüpfe {clientName} mit einer anderen Person für gemeinsame Meal Prep Planung mit angepassten Präferenzen.
        </p>
      </div>

      {haushalt ? (
        // Existing haushalt
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted">Haushalt</div>
              <div className="font-bold text-text-primary text-xl">{haushalt.name}</div>
            </div>
            <button onClick={dissolveHaushalt} className="flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 transition-colors">
              <Trash2 size={13} /> Auflösen
            </button>
          </div>

          <div className="space-y-3">
            {haushalt.mitglieder.map(m => (
              <div key={m.id} className="card border border-border space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {m.anzeige_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-text-primary">{m.anzeige_name}</div>
                    <div className="text-xs text-text-muted truncate">{m.profile?.email}</div>
                  </div>
                  {m.kalorien_ziel && (
                    <span className="text-xs text-text-muted shrink-0">{m.kalorien_ziel} kcal/Tag</span>
                  )}
                  <button onClick={() => { setEditingId(m.id); setEditPraef(m.praeferenzen ?? '') }}
                    className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-primary transition-colors shrink-0">
                    <Edit2 size={14} />
                  </button>
                </div>

                {editingId === m.id ? (
                  <div className="space-y-2">
                    <label className="label text-xs">Ernährungspräferenzen</label>
                    <textarea className="input resize-none text-sm" rows={3}
                      placeholder="z.B. Magenprobleme → viel Kiwi, leicht verdaulich"
                      value={editPraef} onChange={e => setEditPraef(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => updatePraeferenzen(m.id, editPraef)} className="btn-primary text-xs flex items-center gap-1">
                        <Check size={12} /> Speichern
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary text-xs">Abbrechen</button>
                    </div>
                  </div>
                ) : m.praeferenzen ? (
                  <div className="text-xs text-text-secondary bg-bg-elevated rounded-lg px-3 py-2 leading-relaxed">
                    {m.praeferenzen}
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(m.id); setEditPraef('') }}
                    className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1">
                    <Plus size={11} /> Präferenzen hinzufügen
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : creating ? (
        // Create form
        <div className="card border border-primary/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-text-primary">Haushalt erstellen</div>
            <button onClick={() => setCreating(false)} className="text-text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="label">Name des Haushalts</label>
            <input className="input" placeholder={`${clientName} & Partner`}
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Person 1: Current client */}
            <div className="space-y-2 p-3 bg-bg-elevated rounded-xl border border-border">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Person 1</div>
              <div className="space-y-2">
                <input className="input text-sm" placeholder="Anzeigename" value={form.meineAnzeige}
                  onChange={e => setForm(f => ({ ...f, meineAnzeige: e.target.value }))} />
                <input className="input text-sm" type="number" placeholder="Kalorienziel (kcal/Tag)"
                  value={form.meineKal} onChange={e => setForm(f => ({ ...f, meineKal: e.target.value }))} />
                <textarea className="input resize-none text-sm" rows={3}
                  placeholder="Ernährungspräferenzen, Besonderheiten..."
                  value={form.meinePraef} onChange={e => setForm(f => ({ ...f, meinePraef: e.target.value }))} />
              </div>
            </div>

            {/* Person 2: Partner */}
            <div className="space-y-2 p-3 bg-bg-elevated rounded-xl border border-border">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Person 2</div>
              <div className="space-y-2">
                <select className="input text-sm" value={form.partnerId}
                  onChange={e => {
                    const partner = allClients.find(c => c.id === e.target.value)
                    setForm(f => ({
                      ...f, partnerId: e.target.value,
                      partnerAnzeige: partner?.name ?? '',
                    }))
                  }}>
                  <option value="">Klienten auswählen…</option>
                  {allClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name ?? c.email}</option>
                  ))}
                </select>
                <input className="input text-sm" placeholder="Anzeigename" value={form.partnerAnzeige}
                  onChange={e => setForm(f => ({ ...f, partnerAnzeige: e.target.value }))} />
                <input className="input text-sm" type="number" placeholder="Kalorienziel (kcal/Tag)"
                  value={form.partnerKal} onChange={e => setForm(f => ({ ...f, partnerKal: e.target.value }))} />
                <textarea className="input resize-none text-sm" rows={3}
                  placeholder="Ernährungspräferenzen, Besonderheiten..."
                  value={form.partnerPraef} onChange={e => setForm(f => ({ ...f, partnerPraef: e.target.value }))} />
              </div>
            </div>
          </div>

          {allClients.length === 0 && (
            <div className="text-xs text-warning">Keine anderen Klienten vorhanden. Füge zuerst weitere Klienten hinzu.</div>
          )}

          <button onClick={createHaushalt} disabled={saving || !form.name.trim() || !form.partnerId}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <Spinner size={16} /> : <Check size={16} />} Haushalt erstellen
          </button>
        </div>
      ) : (
        // Empty state
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto">
            <Users size={28} className="text-text-muted" />
          </div>
          <div>
            <div className="font-medium text-text-primary">Noch kein Haushalt</div>
            <div className="text-sm text-text-muted mt-1">
              {clientName} ist noch keinem Haushalt zugeordnet. Erstelle einen um gemeinsame Meal Prep Pläne zu ermöglichen.
            </div>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2 mx-auto">
            <Plus size={16} /> Haushalt erstellen
          </button>
        </div>
      )}
    </div>
  )
}
