import { useEffect, useMemo, useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  EX_BASE, loadLocalExercises, loadMyExerciseNames, findLocalExercise, matchesExercise, norm,
  type LocalExercise,
} from '../lib/exercises'

type Suggestion = { kind: 'pool'; ex: LocalExercise } | { kind: 'own'; name: string }

// Übungsname mit Vorschlägen aus dem Übungspool (mit GIF und Anleitung) und aus den eigenen Übungen.
// Jeder andere Name ist erlaubt und gilt als eigene Übung (ohne GIF und Anleitung).
export function ExerciseNameInput({ value, onChange, placeholder = 'Übungsname' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const { user } = useAuth()
  const [pool, setPool] = useState<LocalExercise[]>([])
  const [own, setOwn] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadLocalExercises().then(setPool) }, [])
  useEffect(() => {
    if (!user || pool.length === 0) return
    let alive = true
    loadMyExerciseNames(user.id, pool).then(names => { if (alive) setOwn(names) })
    return () => { alive = false }
  }, [user, pool])

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = value.trim()
    if (norm(q).length < 2) return []
    const words = norm(q).split(/\s+/).filter(Boolean)
    const ownHits = own.filter(n => words.every(w => norm(n).includes(w))).slice(0, 3)
    const poolHits = pool.filter(e => matchesExercise(e, q)).slice(0, 7 - ownHits.length)
    return [
      ...ownHits.map<Suggestion>(name => ({ kind: 'own', name })),
      ...poolHits.map<Suggestion>(ex => ({ kind: 'pool', ex })),
    ]
  }, [value, pool, own])

  function pick(name: string) {
    onChange(name)
    setOpen(false)
  }

  const trimmed = value.trim()
  const known = trimmed !== '' && pool.length > 0 && findLocalExercise(trimmed, pool) !== null
  const isOwn = trimmed !== '' && pool.length > 0 && !known

  return (
    <div ref={wrapRef} className="relative flex-1">
      <input
        className="input w-full text-sm py-2"
        placeholder={placeholder}
        value={value}
        onChange={ev => { onChange(ev.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {isOwn && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
          <UserRound size={12} className="shrink-0 text-brand" aria-hidden="true" />
          Eigene Übung ohne GIF und Anleitung. Sie wird mit gespeichert und dir beim nächsten Mal vorgeschlagen.
        </p>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map(s => s.kind === 'own' ? (
            <button
              key={`own-${s.name}`}
              type="button"
              onMouseDown={() => pick(s.name)}
              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <UserRound size={14} className="text-brand" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{s.name}</div>
                <div className="text-[10px] text-text-muted">Eigene Übung</div>
              </div>
            </button>
          ) : (
            <button
              key={s.ex.id}
              type="button"
              onMouseDown={() => pick(s.ex.name)}
              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-bg-elevated overflow-hidden shrink-0">
                <img src={EX_BASE + s.ex.image} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{s.ex.name}</div>
                <div className="text-[10px] text-text-muted">{s.ex.target}{s.ex.equipment ? ` · ${s.ex.equipment}` : ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
