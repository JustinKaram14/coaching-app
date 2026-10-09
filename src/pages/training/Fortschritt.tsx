// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { guessMuscleGroup, loadExerciseData, muscleGroupLabel, normalizeText } from '../../lib/exerciseData'
import { ChevronDown, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { cn, toLocalISO } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { subDays } from 'date-fns'
import { useCountUpText as useCountUp } from '../../hooks/useCountUp'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

export function H2(e, t) {
  return t <= 1 ? e : e * (1 + t / 30)
}
export function U2(e) {
  return e
    .filter((e) => e.wdh && e.wdh > 0 && e.kg && e.kg > 0)
    .map((e) => ({
      kg: e.kg,
      wdh: e.wdh,
    }))
}
export function W2(e) {
  let t = U2(e)
  return t.length ? Math.max(...t.map((e) => H2(e.kg, e.wdh))) : null
}
export function G2(e) {
  let t = U2(e)
  return t.length ? t.reduce((e, t) => e + t.kg * t.wdh, 0) : null
}
export function K2(e) {
  let t = e.map((e) => e.wdh ?? 0).filter((e) => e > 0)
  return t.length ? Math.max(...t) : null
}
export function q2(e, t) {
  if (!t.length) return null
  let n = [...t].sort((e, t) => e.datum.localeCompare(t.datum)),
    r = null
  for (let t of n)
    if (t.datum <= e) r = t.gewicht
    else break
  return r ?? n[0].gewicht
}
export function J2(e, t, n, r) {
  let i = new Map()
  for (let t of e) {
    let e = normalizeText(t.name)
    e && (i.get(e) ?? i.set(e, []).get(e)).push(t)
  }
  let a = []
  for (let [e, o] of i) {
    let i = o[o.length - 1].name,
      s = o.some((e) => U2(e.sets).length > 0),
      c = new Map()
    for (let e of o) (c.get(e.datum) ?? c.set(e.datum, []).get(e.datum)).push(e)
    let l = []
    for (let [e, r] of [...c].sort(([e], [t]) => e.localeCompare(t))) {
      let i = r.flatMap((e) => e.sets),
        a
      ;((a = s ? (n === 'volumen' ? G2(i) : W2(i)) : K2(i)),
        a !== null &&
          l.push({
            datum: e,
            value: a,
            bw: q2(e, t),
          }))
    }
    l.length &&
      a.push({
        key: e,
        name: i,
        group: guessMuscleGroup(i, r),
        unit: s ? 'kg' : 'wdh',
        points: l,
      })
  }
  return a.sort((e, t) => t.points.length - e.points.length)
}
export function Y2(e, t, n) {
  let r = e.points.filter((e) => !t || e.datum >= t)
  if (r.length < 2) return null
  let i = (t) => (!n || e.unit !== 'kg' ? t.value : t.bw ? t.value / t.bw : NaN),
    a = r[0],
    o = r[r.length - 1],
    s = i(a),
    c = i(o)
  return !isFinite(s) || !isFinite(c) || s <= 0
    ? null
    : {
        series: e,
        start: s,
        end: c,
        delta: c - s,
        pct: ((c - s) / s) * 100,
        from: a.datum,
        to: o.datum,
      }
}
export function X2(e) {
  let t = new Map()
  for (let n of e) (t.get(n.series.group) ?? t.set(n.series.group, []).get(n.series.group)).push(n)
  return [...t]
    .map(([e, t]) => ({
      group: e,
      items: t.sort((e, t) => t.pct - e.pct),
      pct: t.reduce((e, t) => e + t.pct, 0) / t.length,
    }))
    .sort((e, t) => t.pct - e.pct)
}
export function Z2(e) {
  return e.length ? e.reduce((e, t) => e + t.pct, 0) / e.length : null
}
export const Q2 = (e) => `${e > 0 ? '+' : ''}${e.toFixed(1).replace('.', ',')} %`
export const $2 = (e, t = 1) => `${(Math.round(e * 10 ** t) / 10 ** t).toString().replace('.', ',')} kg`
export const e4 = [
  {
    key: '4w',
    label: '4 Wochen',
    days: 28,
    text: 'in den letzten 4 Wochen',
  },
  {
    key: '12w',
    label: '3 Monate',
    days: 84,
    text: 'in den letzten 3 Monaten',
  },
  {
    key: 'all',
    label: 'Gesamt',
    days: null,
    text: 'seit Beginn',
  },
]
export function T4_({ values: e }) {
  if (e.length < 2) return null
  let t = Math.min(...e),
    n = Math.max(...e) - t || 1,
    r = e.map((r, i) => `${(i / (e.length - 1)) * 100},${34 - ((r - t) / n) * 30}`).join(' '),
    i = r.split(' ').at(-1).split(',')
  return (
    <svg viewBox="0 0 100 38" preserveAspectRatio="none" className="w-full h-9" aria-hidden="true">
      <polyline
        points={r}
        fill="none"
        stroke="rgb(var(--c-brand))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={i[0]} cy={i[1]} r="2.5" fill="rgb(var(--c-brand))" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
export function N4_({ pct: e }) {
  let t = e >= 0,
    N_ = t ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-extrabold tabular-nums',
        t ? 'text-success' : 'text-warning',
      )}
    >
      <N_ size={14} aria-hidden="true" /> {Q2(e)}
    </span>
  )
}
export function Fortschritt() {
  let { user: e } = useAuth(),
    [t, n] = useState(true),
    [r, i] = useState([]),
    [a, o] = useState([]),
    [s, c] = useState([]),
    [l, u] = useState('12w'),
    [d, f] = useState('max'),
    [p, m] = useState(false),
    [h, g] = useState(null),
    [_, y] = useState(false)
  useEffect(() => {
    if (!e) return
    let t = true
    async function r() {
      let [r, a, s, l] = await Promise.all([
        supabase.from('training').select('id,datum').eq('user_id', e.id),
        supabase
          .from('uebungen')
          .select('uebungsname,saetze_log,saetze,wdh,gewicht_kg,training_id')
          .eq('user_id', e.id),
        supabase.from('gewicht').select('datum,gewicht').eq('user_id', e.id).order('datum', {
          ascending: true,
        }),
        loadExerciseData().catch(() => []),
      ])
      if (!t) return
      let u = new Map((r.data ?? []).map((e) => [e.id, e.datum])),
        d = []
      for (let e of a.data ?? []) {
        let t = u.get(e.training_id)
        if (!t) continue
        let n =
          Array.isArray(e.saetze_log) && e.saetze_log.length
            ? e.saetze_log
            : e.saetze
              ? Array.from(
                  {
                    length: e.saetze,
                  },
                  () => ({
                    wdh: e.wdh,
                    kg: e.gewicht_kg,
                  }),
                )
              : []
        n.length &&
          d.push({
            name: e.uebungsname,
            datum: t,
            sets: n,
          })
      }
      ;(i(d), o(s.data ?? []), c(l), n(false))
    }
    return (
      r(),
      () => {
        t = false
      }
    )
  }, [e])
  let b = e4.find((e) => e.key === l),
    x = b.days ? toLocalISO(subDays(new Date(), b.days)) : null,
    S = p && d === 'max',
    {
      groups: C,
      total: w,
      trackedExercises: T,
    } = useMemo(() => {
      let e = J2(r, a, d, s),
        t = X2(e.map((e) => Y2(e, x, S)).filter((e) => !!e))
      return {
        groups: t,
        total: Z2(t),
        trackedExercises: e.length,
      }
    }, [r, a, s, d, x, S]),
    E = useCountUp(w ?? 0, Q2, {
      duration: 1100,
      delay: 200,
    }),
    D = Math.max(5, ...C.map((e) => Math.abs(e.pct))),
    O = (e, t) =>
      e.series.unit === 'wdh'
        ? `${Math.round(t)} Wdh.`
        : S
          ? `${t.toFixed(2).replace('.', ',')} × KG`
          : d === 'volumen'
            ? `${Math.round(t).toLocaleString('de-DE')} kg`
            : $2(t),
    k = (e) => {
      let t = e.delta > 0 ? '+' : ''
      return e.series.unit === 'wdh'
        ? `${t}${Math.round(e.delta)} Wdh.`
        : S
          ? `${t}${e.delta.toFixed(2).replace('.', ',')} × KG`
          : d === 'volumen'
            ? `${t}${Math.round(e.delta).toLocaleString('de-DE')} kg`
            : `${t}${$2(e.delta)}`
    }
  return t ? (
    <div className="flex justify-center py-16">
      <Spinner size={28} />
    </div>
  ) : (
    <div className="space-y-5">
      <div className="space-y-3 enter">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Zeitraum">
          {e4.map((e) => (
            <button
              aria-pressed={l === e.key}
              onClick={() => u(e.key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95',
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
        <div className="flex gap-2 flex-wrap items-center" role="group" aria-label="Vergleichswert">
          {[
            ['max', 'Maximalgewicht'],
            ['volumen', 'Volumen'],
          ].map(([e, t]) => (
            <button
              aria-pressed={d === e}
              onClick={() => f(e)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                d === e
                  ? 'bg-brand/15 border-brand/50 text-brand'
                  : 'border-border text-text-muted hover:border-brand/40',
              )}
              key={e}
            >
              {t}
            </button>
          ))}
          <label
            className={cn(
              'flex items-center gap-2 text-xs ml-1 select-none',
              d === 'max' ? 'text-text-secondary cursor-pointer' : 'text-text-muted opacity-60',
            )}
          >
            <input
              type="checkbox"
              checked={p && d === 'max'}
              disabled={d !== 'max'}
              onChange={(e) => m(e.target.checked)}
            />
            Im Verhältnis zum Körpergewicht
          </label>
          <button
            onClick={() => y((e) => !e)}
            aria-expanded={_}
            className="ml-auto text-xs text-brand flex items-center gap-1"
          >
            <Info size={13} aria-hidden="true" /> So wird verglichen
          </button>
        </div>
        {_ && (
          <div className="card !p-4 text-sm text-text-secondary leading-relaxed enter">
            <p>
              <strong className="text-text-primary">Maximalgewicht:</strong> Jeder Satz wird in ein geschätztes Gewicht
              für eine Wiederholung umgerechnet (Gewicht × (1 + Wdh. ÷ 30)). So lassen sich 10 Wiederholungen mit 55 kg
              und 8 Wiederholungen mit 60 kg direkt vergleichen. Pro Trainingstag zählt dein bester Satz.
            </p>
            <p className="mt-2">
              <strong className="text-text-primary">Volumen:</strong> Summe aus Sätzen × Wiederholungen × Gewicht pro
              Trainingstag.
            </p>
            <p className="mt-2">
              <strong className="text-text-primary">Muskelgruppe:</strong> Durchschnitt der Prozent-Änderung aller
              Übungen dieser Gruppe. Es zählen nur Übungen mit mindestens zwei Einträgen im Zeitraum.
            </p>
          </div>
        )}
      </div>
      {C.length === 0 ? (
        <div
          className="card enter"
          style={{
            '--d': 80,
          }}
        >
          <EmptyState
            icon={TrendingUp}
            title="Noch nicht genug Daten"
            description={
              T === 0
                ? 'Trage Trainings mit Gewicht und Wiederholungen ein. Sobald du dieselbe Übung an zwei Tagen gemacht hast, siehst du hier, wie viel stärker du geworden bist.'
                : `Für ${b.text} gibt es noch keine Übung mit zwei Einträgen. Wähle einen längeren Zeitraum oder trainiere dieselbe Übung noch einmal.`
            }
          />
        </div>
      ) : (
        <>
          <div
            className="card enter text-center"
            style={{
              '--d': 70,
            }}
          >
            <div className="text-xs font-bold tracking-wider text-text-secondary uppercase">
              Durchschnitt aller Muskelgruppen
            </div>
            <div
              className={cn(
                'text-5xl font-extrabold tracking-tight mt-1 tabular-nums',
                (w ?? 0) >= 0 ? 'text-brand' : 'text-warning',
              )}
            >
              <span ref={E} />
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {(w ?? 0) >= 0 ? 'stärker' : 'weniger'} {b.text} · {C.reduce((e, t) => e + t.items.length, 0)} Übungen
              verglichen
            </div>
          </div>
          <div className="space-y-3">
            {C.map((e, t) => {
              let n = h === e.group
              return (
                <div
                  className="card !p-0 enter overflow-hidden"
                  style={{
                    '--d': 130 + t * 55,
                  }}
                  key={e.group}
                >
                  <button
                    onClick={() => g(n ? null : e.group)}
                    aria-expanded={n}
                    className="w-full p-4 sm:p-5 flex items-center gap-4 text-left active:bg-bg-elevated/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-text-primary">{muscleGroupLabel(e.group)}</span>
                        <N4_ pct={e.pct} />
                      </div>
                      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden" aria-hidden="true">
                        <div
                          className={cn('h-full rounded-full grow-x', e.pct >= 0 ? 'bg-brand' : 'bg-warning')}
                          style={{
                            width: `${Math.max(4, Math.min(100, (Math.abs(e.pct) / D) * 100))}%`,
                            '--d': 220 + t * 55,
                          }}
                        />
                      </div>
                      <div className="text-xs text-text-muted">
                        {e.items.length} {e.items.length === 1 ? 'Übung' : 'Übungen'}
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={cn('text-text-muted transition-transform duration-300 shrink-0', n && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>
                  {n && (
                    <ul className="border-t border-border divide-y divide-border">
                      {e.items.map((e, t) => {
                        let n = e.series.points.filter((e) => !x || e.datum >= x)
                        return (
                          <li
                            className="p-4 sm:px-5 enter"
                            style={{
                              '--d': t * 45,
                            }}
                            key={e.series.key}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text-primary truncate">{e.series.name}</div>
                                <div className="text-xs text-text-muted mt-0.5">
                                  {O(e, e.start)} →{' '}
                                  <span className="text-text-secondary font-semibold">{O(e, e.end)}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <N4_ pct={e.pct} />
                                <div className="text-xs text-text-muted mt-0.5">{k(e)}</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <T4_ values={n.map((e) => (S && e.bw ? e.value / e.bw : e.value))} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
