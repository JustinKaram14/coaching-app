import { useEffect, useState } from 'react'
import { Scale, Dumbbell, Moon, Apple, TrendingUp, TrendingDown, Minus, Target, Flame, Droplets, FileText, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, calcSleepHours } from '../lib/utils'
import type { CoachPlan } from '../types/database'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'

interface DashStats {
  currentWeight: number | null
  weightChange: number | null
  targetWeight: number | null
  avgSleep: number | null
  sleepQuality: number | null
  totalTrainings: number
  totalCalories: number
  avgCalories: number | null
  calorieGoal: number | null
  weightHistory: { datum: string; gewicht: number }[]
  sleepHistory: { datum: string; stunden: number }[]
}

function StatCard({ label, value, unit, icon: Icon, trend, color = 'primary' }: {
  label: string; value: string | number | null; unit?: string; icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'; color?: string
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    accent: 'text-accent bg-accent/10',
  }
  return (
    <div className="card group hover:border-border-light transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {trend && trend !== 'neutral' && (
          <span className={trend === 'up' ? 'text-success' : 'text-danger'}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-text-primary mb-0.5">
        {value !== null && value !== undefined ? value : '--'}
        {value !== null && value !== undefined && unit && (
          <span className="text-sm font-normal text-text-secondary ml-1">{unit}</span>
        )}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="text-text-primary font-medium">
          {p.value} {p.unit || ''}
        </div>
      ))}
    </div>
  )
}

