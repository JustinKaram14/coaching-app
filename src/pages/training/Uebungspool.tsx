// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Dumbbell, Info, Search, X } from 'lucide-react'
import {
  MUSCLE_GROUPS,
  exerciseGifUrl,
  exerciseImageUrl,
  loadExerciseData,
  normalizeText,
  searchHaystack,
} from '../../lib/exerciseData'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../lib/utils'

export function KQ({ ex: exercise, onClose: handleClose }) {
  let [showStill, setShowStill] = useState(false)
  return (
    useEffect(() => {
      let onKeyDown = (event) => {
        event.key === 'Escape' && handleClose()
      }
      return (document.addEventListener('keydown', onKeyDown), () => document.removeEventListener('keydown', onKeyDown))
    }, [handleClose]),
    (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label={exercise.name}
      >
        <div className="absolute inset-0 bg-black/60 fade-in" onClick={handleClose} />
        <div className="relative bg-bg-card border border-border w-full sm:max-w-lg rounded-t-4xl sm:rounded-4xl overflow-hidden max-h-[90dvh] flex flex-col sheet-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-text-primary truncate">{exercise.name}</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {exercise.body_part_de} · {exercise.equipment_de}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="ml-3 p-2 rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="bg-bg-elevated flex items-center justify-center shrink-0"
            style={{
              height: 240,
            }}
          >
            <img
              src={showStill ? exerciseImageUrl(exercise) : exerciseGifUrl(exercise)}
              alt={exercise.name}
              className="h-full object-contain"
              onError={() => setShowStill(true)}
            />
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-brand/15 text-brand text-xs font-semibold">
                {exercise.target_de}
              </span>
              {exercise.secondary_de.map((secondary) => (
                <span
                  className="px-2.5 py-1 rounded-full bg-bg-elevated text-text-secondary text-xs border border-border"
                  key={secondary}
                >
                  {secondary}
                </span>
              ))}
            </div>
            {exercise.steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={12} /> Ausführung
                </h3>
                <ol className="space-y-2.5">
                  {exercise.steps.map((step, stepIndex) => (
                    <li className="flex gap-3 text-sm text-text-secondary leading-relaxed" key={stepIndex}>
                      <span className="w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                        {stepIndex + 1}
                      </span>
                      <span>{/[.!?]$/.test(step) ? step : step + '.'}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-[11px] text-text-muted">Englischer Name: {exercise.name_en}</p>
          </div>
        </div>
      </div>
    )
  )
}
export function QQ_({ ex: exercise, onClick: handleClick }) {
  let [imageFailed, setImageFailed] = useState(false)
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-2xl hover:bg-bg-elevated active:scale-[0.985] transition-all text-left group"
    >
      <div className="w-12 h-12 rounded-xl bg-bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
        {imageFailed ? (
          <Dumbbell size={20} className="text-text-muted" />
        ) : (
          <img
            src={exerciseImageUrl(exercise)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{exercise.name}</div>
        <div className="text-xs text-text-muted mt-0.5 truncate">
          {exercise.target_de} · {exercise.equipment_de}
        </div>
      </div>
      <ChevronRight
        size={14}
        className="text-text-muted opacity-40 group-hover:opacity-80 transition-opacity shrink-0"
      />
    </button>
  )
}
export function Uebungspool({ embedded: isEmbedded = false }) {
  let [exercises, setExercises] = useState([]),
    [isLoading, setIsLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [search, setSearch] = useState(''),
    [groupFilter, setGroupFilter] = useState(null),
    [selected, setSelected] = useState(null),
    letterRefs = useRef({})
  useEffect(() => {
    loadExerciseData()
      .then((data) => {
        ;(setExercises(data), setIsLoading(false))
      })
      .catch(() => {
        ;(setFailed(true), setIsLoading(false))
      })
  }, [])
  let haystacks = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, searchHaystack(exercise)])), [exercises]),
    filtered = useMemo(() => {
      let words = normalizeText(search).split(' ').filter(Boolean)
      return exercises
        .filter((exercise) => {
          if (groupFilter && exercise.group !== groupFilter) return false
          if (words.length) {
            let haystack = haystacks.get(exercise.id) ?? ''
            return words.every((word) => haystack.includes(word))
          }
          return true
        })
        .sort((first, second) => first.name.localeCompare(second.name, 'de'))
    }, [exercises, haystacks, search, groupFilter]),
    sections = useMemo(() => {
      let byLetter = {}
      for (let exercise of filtered) {
        let letter = (exercise.name[0] ?? '#').toUpperCase()
        ;(byLetter[letter] ??= []).push(exercise)
      }
      return Object.entries(byLetter).sort(([letterA], [letterB]) => letterA.localeCompare(letterB, 'de'))
    }, [filtered]),
    letters = sections.map(([letter]) => letter)
  return isLoading ? (
    <div className="flex items-center justify-center py-32">
      <Spinner size={36} />
    </div>
  ) : failed || exercises.length === 0 ? (
    <div className="card text-center py-10 space-y-3 max-w-2xl">
      <Dumbbell size={40} className="text-text-muted mx-auto" />
      <p className="font-semibold text-text-primary">Der Übungspool konnte nicht geladen werden</p>
      <p className="text-sm text-text-secondary max-w-sm mx-auto">
        Prüfe deine Internetverbindung und lade die Seite neu.
      </p>
    </div>
  ) : (
    <div className="flex gap-2 max-w-2xl relative">
      <div className="flex-1 min-w-0 space-y-4">
        {!isEmbedded && (
          <div>
            <h1 className="section-title text-2xl">Übungspool</h1>
            <p className="text-text-secondary text-sm mt-0.5">{exercises.length} Übungen</p>
          </div>
        )}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder={`Übung suchen (${exercises.length} Übungen)`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-9 pr-9"
            aria-label="Übung suchen"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              aria-label="Suche leeren"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setGroupFilter(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
              groupFilter ? 'border-border text-text-secondary hover:border-brand/40' : 'bg-primary border-brand text-white',
            )}
          >
            Alle
          </button>
          {MUSCLE_GROUPS.filter((muscle) => muscle.key !== 'sonstige').map((muscle) => (
            <button
              onClick={() => setGroupFilter(groupFilter === muscle.key ? null : muscle.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
                groupFilter === muscle.key
                  ? 'bg-primary border-brand text-white'
                  : 'border-border text-text-secondary hover:border-brand/40',
              )}
              key={muscle.key}
            >
              {muscle.label}
            </button>
          ))}
        </div>
        {(search || groupFilter) && (
          <p className="text-xs text-text-muted">
            {filtered.length} Ergebnis{filtered.length === 1 ? '' : 'se'}
          </p>
        )}
        <div className="space-y-1">
          {sections.length === 0 ? (
            <div className="card text-center py-8 text-text-muted text-sm">Keine Übungen gefunden.</div>
          ) : (
            sections.map(([letter, exercisesOfLetter]) => (
              <div
                ref={(element) => {
                  letterRefs.current[letter] = element
                }}
                key={letter}
              >
                <div className="px-3 py-1 text-xs font-bold text-text-muted uppercase tracking-widest sticky top-0 bg-bg/90 backdrop-blur-sm z-10 border-b border-border/40 mb-0.5">
                  {letter}
                </div>
                {exercisesOfLetter.map((exercise) => (
                  <QQ_ ex={exercise} onClick={() => setSelected(exercise)} key={exercise.id} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      {!search && !groupFilter && letters.length > 4 && (
        <div className="flex flex-col items-center gap-0.5 py-2 shrink-0 sticky top-8 self-start">
          {letters.map((letter) => (
            <button
              onClick={() =>
                letterRefs.current[letter]?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
              className="w-5 text-center text-[10px] font-bold text-brand leading-tight"
              key={letter}
            >
              {letter}
            </button>
          ))}
        </div>
      )}
      {selected && <KQ ex={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
