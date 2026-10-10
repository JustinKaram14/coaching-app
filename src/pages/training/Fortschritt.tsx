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

export function estimateOneRepMax(weightKg, repCount) {
  return repCount <= 1 ? weightKg : weightKg * (1 + repCount / 30)
}
export function validSets(setList) {
  return setList
    .filter((setEntry) => setEntry.wdh && setEntry.wdh > 0 && setEntry.kg && setEntry.kg > 0)
    .map((setEntry) => ({
      kg: setEntry.kg,
      wdh: setEntry.wdh,
    }))
}
export function bestEstimate(setList) {
  let valid = validSets(setList)
  return valid.length ? Math.max(...valid.map((setEntry) => estimateOneRepMax(setEntry.kg, setEntry.wdh))) : null
}
export function volumeOf(setList) {
  let valid = validSets(setList)
  return valid.length ? valid.reduce((sum, setEntry) => sum + setEntry.kg * setEntry.wdh, 0) : null
}
export function maxReps(setList) {
  let repsList = setList.map((setEntry) => setEntry.wdh ?? 0).filter((reps) => reps > 0)
  return repsList.length ? Math.max(...repsList) : null
}
export function bodyWeightOn(day, weights) {
  if (!weights.length) return null
  let sorted = [...weights].sort((entryA, entryB) => entryA.datum.localeCompare(entryB.datum)),
    found = null
  for (let entry of sorted)
    if (entry.datum <= day) found = entry.gewicht
    else break
  return found ?? sorted[0].gewicht
}
export function buildSeries(entries, bodyWeights, mode, exerciseList) {
  let byName = new Map()
  for (let entry of entries) {
    let normName = normalizeText(entry.name)
    normName && (byName.get(normName) ?? byName.set(normName, []).get(normName)).push(entry)
  }
  let result = []
  for (let [nameKey, sessions] of byName) {
    let displayName = sessions[sessions.length - 1].name,
      hasWeights = sessions.some((session) => validSets(session.sets).length > 0),
      byDate = new Map()
    for (let session of sessions) (byDate.get(session.datum) ?? byDate.set(session.datum, []).get(session.datum)).push(session)
    let seriesPoints = []
    for (let [date, daySessions] of [...byDate].sort(([dateA], [dateB]) => dateA.localeCompare(dateB))) {
      let daySets = daySessions.flatMap((session) => session.sets),
        dayValue
      ;((dayValue = hasWeights ? (mode === 'volumen' ? volumeOf(daySets) : bestEstimate(daySets)) : maxReps(daySets)),
        dayValue !== null &&
          seriesPoints.push({
            datum: date,
            value: dayValue,
            bw: bodyWeightOn(date, bodyWeights),
          }))
    }
    seriesPoints.length &&
      result.push({
        key: nameKey,
        name: displayName,
        group: guessMuscleGroup(displayName, exerciseList),
        unit: hasWeights ? 'kg' : 'wdh',
        points: seriesPoints,
      })
  }
  return result.sort((first, second) => second.points.length - first.points.length)
}
export function compareSeries(oneSeries, since, relative) {
  let inRange = oneSeries.points.filter((point) => !since || point.datum >= since)
  if (inRange.length < 2) return null
  let i = (point) => (!relative || oneSeries.unit !== 'kg' ? point.value : point.bw ? point.value / point.bw : NaN),
    firstPoint = inRange[0],
    lastPoint = inRange[inRange.length - 1],
    startValue = i(firstPoint),
    endValue = i(lastPoint)
  return !isFinite(startValue) || !isFinite(endValue) || startValue <= 0
    ? null
    : {
        series: oneSeries,
        start: startValue,
        end: endValue,
        delta: endValue - startValue,
        pct: ((endValue - startValue) / startValue) * 100,
        from: firstPoint.datum,
        to: lastPoint.datum,
      }
}
export function groupByMuscle(comparisons) {
  let byGroup = new Map()
  for (let item of comparisons) (byGroup.get(item.series.group) ?? byGroup.set(item.series.group, []).get(item.series.group)).push(item)
  return [...byGroup]
    .map(([groupKey, groupItems]) => ({
      group: groupKey,
      items: groupItems.sort((first, second) => second.pct - first.pct),
      pct: groupItems.reduce((sum, item) => sum + item.pct, 0) / groupItems.length,
    }))
    .sort((first, second) => second.pct - first.pct)
}
export function averagePct(itemList) {
  return itemList.length ? itemList.reduce((sum, item) => sum + item.pct, 0) / itemList.length : null
}
export const formatPct = (percent) => `${percent > 0 ? '+' : ''}${percent.toFixed(1).replace('.', ',')} %`
export const formatKg = (kgValue, digits = 1) => `${(Math.round(kgValue * 10 ** digits) / 10 ** digits).toString().replace('.', ',')} kg`
export const RANGES = [
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
export function Sparkline({ values: numbers }) {
  if (numbers.length < 2) return null
  let minValue = Math.min(...numbers),
    range = Math.max(...numbers) - minValue || 1,
    polylinePoints = numbers.map((number, position) => `${(position / (numbers.length - 1)) * 100},${34 - ((number - minValue) / range) * 30}`).join(' '),
    endPoint = polylinePoints.split(' ').at(-1).split(',')
  return (
    <svg viewBox="0 0 100 38" preserveAspectRatio="none" className="w-full h-9" aria-hidden="true">
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="rgb(var(--c-brand))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={endPoint[0]} cy={endPoint[1]} r="2.5" fill="rgb(var(--c-brand))" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
export function TrendBadge({ pct: percent }) {
  let positive = percent >= 0,
    TrendIcon = positive ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-extrabold tabular-nums',
        positive ? 'text-success' : 'text-warning',
      )}
    >
      <TrendIcon size={14} aria-hidden="true" /> {formatPct(percent)}
    </span>
  )
}
export function Fortschritt() {
  let { user: authUser } = useAuth(),
    [loading, setLoading] = useState(true),
    [workouts, setWorkouts] = useState([]),
    [bodyWeights, setBodyWeights] = useState([]),
    [exerciseList, setExerciseList] = useState([]),
    [rangeKey, setRangeKey] = useState('12w'),
    [mode, setMode] = useState('max'),
    [relative, setRelative] = useState(false),
    [openGroup, setOpenGroup] = useState(null),
    [showInfo, setShowInfo] = useState(false)
  useEffect(() => {
    if (!authUser) return
    let active = true
    async function load() {
      let [trainingResult, exercisesResult, weightResult, exerciseData] = await Promise.all([
        supabase.from('training').select('id,datum').eq('user_id', authUser.id),
        supabase
          .from('uebungen')
          .select('uebungsname,saetze_log,saetze,wdh,gewicht_kg,training_id')
          .eq('user_id', authUser.id),
        supabase.from('gewicht').select('datum,gewicht').eq('user_id', authUser.id).order('datum', {
          ascending: true,
        }),
        loadExerciseData().catch(() => []),
      ])
      if (!active) return
      let dateByTraining = new Map((trainingResult.data ?? []).map((row) => [row.id, row.datum])),
        entries = []
      for (let exerciseRow of exercisesResult.data ?? []) {
        let trainingDate = dateByTraining.get(exerciseRow.training_id)
        if (!trainingDate) continue
        let setList =
          Array.isArray(exerciseRow.saetze_log) && exerciseRow.saetze_log.length
            ? exerciseRow.saetze_log
            : exerciseRow.saetze
              ? Array.from(
                  {
                    length: exerciseRow.saetze,
                  },
                  () => ({
                    wdh: exerciseRow.wdh,
                    kg: exerciseRow.gewicht_kg,
                  }),
                )
              : []
        setList.length &&
          entries.push({
            name: exerciseRow.uebungsname,
            datum: trainingDate,
            sets: setList,
          })
      }
      ;(setWorkouts(entries), setBodyWeights(weightResult.data ?? []), setExerciseList(exerciseData), setLoading(false))
    }
    return (
      load(),
      () => {
        active = false
      }
    )
  }, [authUser])
  let range = RANGES.find((option) => option.key === rangeKey),
    sinceDate = range.days ? toLocalISO(subDays(new Date(), range.days)) : null,
    useRelative = relative && mode === 'max',
    {
      groups: muscleGroups,
      total: totalPct,
      trackedExercises: trackedCount,
    } = useMemo(() => {
      let seriesList = buildSeries(workouts, bodyWeights, mode, exerciseList),
        groupList = groupByMuscle(seriesList.map((oneSeries) => compareSeries(oneSeries, sinceDate, useRelative)).filter((comparison) => !!comparison))
      return {
        groups: groupList,
        total: averagePct(groupList),
        trackedExercises: seriesList.length,
      }
    }, [workouts, bodyWeights, exerciseList, mode, sinceDate, useRelative]),
    totalRef = useCountUp(totalPct ?? 0, formatPct, {
      duration: 1100,
      delay: 200,
    }),
    maxAbsPct = Math.max(5, ...muscleGroups.map((groupData) => Math.abs(groupData.pct))),
    formatValue = (comparison, amount) =>
      comparison.series.unit === 'wdh'
        ? `${Math.round(amount)} Wdh.`
        : useRelative
          ? `${amount.toFixed(2).replace('.', ',')} × KG`
          : mode === 'volumen'
            ? `${Math.round(amount).toLocaleString('de-DE')} kg`
            : formatKg(amount),
    formatDelta = (comparison) => {
      let sign = comparison.delta > 0 ? '+' : ''
      return comparison.series.unit === 'wdh'
        ? `${sign}${Math.round(comparison.delta)} Wdh.`
        : useRelative
          ? `${sign}${comparison.delta.toFixed(2).replace('.', ',')} × KG`
          : mode === 'volumen'
            ? `${sign}${Math.round(comparison.delta).toLocaleString('de-DE')} kg`
            : `${sign}${formatKg(comparison.delta)}`
    }
  return loading ? (
    <div className="flex justify-center py-16">
      <Spinner size={28} />
    </div>
  ) : (
    <div className="space-y-5">
      <div className="space-y-3 enter">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Zeitraum">
          {RANGES.map((option) => (
            <button
              aria-pressed={rangeKey === option.key}
              onClick={() => setRangeKey(option.key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95',
                rangeKey === option.key
                  ? 'bg-primary border-brand text-white'
                  : 'border-border text-text-secondary hover:border-brand/40',
              )}
              key={option.key}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center" role="group" aria-label="Vergleichswert">
          {[
            ['max', 'Maximalgewicht'],
            ['volumen', 'Volumen'],
          ].map(([modeKey, modeLabel]) => (
            <button
              aria-pressed={mode === modeKey}
              onClick={() => setMode(modeKey)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                mode === modeKey
                  ? 'bg-brand/15 border-brand/50 text-brand'
                  : 'border-border text-text-muted hover:border-brand/40',
              )}
              key={modeKey}
            >
              {modeLabel}
            </button>
          ))}
          <label
            className={cn(
              'flex items-center gap-2 text-xs ml-1 select-none',
              mode === 'max' ? 'text-text-secondary cursor-pointer' : 'text-text-muted opacity-60',
            )}
          >
            <input
              type="checkbox"
              checked={relative && mode === 'max'}
              disabled={mode !== 'max'}
              onChange={(event) => setRelative(event.target.checked)}
            />
            Im Verhältnis zum Körpergewicht
          </label>
          <button
            onClick={() => setShowInfo((prev) => !prev)}
            aria-expanded={showInfo}
            className="ml-auto text-xs text-brand flex items-center gap-1"
          >
            <Info size={13} aria-hidden="true" /> So wird verglichen
          </button>
        </div>
        {showInfo && (
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
      {muscleGroups.length === 0 ? (
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
              trackedCount === 0
                ? 'Trage Trainings mit Gewicht und Wiederholungen ein. Sobald du dieselbe Übung an zwei Tagen gemacht hast, siehst du hier, wie viel stärker du geworden bist.'
                : `Für ${range.text} gibt es noch keine Übung mit zwei Einträgen. Wähle einen längeren Zeitraum oder trainiere dieselbe Übung noch einmal.`
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
                (totalPct ?? 0) >= 0 ? 'text-brand' : 'text-warning',
              )}
            >
              <span ref={totalRef} />
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {(totalPct ?? 0) >= 0 ? 'stärker' : 'weniger'} {range.text} · {muscleGroups.reduce((sum, groupData) => sum + groupData.items.length, 0)} Übungen
              verglichen
            </div>
          </div>
          <div className="space-y-3">
            {muscleGroups.map((groupData, groupIndex) => {
              let isOpen = openGroup === groupData.group
              return (
                <div
                  className="card !p-0 enter overflow-hidden"
                  style={{
                    '--d': 130 + groupIndex * 55,
                  }}
                  key={groupData.group}
                >
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : groupData.group)}
                    aria-expanded={isOpen}
                    className="w-full p-4 sm:p-5 flex items-center gap-4 text-left active:bg-bg-elevated/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-text-primary">{muscleGroupLabel(groupData.group)}</span>
                        <TrendBadge pct={groupData.pct} />
                      </div>
                      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden" aria-hidden="true">
                        <div
                          className={cn('h-full rounded-full grow-x', groupData.pct >= 0 ? 'bg-brand' : 'bg-warning')}
                          style={{
                            width: `${Math.max(4, Math.min(100, (Math.abs(groupData.pct) / maxAbsPct) * 100))}%`,
                            '--d': 220 + groupIndex * 55,
                          }}
                        />
                      </div>
                      <div className="text-xs text-text-muted">
                        {groupData.items.length} {groupData.items.length === 1 ? 'Übung' : 'Übungen'}
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={cn('text-text-muted transition-transform duration-300 shrink-0', isOpen && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <ul className="border-t border-border divide-y divide-border">
                      {groupData.items.map((comparison, comparisonIndex) => {
                        let pointsInRange = comparison.series.points.filter((point) => !sinceDate || point.datum >= sinceDate)
                        return (
                          <li
                            className="p-4 sm:px-5 enter"
                            style={{
                              '--d': comparisonIndex * 45,
                            }}
                            key={comparison.series.key}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text-primary truncate">{comparison.series.name}</div>
                                <div className="text-xs text-text-muted mt-0.5">
                                  {formatValue(comparison, comparison.start)} →{' '}
                                  <span className="text-text-secondary font-semibold">{formatValue(comparison, comparison.end)}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <TrendBadge pct={comparison.pct} />
                                <div className="text-xs text-text-muted mt-0.5">{formatDelta(comparison)}</div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <Sparkline values={pointsInRange.map((point) => (useRelative && point.bw ? point.value / point.bw : point.value))} />
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
