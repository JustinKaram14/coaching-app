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

export function KQ({ ex: e, onClose: t }) {
  let [n, r] = useState(false)
  return (
    useEffect(() => {
      let e = (e) => {
        e.key === 'Escape' && t()
      }
      return (document.addEventListener('keydown', e), () => document.removeEventListener('keydown', e))
    }, [t]),
    (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label={e.name}
      >
        <div className="absolute inset-0 bg-black/60 fade-in" onClick={t} />
        <div className="relative bg-bg-card border border-border w-full sm:max-w-lg rounded-t-4xl sm:rounded-4xl overflow-hidden max-h-[90dvh] flex flex-col sheet-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-text-primary truncate">{e.name}</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {e.body_part_de} · {e.equipment_de}
              </p>
            </div>
            <button
              onClick={t}
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
              src={n ? exerciseImageUrl(e) : exerciseGifUrl(e)}
              alt={e.name}
              className="h-full object-contain"
              onError={() => r(true)}
            />
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-brand/15 text-brand text-xs font-semibold">
                {e.target_de}
              </span>
              {e.secondary_de.map((e) => (
                <span
                  className="px-2.5 py-1 rounded-full bg-bg-elevated text-text-secondary text-xs border border-border"
                  key={e}
                >
                  {e}
                </span>
              ))}
            </div>
            {e.steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={12} /> Ausführung
                </h3>
                <ol className="space-y-2.5">
                  {e.steps.map((e, t) => (
                    <li className="flex gap-3 text-sm text-text-secondary leading-relaxed" key={t}>
                      <span className="w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                        {t + 1}
                      </span>
                      <span>{/[.!?]$/.test(e) ? e : e + '.'}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-[11px] text-text-muted">Englischer Name: {e.name_en}</p>
          </div>
        </div>
      </div>
    )
  )
}
export function QQ_({ ex: e, onClick: t }) {
  let [n, r] = useState(false)
  return (
    <button
      onClick={t}
      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-2xl hover:bg-bg-elevated active:scale-[0.985] transition-all text-left group"
    >
      <div className="w-12 h-12 rounded-xl bg-bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
        {n ? (
          <Dumbbell size={20} className="text-text-muted" />
        ) : (
          <img
            src={exerciseImageUrl(e)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => r(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{e.name}</div>
        <div className="text-xs text-text-muted mt-0.5 truncate">
          {e.target_de} · {e.equipment_de}
        </div>
      </div>
      <ChevronRight
        size={14}
        className="text-text-muted opacity-40 group-hover:opacity-80 transition-opacity shrink-0"
      />
    </button>
  )
}
export function Uebungspool({ embedded: e = false }) {
  let [t, n] = useState([]),
    [r, i] = useState(true),
    [a, o] = useState(false),
    [s, c] = useState(''),
    [l, u] = useState(null),
    [d, f] = useState(null),
    p = useRef({})
  useEffect(() => {
    loadExerciseData()
      .then((e) => {
        ;(n(e), i(false))
      })
      .catch(() => {
        ;(o(true), i(false))
      })
  }, [])
  let m = useMemo(() => new Map(t.map((e) => [e.id, searchHaystack(e)])), [t]),
    h = useMemo(() => {
      let e = normalizeText(s).split(' ').filter(Boolean)
      return t
        .filter((t) => {
          if (l && t.group !== l) return false
          if (e.length) {
            let n = m.get(t.id) ?? ''
            return e.every((e) => n.includes(e))
          }
          return true
        })
        .sort((e, t) => e.name.localeCompare(t.name, 'de'))
    }, [t, m, s, l]),
    g = useMemo(() => {
      let e = {}
      for (let t of h) {
        let n = (t.name[0] ?? '#').toUpperCase()
        ;(e[n] ??= []).push(t)
      }
      return Object.entries(e).sort(([e], [t]) => e.localeCompare(t, 'de'))
    }, [h]),
    _ = g.map(([e]) => e)
  return r ? (
    <div className="flex items-center justify-center py-32">
      <Spinner size={36} />
    </div>
  ) : a || t.length === 0 ? (
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
        {!e && (
          <div>
            <h1 className="section-title text-2xl">Übungspool</h1>
            <p className="text-text-secondary text-sm mt-0.5">{t.length} Übungen</p>
          </div>
        )}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder={`Übung suchen (${t.length} Übungen)`}
            value={s}
            onChange={(e) => c(e.target.value)}
            className="input pl-9 pr-9"
            aria-label="Übung suchen"
          />
          {s && (
            <button
              onClick={() => c('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              aria-label="Suche leeren"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => u(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
              l ? 'border-border text-text-secondary hover:border-brand/40' : 'bg-primary border-brand text-white',
            )}
          >
            Alle
          </button>
          {MUSCLE_GROUPS.filter((e) => e.key !== 'sonstige').map((e) => (
            <button
              onClick={() => u(l === e.key ? null : e.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
                l === e.key
                  ? 'bg-primary border-brand text-white'
                  : 'border-border text-text-secondary hover:border-brand/40',
              )}
              key={e.key}
            >
              {e.label}
            </button>
          ))}
        </div>
        {(s || l) && (
          <p className="text-xs text-text-muted">
            {h.length} Ergebnis{h.length === 1 ? '' : 'se'}
          </p>
        )}
        <div className="space-y-1">
          {g.length === 0 ? (
            <div className="card text-center py-8 text-text-muted text-sm">Keine Übungen gefunden.</div>
          ) : (
            g.map(([e, t]) => (
              <div
                ref={(t) => {
                  p.current[e] = t
                }}
                key={e}
              >
                <div className="px-3 py-1 text-xs font-bold text-text-muted uppercase tracking-widest sticky top-0 bg-bg/90 backdrop-blur-sm z-10 border-b border-border/40 mb-0.5">
                  {e}
                </div>
                {t.map((e) => (
                  <QQ_ ex={e} onClick={() => f(e)} key={e.id} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      {!s && !l && _.length > 4 && (
        <div className="flex flex-col items-center gap-0.5 py-2 shrink-0 sticky top-8 self-start">
          {_.map((e) => (
            <button
              onClick={() =>
                p.current[e]?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
              className="w-5 text-center text-[10px] font-bold text-brand leading-tight"
              key={e}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      {d && <KQ ex={d} onClose={() => f(null)} />}
    </div>
  )
}
