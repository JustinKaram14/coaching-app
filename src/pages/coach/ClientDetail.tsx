import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Scale, Dumbbell, Moon, Apple, Pill, Target } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDate, calcSleepHours } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile, GewichtEntry, TrainingEntry, SchlafEntry, ErnaehrungEntry, ClientSettings } from '../../types/database'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      {payload.map((p: any) => <div key={p.dataKey} className="text-text-primary font-bold">{p.value}</div>)}
    </div>
  )
}

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  const [weights, setWeights] = useState<GewichtEntry[]>([])
  const [trainings, setTrainings] = useState<TrainingEntry[]>([])
  const [schlaf, setSchlaf] = useState<SchlafEntry[]>([])
  const [ernaehrung, setErnaehrung] = useState<ErnaehrungEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'weight' | 'training' | 'sleep' | 'nutrition'>('overview')

  useEffect(() => {
    if (!clientId) return
    async function load() {
      const [profileRes, settingsRes, weightRes, trainingRes, schlafRes, ernaehrungRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId!).single(),
        supabase.from('client_settings').select('*').eq('user_id', clientId!).single(),
        supabase.from('gewicht').select('*').eq('user_id', clientId!).order('datum', { ascending: true }),
        supabase.from('training').select('*').eq('user_id', clientId!).order('datum', { ascending: false }),
        supabase.from('schlaf').select('*').eq('user_id', clientId!).order('datum', { ascending: true }),
        supabase.from('ernaehrung').select('*').eq('user_id', clientId!).order('datum', { ascending: false }),
      ])
      setClient(profileRes.data)
      setSettings(settingsRes.data)
      setWeights(weightRes.data ?? [])
      setTrainings(trainingRes.data ?? [])
      setSchlaf(schlafRes.data ?? [])
      setErnaehrung(ernaehrungRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [clientId])

  const currentWeight = weights.at(-1)?.gewicht
  const startWeight = weights[0]?.gewicht
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : null
  const avgSleep = schlaf.filter(s => s.einschlafzeit && s.aufwachzeit).length > 0
    ? Math.round(schlaf.filter(s => s.einschlafzeit && s.aufwachzeit)
        .reduce((a, s) => a + calcSleepHours(s.einschlafzeit!, s.aufwachzeit!), 0)
        / schlaf.filter(s => s.einschlafzeit && s.aufwachzeit).length * 10) / 10
    : null

  const weightChartData = weights.slice(-30).map(w => ({ datum: formatDate(w.datum, 'dd.MM'), gewicht: w.gewicht }))
  const sleepChartData = schlaf.filter(s => s.einschlafzeit && s.aufwachzeit).slice(-21).map(s => ({
    datum: formatDate(s.datum, 'dd.MM'),
    stunden: calcSleepHours(s.einschlafzeit!, s.aufwachzeit!),
  }))

  const tabs = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'weight', label: 'Gewicht' },
    { id: 'training', label: 'Training' },
    { id: 'sleep', label: 'Schlaf' },
    { id: 'nutrition', label: 'Ernährung' },
  ] as const

  if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/coach')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
        <ArrowLeft size={16} /> Alle Klienten
      </button>

      {/* Client Header */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {client?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{client?.name ?? 'Unbekannt'}</h1>
            <div className="text-text-secondary text-sm">{client?.email}</div>
            {settings?.startdatum && (
              <div className="text-xs text-text-muted mt-1">
                Coaching seit: {formatDate(settings.startdatum)}
              </div>
            )}
          </div>
          {/* Goals */}
          <div className="ml-auto hidden lg:flex gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-text-primary">{settings?.zielgewicht ? `${settings.zielgewicht} kg` : '--'}</div>
              <div className="text-xs text-text-muted">Zielgewicht</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-text-primary">{settings?.kalorie_tagesziel ?? '--'}</div>
              <div className="text-xs text-text-muted">Kalorien-Ziel</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-text-primary">{settings?.trainings_pro_woche ?? '--'}</div>
              <div className="text-xs text-text-muted">Trainings/Woche</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-primary text-white shadow-glow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Aktuelles Gewicht', value: currentWeight ? `${currentWeight} kg` : '--', icon: Scale, color: 'text-primary bg-primary/10' },
            { label: 'Gewichtsveränderung', value: weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg` : '--', icon: Target, color: 'text-accent bg-accent/10' },
            { label: 'Trainingseinheiten', value: trainings.length || '--', icon: Dumbbell, color: 'text-success bg-success/10' },
            { label: 'Ø Schlafdauer', value: avgSleep ? `${avgSleep}h` : '--', icon: Moon, color: 'text-primary bg-primary/10' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`p-2.5 rounded-xl ${s.color} inline-flex mb-3`}>
                <s.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-text-primary">{s.value}</div>
              <div className="text-xs text-text-muted mt-1">{s.label}</div>
            </div>
          ))}

          {/* Weight Chart */}
          {weightChartData.length > 1 && (
            <div className="col-span-2 card">
              <h3 className="font-semibold text-text-primary mb-4">Gewichtsverlauf</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
                  <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="gewicht" stroke="#6366f1" strokeWidth={2} fill="url(#wg2)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {sleepChartData.length > 1 && (
            <div className="col-span-2 card">
              <h3 className="font-semibold text-text-primary mb-4">Schlafverlauf</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sleepChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
                  <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 12]} />
                  <Tooltip content={<CT />} />
                  <Bar dataKey="stunden" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab === 'weight' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-text-primary mb-4">Gewichtsverlauf ({weights.length} Einträge)</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th><th className="text-right py-2 px-3 text-text-muted font-medium">Gewicht</th><th className="text-left py-2 px-3 text-text-muted font-medium">Notizen</th></tr></thead>
            <tbody>
              {[...weights].reverse().map(w => (
                <tr key={w.id} className="border-b border-border/50">
                  <td className="py-2.5 px-3 text-text-secondary">{formatDate(w.datum)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-text-primary">{w.gewicht} kg</td>
                  <td className="py-2.5 px-3 text-text-muted">{w.notizen ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'training' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-text-primary mb-4">Trainingseinheiten ({trainings.length})</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th><th className="text-left py-2 px-3 text-text-muted font-medium">Typ</th><th className="text-right py-2 px-3 text-text-muted font-medium">Dauer</th><th className="text-right py-2 px-3 text-text-muted font-medium">Kalorien</th><th className="text-left py-2 px-3 text-text-muted font-medium">Notizen</th></tr></thead>
            <tbody>
              {trainings.map(t => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="py-2.5 px-3 text-text-secondary">{formatDate(t.datum)}</td>
                  <td className="py-2.5 px-3 text-text-primary">{t.trainingstyp ?? '--'}</td>
                  <td className="py-2.5 px-3 text-right text-text-secondary">{t.dauer_min ? `${t.dauer_min} min` : '--'}</td>
                  <td className="py-2.5 px-3 text-right text-text-secondary">{t.kalorien_verbrannt ? `${t.kalorien_verbrannt} kcal` : '--'}</td>
                  <td className="py-2.5 px-3 text-text-muted">{t.notizen ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sleep' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-text-primary mb-4">Schlaflog ({schlaf.length} Einträge)</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th><th className="text-left py-2 px-3 text-text-muted font-medium">Einschlaf</th><th className="text-left py-2 px-3 text-text-muted font-medium">Aufwach</th><th className="text-right py-2 px-3 text-text-muted font-medium">Dauer</th><th className="text-right py-2 px-3 text-text-muted font-medium">Qualität</th></tr></thead>
            <tbody>
              {[...schlaf].reverse().map(s => {
                const h = s.einschlafzeit && s.aufwachzeit ? calcSleepHours(s.einschlafzeit, s.aufwachzeit) : null
                return (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2.5 px-3 text-text-secondary">{formatDate(s.datum)}</td>
                    <td className="py-2.5 px-3 text-text-primary">{s.einschlafzeit ?? '--'}</td>
                    <td className="py-2.5 px-3 text-text-primary">{s.aufwachzeit ?? '--'}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-text-primary">{h ? `${h}h` : '--'}</td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{s.schlafqualitaet ? `${s.schlafqualitaet}/10` : '--'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'nutrition' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-text-primary mb-4">Ernährungslog</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th><th className="text-right py-2 px-3 text-text-muted font-medium">Kalorien</th><th className="text-right py-2 px-3 text-text-muted font-medium">Protein</th><th className="text-right py-2 px-3 text-text-muted font-medium">Karbs</th><th className="text-right py-2 px-3 text-text-muted font-medium">Fett</th></tr></thead>
            <tbody>
              {ernaehrung.map(e => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-2.5 px-3 text-text-secondary">{formatDate(e.datum)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-text-primary">{e.kalorien ? `${e.kalorien} kcal` : '--'}</td>
                  <td className="py-2.5 px-3 text-right text-text-secondary">{e.protein_g ? `${e.protein_g}g` : '--'}</td>
                  <td className="py-2.5 px-3 text-right text-text-secondary">{e.kohlenhydrate_g ? `${e.kohlenhydrate_g}g` : '--'}</td>
                  <td className="py-2.5 px-3 text-right text-text-secondary">{e.fett_g ? `${e.fett_g}g` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
