import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Scale, Dumbbell, Moon, TrendingUp, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile } from '../../types/database'

interface ClientWithStats extends Profile {
  lastWeight?: number | null
  totalTrainings?: number
  avgSleep?: number | null
}

export function CoachDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: clientProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('coach_id', user!.id)
        .eq('role', 'client')
        .order('last_active', { ascending: false, nullsFirst: false })

      if (!clientProfiles?.length) {
        setLoading(false)
        return
      }

      const clientIds = clientProfiles.map(c => c.id)

      const [weightsRes, trainingsRes] = await Promise.all([
        supabase.from('gewicht').select('user_id, gewicht, datum').in('user_id', clientIds).order('datum', { ascending: false }),
        supabase.from('training').select('user_id').in('user_id', clientIds),
      ])

      const weights = weightsRes.data ?? []
      const trainings = trainingsRes.data ?? []

      const enriched: ClientWithStats[] = clientProfiles.map(c => {
        const clientWeights = weights.filter(w => w.user_id === c.id)
        const clientTrainings = trainings.filter(t => t.user_id === c.id)
        return {
          ...c,
          lastWeight: clientWeights[0]?.gewicht ?? null,
          totalTrainings: clientTrainings.length,
        }
      })

      setClients(enriched)
      setLoading(false)
    }
    load()
  }, [user])

  function timeSince(dateStr: string | null) {
    if (!dateStr) return 'Nie aktiv'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `Vor ${mins} Min.`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Vor ${hours} Std.`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Gestern'
    return `Vor ${days} Tagen`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title text-2xl">Meine Klienten</h1>
        <p className="text-text-secondary text-sm mt-0.5">{clients.length} aktive Klienten</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{clients.length}</div>
          <div className="text-xs text-text-muted mt-1">Klienten gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">
            {clients.filter(c => c.last_active && (Date.now() - new Date(c.last_active).getTime()) < 86400000 * 7).length}
          </div>
          <div className="text-xs text-text-muted mt-1">Diese Woche aktiv</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">
            {clients.reduce((a, c) => a + (c.totalTrainings ?? 0), 0)}
          </div>
          <div className="text-xs text-text-muted mt-1">Trainingseinheiten</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-success">
            {clients.filter(c => c.last_active && (Date.now() - new Date(c.last_active).getTime()) < 86400000).length}
          </div>
          <div className="text-xs text-text-muted mt-1">Heute aktiv</div>
        </div>
      </div>

      {/* Client List */}
      <div className="card">
        <h2 className="section-title mb-4">Klienten-Übersicht</h2>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center">
            <div className="p-4 rounded-2xl bg-bg-elevated border border-border inline-block mb-4">
              <Users size={32} className="text-text-muted" />
            </div>
            <h3 className="font-semibold text-text-primary mb-1">Noch keine Klienten</h3>
            <p className="text-sm text-text-secondary">Erstelle Einladungscodes in den Einstellungen und teile sie mit deinen Klienten.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map(client => {
              const isActive = client.last_active && (Date.now() - new Date(client.last_active).getTime()) < 86400000 * 3
              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/coach/client/${client.id}`)}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-bg-elevated border border-transparent hover:border-border cursor-pointer transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {client.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{client.name ?? 'Unbekannt'}</span>
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-success' : 'bg-border'}`} />
                    </div>
                    <div className="text-xs text-text-muted truncate">{client.email}</div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-text-primary">{client.lastWeight ? `${client.lastWeight} kg` : '--'}</div>
                      <div className="text-xs text-text-muted">Letztes Gewicht</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-text-primary">{client.totalTrainings}</div>
                      <div className="text-xs text-text-muted">Trainings</div>
                    </div>
                    <div className="text-center min-w-[100px]">
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock size={11} />
                        {timeSince(client.last_active)}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