export function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<DashStats>({
    currentWeight: null, weightChange: null, targetWeight: null,
    avgSleep: null, sleepQuality: null, totalTrainings: 0, totalCalories: 0,
    avgCalories: null, calorieGoal: null, weightHistory: [], sleepHistory: [],
  })
  const [loading, setLoading] = useState(true)
  const [masterplan, setMasterplan] = useState<CoachPlan | null>(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [settingsRes, weightRes, trainingRes, schlafRes, planRes] = await Promise.all([
        supabase.from('client_settings').select('*').eq('user_id', user!.id).single(),
        supabase.from('gewicht').select('*').eq('user_id', user!.id).order('datum', { ascending: true }),
        supabase.from('training').select('*').eq('user_id', user!.id).order('datum', { ascending: false }),
        supabase.from('schlaf').select('*').eq('user_id', user!.id).order('datum', { ascending: true }),
        supabase.from('coach_plans').select('*').eq('client_id', user!.id).maybeSingle(),
      ])

      const weights = weightRes.data ?? []
      const trainings = trainingRes.data ?? []
      const schlaf = schlafRes.data ?? []
      const settings = settingsRes.data
      setMasterplan(planRes.data ?? null)

      const currentWeight = weights.at(-1)?.gewicht ?? null
      const weightChange = weights.length >= 2 ? (weights.at(-1)!.gewicht - weights[0].gewicht) : null
      const targetWeight = settings?.zielgewicht ?? null

      const sleepWithHours = schlaf
        .filter(s => s.einschlafzeit && s.aufwachzeit)
        .map(s => ({
          datum: formatDate(s.datum, 'dd.MM'),
          stunden: calcSleepHours(s.einschlafzeit!, s.aufwachzeit!),
        }))
      const avgSleep = sleepWithHours.length > 0
        ? Math.round((sleepWithHours.reduce((a, b) => a + b.stunden, 0) / sleepWithHours.length) * 10) / 10
        : null

      const avgQuality = schlaf.filter(s => s.schlafqualitaet).length > 0
        ? Math.round(schlaf.filter(s => s.schlafqualitaet).reduce((a, b) => a + (b.schlafqualitaet ?? 0), 0) / schlaf.filter(s => s.schlafqualitaet).length * 10) / 10
        : null

      const totalKal = trainings.reduce((a, t) => a + (t.kalorien_verbrannt ?? 0), 0)

      setStats({
        currentWeight,
        weightChange,
        targetWeight,
        avgSleep,
        sleepQuality: avgQuality,
        totalTrainings: trainings.length,
        totalCalories: totalKal,
        avgCalories: null,
        calorieGoal: settings?.kalorie_tagesziel ?? null,
        weightHistory: weights.slice(-30).map(w => ({ datum: formatDate(w.datum, 'dd.MM'), gewicht: w.gewicht })),
        sleepHistory: sleepWithHours.slice(-14),
      })
      setLoading(false)
    }
    load()
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Guten Morgen'
    if (h < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {greeting()}, {profile?.name?.split(' ')[0] ?? 'Athlet'} 👋
        </h1>
        <p className="text-text-secondary mt-1">{formatDate(new Date(), 'EEEE, dd. MMMM yyyy')}</p>
      </div>

      {/* Masterplan Banner */}
      {masterplan && (
        <div className="card border border-primary/30 bg-primary/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <FileText size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">Dein Masterplan ist bereit</div>
            <div className="text-xs text-text-muted mt-0.5">
              {masterplan.pdf_name ?? 'Personalisierter Coaching-Plan'} · {masterplan.angewendet_am ? formatDate(masterplan.angewendet_am) : ''}
            </div>
          </div>
          <button
            onClick={async () => {
              if (!masterplan.pdf_storage_path) return
              const { data, error } = await supabase.storage
                .from('masterplans').createSignedUrl(masterplan.pdf_storage_path, 3600)
              if (error || !data?.signedUrl) {
                alert(`Download fehlgeschlagen: ${error?.message ?? 'Unbekannter Fehler'}`)
                return
              }
              window.open(data.signedUrl, '_blank')
            }}
            className="btn-primary flex items-center gap-2 text-sm shrink-0"
          >
            <Download size={16} /> PDF herunterladen
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aktuelles Gewicht"
          value={stats.currentWeight}
          unit="kg"
          icon={Scale}
          trend={stats.weightChange !== null ? (stats.weightChange < 0 ? 'down' : stats.weightChange > 0 ? 'up' : 'neutral') : undefined}
          color="primary"
        />
        <StatCard
          label="Gewichtsveränderung"
          value={stats.weightChange !== null ? (stats.weightChange > 0 ? `+${stats.weightChange.toFixed(1)}` : stats.weightChange.toFixed(1)) : null}
          unit="kg"
          icon={Target}
          color="accent"
        />
        <StatCard label="Ø Schlafdauer" value={stats.avgSleep} unit="h" icon={Moon} color="primary" />
        <StatCard label="Trainingseinheiten" value={stats.totalTrainings || null} unit="gesamt" icon={Dumbbell} color="success" />
        <StatCard label="Kalorienverbrauch" value={stats.totalCalories || null} unit="kcal" icon={Flame} color="warning" />
        <StatCard label="Schlafqualität Ø" value={stats.sleepQuality} unit="/ 10" icon={Moon} color="accent" />
        <StatCard label="Zielgewicht" value={stats.targetWeight} unit="kg" icon={Target} color="success" />
        <StatCard
          label="Noch bis Ziel"
          value={stats.currentWeight && stats.targetWeight ? Math.abs(stats.currentWeight - stats.targetWeight).toFixed(1) : null}
          unit="kg"
          icon={TrendingDown}
          color="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Gewichtsverlauf</h2>
            {stats.targetWeight && (
              <span className="badge bg-success/10 text-success">Ziel: {stats.targetWeight} kg</span>
            )}
          </div>
          {stats.weightHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.weightHistory}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
                <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="gewicht" stroke="#6366f1" strokeWidth={2} fill="url(#weightGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              Noch keine Gewichtsdaten vorhanden
            </div>
          )}
        </div>

        {/* Sleep Chart */}
        <div className="card">
          <h2 className="section-title mb-6">Schlafdauer (letzte 14 Tage)</h2>
          {stats.sleepHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.sleepHistory}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
                <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 12]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="stunden" stroke="#8b5cf6" strokeWidth={2} fill="url(#sleepGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              Noch keine Schlafdaten vorhanden
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
