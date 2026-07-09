import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Scale, Dumbbell, Moon, Apple, Pill, Target, FileText, Upload, CheckCircle, X, Download, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, calcSleepHours } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile, GewichtEntry, TrainingEntry, SchlafEntry, ErnaehrungEntry, ClientSettings, CoachPlan } from '../../types/database'
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

interface ExtractedVorlage {
  name: string
  trainingstyp: string
  wochentag: number
  uebungen: { uebungsname: string; saetze: number | null; wdh: number | null; gewicht_kg: number | null }[]
}

interface ExtractedPlan {
  kalorie_tagesziel: number | null
  protein_ziel: number | null
  karbs_ziel: number | null
  fett_ziel: number | null
  wasser_ziel_ml: number | null
  schlaf_ziel: number | null
  trainingsvorlagen: ExtractedVorlage[]
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag',
  5: 'Freitag', 6: 'Samstag', 7: 'Sonntag',
}

function MasterplanTab({ clientId, settings }: { clientId: string; settings: ClientSettings | null }) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [existingPlan, setExistingPlan] = useState<CoachPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedPlan | null>(null)
  const [edited, setEdited] = useState<ExtractedPlan | null>(null)
  const [replaceVorlagen, setReplaceVorlagen] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyDone, setApplyDone] = useState(false)
  const [expandedVorlage, setExpandedVorlage] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('coach_plans').select('*').eq('client_id', clientId).maybeSingle()
      .then(({ data }) => { setExistingPlan(data); setPlanLoading(false) })
  }, [clientId])

  async function handleAnalyse() {
    if (!pdfFile || !user) return
    setAnalysing(true)
    setAnalysisError(null)
    setExtracted(null)

    const arrayBuffer = await pdfFile.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const pdfBase64 = btoa(binary)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setAnalysisError('Nicht angemeldet'); setAnalysing(false); return }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/parse-masterplan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pdfBase64, clientId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setAnalysisError(json.error ?? 'Fehler bei der Analyse'); setAnalysing(false); return }
      const result: ExtractedPlan = {
        kalorie_tagesziel: json.result.kalorie_tagesziel ?? null,
        protein_ziel: json.result.protein_ziel ?? null,
        karbs_ziel: json.result.karbs_ziel ?? null,
        fett_ziel: json.result.fett_ziel ?? null,
        wasser_ziel_ml: json.result.wasser_ziel_ml ?? null,
        schlaf_ziel: json.result.schlaf_ziel ?? null,
        trainingsvorlagen: json.result.trainingsvorlagen ?? [],
      }
      setExtracted(result)
      setEdited(JSON.parse(JSON.stringify(result)))
    } catch (e: any) {
      setAnalysisError(e.message ?? 'Netzwerkfehler')
    }
    setAnalysing(false)
  }

  async function handleApply() {
    if (!edited || !user || !pdfFile) return
    setApplying(true)

    // 1. Upload PDF to Storage
    const storageKey = `${clientId}/plan.pdf`
    await supabase.storage.from('masterplans').upload(storageKey, pdfFile, { upsert: true })

    // 2. Upsert coach_plans
    await supabase.from('coach_plans').upsert(
      { client_id: clientId, coach_id: user.id, pdf_storage_path: storageKey, pdf_name: pdfFile.name, angewendet_am: new Date().toISOString() },
      { onConflict: 'client_id' }
    )

    // 3. Update client_settings
    await supabase.from('client_settings').update({
      kalorie_tagesziel: edited.kalorie_tagesziel ?? undefined,
      protein_ziel: edited.protein_ziel ?? undefined,
      karbs_ziel: edited.karbs_ziel ?? undefined,
      fett_ziel: edited.fett_ziel ?? undefined,
      wasser_ziel_ml: edited.wasser_ziel_ml ?? undefined,
      schlaf_ziel: edited.schlaf_ziel ?? undefined,
    }).eq('user_id', clientId)

    // 4. Replace training templates if toggled
    if (replaceVorlagen && edited.trainingsvorlagen.length > 0) {
      // Delete existing templates for client
      const { data: oldVorlagen } = await supabase.from('training_vorlagen').select('id').eq('user_id', clientId)
      if (oldVorlagen && oldVorlagen.length > 0) {
        const ids = oldVorlagen.map(v => v.id)
        await supabase.from('vorlagen_uebungen').delete().in('vorlage_id', ids)
        await supabase.from('training_vorlagen').delete().eq('user_id', clientId)
      }

      // Insert new templates
      for (const v of edited.trainingsvorlagen) {
        const { data: vorlage } = await supabase.from('training_vorlagen').insert({
          user_id: clientId,
          name: v.name,
          trainingstyp: v.trainingstyp,
          wochentage: String(v.wochentag),
        }).select().single()
        if (vorlage && v.uebungen.length > 0) {
          await supabase.from('vorlagen_uebungen').insert(
            v.uebungen.map((u, i) => ({
              vorlage_id: vorlage.id,
              uebungsname: u.uebungsname,
              saetze: u.saetze,
              wdh: u.wdh,
              gewicht_kg: u.gewicht_kg,
              reihenfolge: i,
            }))
          )
        }
      }
    }

    // Refresh existing plan
    const { data } = await supabase.from('coach_plans').select('*').eq('client_id', clientId).maybeSingle()
    setExistingPlan(data)
    setApplyDone(true)
    setApplying(false)
    setTimeout(() => setApplyDone(false), 4000)
  }

  async function handleDownload() {
    if (!existingPlan?.pdf_storage_path) return
    const { data } = await supabase.storage.from('masterplans').createSignedUrl(existingPlan.pdf_storage_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function updateField(key: keyof Omit<ExtractedPlan, 'trainingsvorlagen'>, value: string) {
    setEdited(e => e ? { ...e, [key]: parseFloat(value) || null } : null)
  }

  if (planLoading) return <div className="flex justify-center py-10"><Spinner size={32} /></div>

  return (
    <div className="space-y-6">
      {/* Existing plan banner */}
      {existingPlan && (
        <div className="card border border-success/30 bg-success/5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-success/10 text-success"><FileText size={20} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">{existingPlan.pdf_name ?? 'Masterplan'}</div>
            <div className="text-xs text-text-muted mt-0.5">
              Angewendet: {existingPlan.angewendet_am ? formatDate(existingPlan.angewendet_am) : '—'}
            </div>
          </div>
          <button onClick={handleDownload} className="btn-primary flex items-center gap-2 text-sm shrink-0">
            <Download size={16} /> PDF
          </button>
        </div>
      )}

      {/* Upload + Analyse */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <Upload size={18} className="text-primary" />
          {existingPlan ? 'Plan ersetzen' : 'Masterplan hochladen'}
        </h3>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
        >
          <FileText size={32} className="mx-auto text-text-muted group-hover:text-primary mb-2 transition-colors" />
          {pdfFile ? (
            <div>
              <div className="font-medium text-text-primary">{pdfFile.name}</div>
              <div className="text-xs text-text-muted mt-1">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          ) : (
            <div>
              <div className="text-text-secondary text-sm">PDF hierher ziehen oder klicken</div>
              <div className="text-xs text-text-muted mt-1">Max. 7 MB</div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setExtracted(null); setEdited(null); setAnalysisError(null) } }}
          />
        </div>

        {analysisError && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">
            <X size={16} /> {analysisError}
          </div>
        )}

        <button
          onClick={handleAnalyse}
          disabled={!pdfFile || analysing}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {analysing ? <><Spinner size={18} /> KI analysiert den Plan...</> : <><Sparkles size={18} /> Plan analysieren</>}
        </button>
      </div>

      {/* Confirmation form */}
      {edited && (
        <div className="space-y-4">
          {/* Nutrition goals */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary">Ernährungsziele (extrahiert)</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['kalorie_tagesziel', 'Kalorien (kcal/Tag)'],
                ['protein_ziel', 'Protein (g)'],
                ['karbs_ziel', 'Kohlenhydrate (g)'],
                ['fett_ziel', 'Fett (g)'],
                ['wasser_ziel_ml', 'Wasser (ml/Tag)'],
                ['schlaf_ziel', 'Schlaf (Stunden)'],
              ] as [keyof Omit<ExtractedPlan, 'trainingsvorlagen'>, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="label text-xs">{label}</label>
                  <input
                    type="number"
                    className="input"
                    value={edited[key] ?? ''}
                    onChange={e => updateField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Training templates */}
          {edited.trainingsvorlagen.length > 0 && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">Trainingsvorlagen ({edited.trainingsvorlagen.length})</h3>
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceVorlagen}
                    onChange={e => setReplaceVorlagen(e.target.checked)}
                    className="rounded"
                  />
                  Vorhandene ersetzen
                </label>
              </div>
              <div className="space-y-2">
                {edited.trainingsvorlagen.map((v, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedVorlage(expandedVorlage === i ? null : i)}
                      className="w-full flex items-center justify-between p-3 hover:bg-bg-elevated transition-colors text-left"
                    >
                      <div>
                        <span className="font-medium text-text-primary text-sm">{v.name}</span>
                        <span className="ml-2 text-xs text-text-muted">{WEEKDAY_LABELS[v.wochentag] ?? `Tag ${v.wochentag}`} · {v.trainingstyp}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <span className="text-xs">{v.uebungen.length} Übungen</span>
                        {expandedVorlage === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    {expandedVorlage === i && (
                      <div className="px-3 pb-3 space-y-1 border-t border-border">
                        {v.uebungen.map((u, j) => (
                          <div key={j} className="flex items-center justify-between py-1.5 text-sm border-b border-border/40 last:border-0">
                            <span className="text-text-primary">{u.uebungsname}</span>
                            <span className="text-text-muted text-xs">
                              {u.saetze ? `${u.saetze}×` : ''}{u.wdh ? `${u.wdh} Wdh` : ''}{u.gewicht_kg ? ` · ${u.gewicht_kg}kg` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={applying}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${applyDone ? 'bg-success hover:bg-success' : ''}`}
          >
            {applying ? (
              <><Spinner size={18} /> Wird angewendet...</>
            ) : applyDone ? (
              <><CheckCircle size={18} /> Plan erfolgreich angewendet!</>
            ) : (
              <><CheckCircle size={18} /> Plan anwenden & speichern</>
            )}
          </button>
        </div>
      )}
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
  const [tab, setTab] = useState<'overview' | 'weight' | 'training' | 'sleep' | 'nutrition' | 'masterplan'>('overview')

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
    { id: 'masterplan', label: 'Masterplan' },
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

      {tab === 'masterplan' && clientId && (
        <MasterplanTab clientId={clientId} settings={settings} />
      )}
    </div>
  )
}
