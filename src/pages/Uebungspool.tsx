import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ChevronRight, Dumbbell, Info } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string
  name: string
  category: string
  body_part: string
  equipment: string
  instructions: Record<string, string>
  instruction_steps: Record<string, string[]>
  muscle_group: string
  secondary_muscles: string[]
  target: string
  image: string
  gif_url: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL + 'exercises/'

function gifUrl(ex: Exercise) {
  return BASE + ex.gif_url
}
function imgUrl(ex: Exercise) {
  return BASE + ex.image
}

const BODY_PART_DE: Record<string, string> = {
  back: 'Rücken', chest: 'Brust', shoulders: 'Schultern',
  'upper arms': 'Oberarme', 'lower arms': 'Unterarme',
  'upper legs': 'Oberschenkel', 'lower legs': 'Unterschenkel',
  waist: 'Bauch', cardio: 'Cardio', neck: 'Nacken',
}
function bpDe(bp: string) {
  return BODY_PART_DE[bp?.toLowerCase()] ?? bp
}

// ─── Exercise Detail Modal ────────────────────────────────────────────────────

function DetailModal({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const secondary = Array.isArray(ex.secondary_muscles)
    ? ex.secondary_muscles
    : ex.secondary_muscles
      ? String(ex.secondary_muscles).split(',').map(s => s.trim()).filter(Boolean)
      : []

  const steps = ex.instruction_steps?.en ?? ex.instruction_steps?.de ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-text-primary truncate">{ex.name}</h2>
            <p className="text-xs text-text-muted mt-0.5">{bpDe(ex.body_part)} · {ex.equipment}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted">
            <X size={18} />
          </button>
        </div>

        {/* GIF */}
        <div className="bg-bg-elevated flex items-center justify-center shrink-0" style={{ height: 240 }}>
          <img
            src={gifUrl(ex)}
            alt={ex.name}
            className="h-full object-contain"
            onError={e => { (e.target as HTMLImageElement).src = imgUrl(ex) }}
          />
        </div>

        {/* Details */}
        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {/* Muscles */}
          <div className="flex flex-wrap gap-2">
            {ex.target && (
              <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">{ex.target}</span>
            )}
            {ex.muscle_group && ex.muscle_group !== ex.target && (
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary/80 text-xs">{ex.muscle_group}</span>
            )}
            {secondary.map(m => (
              <span key={m} className="px-2.5 py-1 rounded-full bg-bg-elevated text-text-muted text-xs border border-border">{m}</span>
            ))}
          </div>

          {/* Instructions */}
          {steps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Info size={12} /> Ausführung
              </h3>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
                    <span>{step.endsWith('.') ? step : step + '.'}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExRow({ ex, onClick }: { ex: Exercise; onClick: () => void }) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-bg-elevated transition-colors text-left group"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl bg-bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
        {!imgError ? (
          <img
            src={imgUrl(ex)}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Dumbbell size={20} className="text-text-muted" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{ex.name}</div>
        <div className="text-xs text-text-muted mt-0.5">{bpDe(ex.body_part)}</div>
      </div>

      <ChevronRight size={14} className="text-text-muted opacity-40 group-hover:opacity-80 transition-opacity shrink-0" />
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Uebungspool() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null)
  const [detail, setDetail] = useState<Exercise | null>(null)
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'exercises/data/exercises.json')
      .then(r => r.json())
      .then((data: Exercise[]) => { setExercises(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Body parts
  const bodyParts = useMemo(() => {
    const set = new Set(exercises.map(e => e.body_part?.toLowerCase()).filter(Boolean))
    return [...set].sort()
  }, [exercises])

  // Filtered + sorted list
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return exercises
      .filter(e => {
        if (selectedBodyPart && e.body_part?.toLowerCase() !== selectedBodyPart) return false
        if (q) {
          return e.name?.toLowerCase().includes(q)
            || e.body_part?.toLowerCase().includes(q)
            || e.category?.toLowerCase().includes(q)
            || e.equipment?.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'de'))
  }, [exercises, query, selectedBodyPart])

  // Grouped by first letter
  const grouped = useMemo(() => {
    const map: Record<string, Exercise[]> = {}
    for (const ex of filtered) {
      const letter = (ex.name?.[0] ?? '#').toUpperCase()
      ;(map[letter] ??= []).push(ex)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const letters = grouped.map(([l]) => l)

  function scrollToLetter(letter: string) {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size={36} />
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="section-title text-2xl">Übungspool</h1>
        <div className="card text-center py-10 space-y-3">
          <Dumbbell size={40} className="text-text-muted mx-auto" />
          <p className="font-semibold text-text-primary">Noch keine Übungen geladen</p>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            Kopiere <code className="text-xs bg-bg-elevated px-1.5 py-0.5 rounded">exercises.json</code>,{' '}
            <code className="text-xs bg-bg-elevated px-1.5 py-0.5 rounded">videos/</code> und{' '}
            <code className="text-xs bg-bg-elevated px-1.5 py-0.5 rounded">images/</code> aus dem Repo in{' '}
            <code className="text-xs bg-bg-elevated px-1.5 py-0.5 rounded">public/exercises/</code>.
          </p>
          <p className="text-xs text-text-muted">
            Repo: github.com/hasaneyldrm/exercises-dataset
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 max-w-2xl relative">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div>
          <h1 className="section-title text-2xl">Übungspool</h1>
          <p className="text-text-secondary text-sm mt-0.5">{exercises.length} Übungen</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Übung suchen…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Body part filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedBodyPart(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0 ${
              !selectedBodyPart ? 'bg-primary border-primary text-white' : 'border-border text-text-secondary hover:border-primary/40'
            }`}
          >
            Alle
          </button>
          {bodyParts.map(bp => (
            <button
              key={bp}
              onClick={() => setSelectedBodyPart(selectedBodyPart === bp ? null : bp)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0 ${
                selectedBodyPart === bp ? 'bg-primary border-primary text-white' : 'border-border text-text-secondary hover:border-primary/40'
              }`}
            >
              {bpDe(bp)}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(query || selectedBodyPart) && (
          <p className="text-xs text-text-muted">{filtered.length} Ergebnis{filtered.length !== 1 ? 'se' : ''}</p>
        )}

        {/* Exercise list grouped by letter */}
        <div className="space-y-1">
          {grouped.length === 0 ? (
            <div className="card text-center py-8 text-text-muted text-sm">Keine Übungen gefunden.</div>
          ) : (
            grouped.map(([letter, exs]) => (
              <div key={letter} ref={el => { letterRefs.current[letter] = el }}>
                {/* Letter header */}
                <div className="px-3 py-1 text-xs font-bold text-text-muted uppercase tracking-widest sticky top-0 bg-bg/90 backdrop-blur-sm z-10 border-b border-border/40 mb-0.5">
                  {letter}
                </div>
                {exs.map(ex => (
                  <ExRow key={ex.id} ex={ex} onClick={() => setDetail(ex)} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* A–Z Sidebar */}
      {!query && !selectedBodyPart && letters.length > 4 && (
        <div className="flex flex-col items-center gap-0.5 py-2 shrink-0 sticky top-8 self-start">
          {letters.map(l => (
            <button
              key={l}
              onClick={() => scrollToLetter(l)}
              className="w-5 text-center text-[10px] font-bold text-primary hover:text-primary-light transition-colors leading-tight"
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detail && <DetailModal ex={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
