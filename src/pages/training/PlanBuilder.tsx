// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Dumbbell, GripVertical, Plus, Search, Sparkles, Trash2, UserRound, X } from 'lucide-react'
import {
  MUSCLE_GROUPS,
  exerciseImageUrl,
  loadExerciseData,
  muscleGroupLabel,
  normalizeText,
  searchHaystack,
} from '../../lib/exerciseData'
import { loadMyExerciseNames } from '../../lib/exercises'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { cn } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export const g2 = ['Alle', 'Langhantel', 'Kurzhantel', 'Kabel', 'Maschine', 'Körpergewicht']
export const _2 = 60
export function V2_({ ex: e }) {
  let [t, n] = useState(false)
  return (
    <div className="w-12 h-12 rounded-xl bg-bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
      {t ? (
        <Dumbbell size={20} className="text-text-muted" />
      ) : (
        <img
          src={exerciseImageUrl(e)}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => n(true)}
        />
      )}
    </div>
  )
}
export function Y2_({ open: e, onClose: t, group: n, role: r, onPick: i }) {
  let [a, o] = useState(null),
    [s, c] = useState(false),
    [l, u] = useState(''),
    [d, f] = useState(n),
    [p, m] = useState('Alle'),
    [h, g] = useState(true),
    [_, y] = useState(_2),
    { user: authUser } = useAuth(),
    [ownNames, setOwnNames] = useState([])
  ;(useEffect(() => {
    if (!e || !authUser || !a) return
    let alive = true
    loadMyExerciseNames(authUser.id, a).then((names) => alive && setOwnNames(names))
    return () => {
      alive = false
    }
  }, [e, authUser, a]),
    useEffect(() => {
    e && (f(n), u(''), m('Alle'), y(_2))
  }, [e, n]),
    useEffect(() => {
      !e ||
        a ||
        loadExerciseData()
          .then(o)
          .catch(() => c(true))
    }, [e, a]),
    useEffect(() => {
      y(_2)
    }, [l, d, p, h]))
  let b = useMemo(() => (a ? new Map(a.map((e) => [e.id, searchHaystack(e)])) : new Map()), [a]),
    x = useMemo(() => {
      if (!a) return []
      let e = normalizeText(l),
        t = e ? e.split(' ') : []
      return a
        .filter((e) => {
          if ((d !== 'alle' && e.group !== d) || (h && e.stretch) || (p !== 'Alle' && e.equipment_group !== p))
            return false
          if (t.length) {
            let n = b.get(e.id) ?? ''
            return t.every((e) => n.includes(e))
          }
          return true
        })
        .sort((e, t) => {
          let n = +(r === 'grund')
          return (e.compound === n ? 0 : 1) - (t.compound === n ? 0 : 1) || e.name.localeCompare(t.name, 'de')
        })
    }, [a, b, l, d, p, h, r])
  // Eigene Übungen: Namen aus früheren Plänen und Trainings, die nicht im Übungspool stehen (ohne GIF und Anleitung)
  const typed = l.trim()
  const typedKey = normalizeText(typed)
  const ownMatches = ownNames.filter((name) => {
    const words = typedKey.split(' ').filter(Boolean)
    return words.every((w) => normalizeText(name).includes(w))
  })
  const canUseTyped =
    typed.length >= 2 &&
    !ownNames.some((name) => normalizeText(name) === typedKey) &&
    !(a ?? []).some((x) => normalizeText(x.name) === typedKey || normalizeText(x.name_en ?? '') === typedKey)
  const pickOwn = (name) => i({ id: `own:${name}`, name, image: '', own: true })
  return (
    <BottomSheet open={e} onClose={t} title="Übung wählen" tall>
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            className="input pl-9 pr-9"
            placeholder="Übung suchen, z. B. Bankdrücken"
            value={l}
            onChange={(e) => u(e.target.value)}
            aria-label="Übung suchen"
          />
          {l && (
            <button
              onClick={() => u('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              aria-label="Suche leeren"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
          {[
            {
              key: 'alle',
              label: 'Alle',
            },
            ...MUSCLE_GROUPS.filter((e) => e.key !== 'sonstige'),
          ].map((e) => (
            <button
              onClick={() => f(e.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
                d === e.key
                  ? 'bg-primary border-brand text-white'
                  : 'border-border text-text-secondary hover:border-brand/40',
              )}
              key={e.key}
            >
              {e.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
          {g2.map((e) => (
            <button
              onClick={() => m(e)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
                p === e
                  ? 'bg-brand/15 border-brand/50 text-brand'
                  : 'border-border text-text-muted hover:border-brand/40',
              )}
              key={e}
            >
              {e}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={h} onChange={(e) => g(e.target.checked)} />
          Dehnübungen und Mobilisation ausblenden
        </label>
        {(ownMatches.length > 0 || canUseTyped) && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-1">Eigene Übungen</div>
            {ownMatches.map((name) => (
              <button
                key={name}
                onClick={() => pickOwn(name)}
                className="flex items-center gap-3 w-full py-2 px-2 rounded-2xl hover:bg-bg-elevated active:scale-[0.985] transition-all text-left"
              >
                <span className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <UserRound size={20} className="text-brand" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-text-primary truncate">{name}</span>
                  <span className="block text-xs text-text-muted">Eigene Übung</span>
                </span>
              </button>
            ))}
            {canUseTyped && (
              <button
                onClick={() => pickOwn(typed)}
                className="flex items-center gap-3 w-full py-2 px-2 rounded-2xl border-2 border-dashed border-brand/40 hover:bg-brand/5 active:scale-[0.985] transition-all text-left"
              >
                <span className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <Plus size={20} className="text-brand" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-text-primary truncate">„{typed}“ als eigene Übung</span>
                  <span className="block text-xs text-text-muted">Ohne GIF und Anleitung. Wird mit dem Plan gespeichert.</span>
                </span>
              </button>
            )}
          </div>
        )}
        {s ? (
          <div className="card text-sm text-text-secondary">Der Übungspool konnte nicht geladen werden.</div>
        ) : a ? (
          x.length === 0 ? (
            <div className="card text-sm text-text-secondary text-center">
              Keine passende Übung gefunden. Lockere die Filter.
            </div>
          ) : (
            <ul className="space-y-0.5 pb-4">
              {x.slice(0, _).map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => i(e)}
                    className="flex items-center gap-3 w-full py-2 px-2 rounded-2xl hover:bg-bg-elevated active:scale-[0.985] transition-all text-left"
                  >
                    <V2_ ex={e} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-text-primary truncate">{e.name}</span>
                      <span className="block text-xs text-text-muted truncate">
                        {e.equipment_de} · {e.target_de}
                      </span>
                    </span>
                    {e.compound === 1 && <span className="badge bg-brand/10 text-brand shrink-0">Grundübung</span>}
                  </button>
                </li>
              ))}
              {x.length > _ && (
                <li>
                  <button onClick={() => y((e) => e + _2)} className="btn-secondary w-full mt-2 text-sm">
                    Mehr anzeigen ({x.length - _} weitere)
                  </button>
                </li>
              )}
            </ul>
          )
        ) : (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
export const b2 = (e) => ({
  group: e,
  role: 'grund',
})
export const Q = (e) => ({
  group: e,
  role: 'iso',
})
export function x2(e, t) {
  return t === 'bauch' || t === 'waden' || t === 'unterarme'
    ? {
        sets: 3,
        reps: '12-15',
      }
    : e === 'grund'
      ? {
          sets: 4,
          reps: '6-8',
        }
      : {
          sets: 3,
          reps: '10-15',
        }
}
export const S2 = {
  grund: 'Grundübung',
  iso: 'Isolation',
}
export const C2 = (e, t, n) => ({
  name: e,
  slots: [b2('quadrizeps'), b2(t), b2(n), b2('schultern'), Q('beinbeuger'), Q('bizeps'), Q('trizeps'), Q('bauch')],
})
export const w2 = {
  name: 'Push',
  slots: [b2('brust'), b2('brust'), b2('schultern'), Q('brust'), Q('schultern'), Q('trizeps'), Q('trizeps')],
}
export const T2 = {
  name: 'Pull',
  slots: [b2('ruecken'), b2('ruecken'), Q('ruecken'), Q('schultern'), Q('trapez'), Q('bizeps'), Q('bizeps')],
}
export const E2 = {
  name: 'Legs',
  slots: [b2('quadrizeps'), b2('quadrizeps'), b2('beinbeuger'), b2('gesaess'), Q('beinbeuger'), Q('waden'), Q('bauch')],
}
export const D2 = (e) => ({
  name: e,
  slots: [b2('brust'), b2('ruecken'), b2('schultern'), Q('ruecken'), Q('brust'), Q('bizeps'), Q('trizeps')],
})
export const O2 = (e) => ({
  name: e,
  slots: [b2('quadrizeps'), b2('beinbeuger'), b2('gesaess'), Q('quadrizeps'), Q('waden'), Q('bauch')],
})
export const k2 = [
  {
    id: 'ganzkoerper',
    name: 'Ganzkörper',
    tagline: '3 Tage · jeder Muskel mehrmals pro Woche',
    description: 'Ideal für den Einstieg und wenig Zeit: Pro Tag der ganze Körper, dazwischen Pausentage.',
    days: [
      C2('Ganzkörper A', 'brust', 'ruecken'),
      C2('Ganzkörper B', 'brust', 'ruecken'),
      C2('Ganzkörper C', 'brust', 'ruecken'),
    ],
  },
  {
    id: 'ober-unter',
    name: 'Ober- / Unterkörper',
    tagline: '4 Tage · Oberkörper und Beine im Wechsel',
    description: 'Jede Muskelgruppe zweimal pro Woche mit genug Erholung. Klassiker für Muskelaufbau.',
    days: [D2('Oberkörper A'), O2('Unterkörper A'), D2('Oberkörper B'), O2('Unterkörper B')],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    tagline: '3 Tage · Drücken, Ziehen, Beine',
    description: 'Der 3er-Split: Push (Brust, Schultern, Trizeps), Pull (Rücken, Bizeps), Legs (Beine, Bauch).',
    days: [w2, T2, E2],
  },
  {
    id: 'ppl6',
    name: 'Push / Pull / Legs (6 Tage)',
    tagline: '6 Tage · jede Gruppe zweimal pro Woche',
    description: 'Der 3er-Split doppelt: Push, Pull, Legs, dann noch einmal mit anderen Übungen.',
    days: [
      {
        ...w2,
        name: 'Push A',
      },
      {
        ...T2,
        name: 'Pull A',
      },
      {
        ...E2,
        name: 'Legs A',
      },
      {
        ...w2,
        name: 'Push B',
      },
      {
        ...T2,
        name: 'Pull B',
      },
      {
        ...E2,
        name: 'Legs B',
      },
    ],
  },
  {
    id: 'torso-legs',
    name: 'Torso / Legs',
    tagline: '4 Tage · Oberkörper-Rumpf und Beine',
    description: 'Torso (Brust, Rücken, Schultern, Arme) und Legs im Wechsel, mit Bauch am Beintag.',
    days: [
      D2('Torso A'),
      {
        ...E2,
        name: 'Legs A',
      },
      D2('Torso B'),
      {
        ...E2,
        name: 'Legs B',
      },
    ],
  },
  {
    id: 'bro',
    name: 'Klassischer 5er-Split',
    tagline: '5 Tage · ein Muskel pro Tag',
    description: 'Brust, Rücken, Schultern, Arme und Beine: viel Umfang pro Muskelgruppe, einmal pro Woche.',
    days: [
      {
        name: 'Brust',
        slots: [b2('brust'), b2('brust'), b2('brust'), Q('brust'), Q('brust'), Q('bauch')],
      },
      {
        name: 'Rücken',
        slots: [b2('ruecken'), b2('ruecken'), b2('ruecken'), Q('ruecken'), Q('trapez'), Q('unterer_ruecken')],
      },
      {
        name: 'Schultern',
        slots: [b2('schultern'), b2('schultern'), Q('schultern'), Q('schultern'), Q('trapez'), Q('bauch')],
      },
      {
        name: 'Arme',
        slots: [b2('trizeps'), b2('bizeps'), Q('trizeps'), Q('bizeps'), Q('trizeps'), Q('bizeps'), Q('unterarme')],
      },
      {
        name: 'Beine',
        slots: [
          b2('quadrizeps'),
          b2('quadrizeps'),
          b2('beinbeuger'),
          b2('gesaess'),
          Q('beinbeuger'),
          Q('waden'),
          Q('waden'),
        ],
      },
    ],
  },
  {
    id: 'arnold',
    name: 'Arnold-Split',
    tagline: '3 Tage · Brust + Rücken, Schultern + Arme, Beine',
    description: 'Gegenspieler zusammen trainieren: Brust und Rücken, Schultern und Arme, dann Beine.',
    days: [
      {
        name: 'Brust & Rücken',
        slots: [b2('brust'), b2('ruecken'), b2('brust'), b2('ruecken'), Q('brust'), Q('ruecken'), Q('bauch')],
      },
      {
        name: 'Schultern & Arme',
        slots: [b2('schultern'), b2('schultern'), Q('schultern'), Q('bizeps'), Q('trizeps'), Q('bizeps'), Q('trizeps')],
      },
      {
        name: 'Beine',
        slots: [
          b2('quadrizeps'),
          b2('quadrizeps'),
          b2('beinbeuger'),
          b2('gesaess'),
          Q('waden'),
          Q('waden'),
          Q('bauch'),
        ],
      },
    ],
  },
  {
    id: 'frei',
    name: 'Freier Split',
    tagline: 'Leer · Tage und Muskelgruppen selbst festlegen',
    description: 'Du startest mit einem leeren Tag und fügst Tage und Muskelgruppen nach Wunsch hinzu.',
    days: [
      {
        name: 'Tag 1',
        slots: [],
      },
    ],
  },
]
export function A2(e) {
  return {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  }[Math.min(Math.max(e, 1), 7)]
}
export const j2 = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export let M2 = 0
export const N2 = () => `p${Date.now().toString(36)}${(M2++).toString(36)}`
export function P2(e, t) {
  let n = x2(t, e)
  return {
    id: N2(),
    group: e,
    role: t,
    sets: String(n.sets),
    reps: n.reps,
  }
}
export function F2(e) {
  let t = A2(e.days.length)
  return e.days.map((e, n) => ({
    id: N2(),
    name: e.name,
    weekdays: [t[n]],
    slots: e.slots.map((e) => P2(e.group, e.role)),
  }))
}
export function I2({ id: e, children: t }) {
  let {
      attributes: n,
      listeners: r,
      setNodeRef: i,
      setActivatorNodeRef: a,
      transform: o,
      transition: s,
      isDragging: c,
    } = useSortable({
      id: e,
    }),
    l = (
      <button
        ref={a}
        {...n}
        {...r}
        className="p-1.5 -ml-1 rounded-lg text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Zum Verschieben ziehen"
      >
        <GripVertical size={18} />
      </button>
    )
  return (
    <div
      ref={i}
      style={{
        transform: CSS.Transform.toString(o),
        transition: s,
        zIndex: c ? 20 : undefined,
        position: 'relative',
      }}
      className={cn(c && 'opacity-90 shadow-glow rounded-3xl')}
    >
      {t({
        handle: l,
        dragging: c,
      })}
    </div>
  )
}
export function L2() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
}
export function R2({ slot: e, handle: t, onPick: n, onChange: r, onRemove: i }) {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        {t}
        <span className="badge bg-brand/10 text-brand">{muscleGroupLabel(e.group)}</span>
        <button
          onClick={() =>
            r({
              role: e.role === 'grund' ? 'iso' : 'grund',
              ...x2(e.role === 'grund' ? 'iso' : 'grund', e.group),
              sets: String(x2(e.role === 'grund' ? 'iso' : 'grund', e.group).sets),
            })
          }
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
          title="Rolle wechseln"
        >
          {S2[e.role]}
        </button>
        <button
          onClick={i}
          className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Platz entfernen"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <button
        onClick={n}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl text-left transition-all active:scale-[0.985]',
          e.ex
            ? 'bg-bg-card border border-border p-2'
            : 'border-2 border-dashed border-brand/40 text-brand p-3 justify-center hover:bg-brand/5',
        )}
      >
        {e.ex ? (
          <>
            <span className="w-11 h-11 rounded-lg bg-bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
              {e.ex.own ? (
                <UserRound size={20} className="text-brand" aria-hidden="true" />
              ) : (
              <img
                src={exerciseImageUrl({
                  image: e.ex.image,
                })}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.visibility = 'hidden'
                }}
              />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-text-primary truncate">{e.ex.name}</span>
              <span className="block text-xs text-text-muted">{e.ex.own ? 'Eigene Übung · antippen zum Tauschen' : 'Antippen zum Tauschen'}</span>
            </span>
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Plus size={16} /> Übung für {muscleGroupLabel(e.group)} wählen
          </span>
        )}
      </button>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          inputMode="numeric"
          aria-label="Sätze"
          className="input !w-14 !px-2 !py-1.5 text-center text-sm font-semibold"
          value={e.sets}
          onChange={(e) =>
            r({
              sets: e.target.value.replace(/\D/g, '').slice(0, 2),
            })
          }
        />
        <span>Sätze ×</span>
        <input
          aria-label="Wiederholungen"
          className="input !w-20 !px-2 !py-1.5 text-center text-sm font-semibold"
          value={e.reps}
          onChange={(e) =>
            r({
              reps: e.target.value.replace(/[^0-9-–]/g, '').slice(0, 7),
            })
          }
        />
        <span>Wdh.</span>
      </div>
    </div>
  )
}
export function Z2_({ day: e, index: t, handle: n, onChange: r, onRemove: i, onPickSlot: a }) {
  let o = L2(),
    [s, c] = useState(false),
    l = e.slots.filter((e) => e.ex).length
  function u(t) {
    if (!t.over || t.active.id === t.over.id) return
    let n = e.slots.findIndex((e) => e.id === t.active.id),
      i = e.slots.findIndex((e) => e.id === t.over.id)
    r({
      slots: arrayMove(e.slots, n, i),
    })
  }
  let d = (t, n) =>
    r({
      slots: e.slots.map((e) =>
        e.id === t
          ? {
              ...e,
              ...n,
            }
          : e,
      ),
    })
  return (
    <div
      className="card enter space-y-3"
      style={{
        '--d': 80 + t * 70,
      }}
    >
      <div className="flex items-center gap-2">
        {n}
        <input
          className="flex-1 min-w-0 bg-transparent text-lg font-bold text-text-primary tracking-tight outline-none focus:ring-1 focus:ring-brand rounded-lg px-1"
          value={e.name}
          onChange={(e) =>
            r({
              name: e.target.value,
            })
          }
          aria-label="Name des Trainingstags"
        />
        <span className="text-xs text-text-muted whitespace-nowrap">
          {l}/{e.slots.length}
        </span>
        <button
          onClick={i}
          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Tag entfernen"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Wochentage">
        {j2.map((t, n) => {
          let i = e.weekdays.includes(n + 1)
          return (
            <button
              aria-pressed={i}
              onClick={() =>
                r({
                  weekdays: i ? e.weekdays.filter((e) => e !== n + 1) : [...e.weekdays, n + 1].sort(),
                })
              }
              className={cn(
                'w-9 h-8 rounded-full text-xs font-bold border transition-all active:scale-90',
                i ? 'bg-primary border-brand text-white' : 'border-border text-text-muted hover:border-brand/40',
              )}
              key={t}
            >
              {t}
            </button>
          )
        })}
      </div>
      <DndContext sensors={o} collisionDetection={closestCenter} onDragEnd={u}>
        <SortableContext items={e.slots.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {e.slots.map((t) => (
              <I2 id={t.id} key={t.id}>
                {({ handle: n }) => (
                  <R2
                    slot={t}
                    handle={n}
                    onPick={() => a(t.id)}
                    onChange={(e) => d(t.id, e)}
                    onRemove={() =>
                      r({
                        slots: e.slots.filter((e) => e.id !== t.id),
                      })
                    }
                  />
                )}
              </I2>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={() => c(true)} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
        <Plus size={15} /> Muskelgruppe hinzufügen
      </button>
      <BottomSheet open={s} onClose={() => c(false)} title="Muskelgruppe hinzufügen">
        <div className="grid grid-cols-2 gap-2 pb-3">
          {MUSCLE_GROUPS.filter((e) => e.key !== 'sonstige').map((t) => (
            <button
              onClick={() => {
                ;(r({
                  slots: [...e.slots, P2(t.key, 'iso')],
                }),
                  c(false))
              }}
              className="rounded-2xl bg-bg-elevated border border-border px-3 py-3 text-sm font-semibold text-text-primary hover:border-brand/50 active:scale-95 transition-all text-left"
              key={t.key}
            >
              {t.label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
export function PlanBuilder({ onSaved: e }) {
  let { user: t } = useAuth(),
    n = L2(),
    [r, i] = useState(null),
    [a, o] = useState(''),
    [s, c] = useState([]),
    [l, u] = useState(null),
    [d, f] = useState(false),
    [p, m] = useState(false),
    [h, g] = useState(''),
    _ = useMemo(
      () => (l ? (s.find((e) => e.id === l.dayId)?.slots.find((e) => e.id === l.slotId) ?? null) : null),
      [l, s],
    ),
    y = s.reduce((e, t) => e + t.slots.length, 0),
    b = s.reduce((e, t) => e + t.slots.filter((e) => e.ex).length, 0)
  function x(e) {
    ;(i(e), o(e.id === 'frei' ? 'Mein Plan' : e.name), c(F2(e)), g(''))
  }
  let S = (e, t) =>
    c((n) =>
      n.map((n) =>
        n.id === e
          ? {
              ...n,
              ...t,
            }
          : n,
      ),
    )
  function C(e) {
    !e.over ||
      e.active.id === e.over.id ||
      c((t) =>
        arrayMove(
          t,
          t.findIndex((t) => t.id === e.active.id),
          t.findIndex((t) => t.id === e.over.id),
        ),
      )
  }
  function w(e) {
    l &&
      (S(l.dayId, {
        slots: s
          .find((e) => e.id === l.dayId)
          .slots.map((t) =>
            t.id === l.slotId
              ? {
                  ...t,
                  ex: {
                    id: e.id,
                    name: e.name,
                    image: e.image,
                    own: !!e.own,
                  },
                }
              : t,
          ),
      }),
      u(null))
  }
  async function T() {
    m(true)
    try {
      let e = await loadExerciseData(),
        t = new Set(s.flatMap((e) => e.slots.map((e) => e.ex?.id)).filter(Boolean)),
        n = (e) =>
          ({
            Langhantel: 0,
            Kurzhantel: 1,
            Maschine: 2,
            Kabel: 3,
            Körpergewicht: 4,
          })[e.equipment_group] ?? 5
      c((r) =>
        r.map((r) => ({
          ...r,
          slots: r.slots.map((r) => {
            if (r.ex) return r
            let i = e
              .filter(
                (e) =>
                  e.group === r.group && !e.stretch && !t.has(e.id) && !/\(.*(pov|male|female).*\)/i.test(e.name_en),
              )
              .sort((e, t) => {
                let i = +(r.role === 'grund')
                return (
                  (e.compound === i ? 0 : 1) - (t.compound === i ? 0 : 1) ||
                  n(e) - n(t) ||
                  e.name.length - t.name.length
                )
              })[0]
            return i
              ? (t.add(i.id),
                {
                  ...r,
                  ex: {
                    id: i.id,
                    name: i.name,
                    image: i.image,
                  },
                })
              : r
          }),
        })),
      )
    } finally {
      m(false)
    }
  }
  async function E() {
    if (!t) return
    let n = s
      .map((e) => ({
        ...e,
        slots: e.slots.filter((e) => e.ex),
      }))
      .filter((e) => e.slots.length)
    if (!n.length) {
      g('Wähle mindestens eine Übung aus.')
      return
    }
    ;(f(true), g(''))
    try {
      for (let e = 0; e < n.length; e++) {
        let i = n[e],
          { data: o, error: s } = await V2(
            'training_vorlagen',
            {
              user_id: t.id,
              name: `${a.trim() || 'Mein Plan'} · ${i.name}`,
              trainingstyp: 'Kraft',
              wochentage: i.weekdays.join(',') || null,
              plan_name: a.trim() || 'Mein Plan',
              plan_split: r?.id ?? null,
              plan_reihenfolge: e,
            },
            ['plan_name', 'plan_split', 'plan_reihenfolge'],
          )
        if (s || !o) throw Error(s?.message ?? 'Speichern fehlgeschlagen')
        let { error: c } = await V2(
          'vorlagen_uebungen',
          i.slots.map((e, t) => ({
            vorlage_id: o.id,
            uebungsname: e.ex.name,
            saetze: parseInt(e.sets) || null,
            wdh: parseInt(e.reps) || null,
            wdh_text: e.reps || null,
            gruppe: e.group,
            rolle: e.role,
            reihenfolge: t,
          })),
          ['wdh_text', 'gruppe', 'rolle'],
        )
        if (c) throw Error(c.message)
      }
      e()
    } catch (e) {
      g(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    } finally {
      f(false)
    }
  }
  return r ? (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3 enter">
        <button
          onClick={() => i(null)}
          className="p-2 rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Zurück zur Split-Auswahl"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wide" htmlFor="plan-name">
            Name des Plans
          </label>
          <input
            id="plan-name"
            className="input mt-1"
            value={a}
            onChange={(e) => o(e.target.value)}
            placeholder="z. B. Mein 3er-Split"
          />
        </div>
      </div>
      <div
        className="flex items-center gap-2 flex-wrap enter"
        style={{
          '--d': 40,
        }}
      >
        <span className="text-sm text-text-secondary">
          {r.name} · {b} von {y} Übungen gewählt
        </span>
        <button onClick={T} disabled={p} className="btn-secondary text-sm !px-4 !py-2 ml-auto flex items-center gap-2">
          {p ? <Spinner size={14} /> : <Sparkles size={14} />} Leere Plätze vorschlagen
        </button>
      </div>
      <DndContext sensors={n} collisionDetection={closestCenter} onDragEnd={C}>
        <SortableContext items={s.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {s.map((e, t) => (
              <I2 id={e.id} key={e.id}>
                {({ handle: n }) => (
                  <Z2_
                    day={e}
                    index={t}
                    handle={n}
                    onChange={(t) => S(e.id, t)}
                    onRemove={() => c((t) => t.filter((t) => t.id !== e.id))}
                    onPickSlot={(t) =>
                      u({
                        dayId: e.id,
                        slotId: t,
                      })
                    }
                  />
                )}
              </I2>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={() =>
          c((e) => [
            ...e,
            {
              id: N2(),
              name: `Tag ${e.length + 1}`,
              weekdays: [],
              slots: [],
            },
          ])
        }
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Trainingstag hinzufügen
      </button>
      {h && (
        <div className="text-sm text-danger" role="alert">
          {h}
        </div>
      )}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)_-_2.5rem)] lg:bottom-4 z-10">
        <button
          onClick={E}
          disabled={d || b === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 shadow-glow disabled:opacity-50"
        >
          {d ? <Spinner size={16} /> : <Check size={18} />}Plan speichern (
          {s.filter((e) => e.slots.some((e) => e.ex)).length} Vorlagen)
        </button>
      </div>
      <Y2_ open={!!l} onClose={() => u(null)} group={_?.group ?? 'brust'} role={_?.role ?? 'grund'} onPick={w} />
      {y === 0 && (
        <div className="card text-center text-sm text-text-secondary">
          <Dumbbell size={28} className="mx-auto mb-2 text-text-muted" />
          Noch keine Muskelgruppen. Tippe auf „Muskelgruppe hinzufügen“.
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      <div className="enter">
        <h2 className="section-title">Eigenen Plan bauen</h2>
        <p className="text-sm text-text-secondary mt-1">
          Wähle einen Split. Die Vorlage legt Tage und Muskelgruppen fest, die Übungen suchst du dir selbst aus dem Pool
          aus.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {k2.map((e, t) => (
          <button
            onClick={() => x(e)}
            className="card enter text-left space-y-2 hover:border-brand/50 active:scale-[0.985] transition-all"
            style={{
              '--d': 60 + t * 55,
            }}
            key={e.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-text-primary">{e.name}</div>
                <div className="text-xs text-brand font-semibold mt-0.5">{e.tagline}</div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0 mt-1" />
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{e.description}</p>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {e.days.map((e, t) => (
                <span className="badge bg-bg-elevated text-text-secondary border border-border" key={t}>
                  {e.name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
export async function V2(e, t, n) {
  let r = async (t) => {
      if (Array.isArray(t)) {
        let { error: n } = await supabase.from(e).insert(t)
        return {
          data: null,
          error: n,
        }
      }
      let { data: n, error: r } = await supabase.from(e).insert(t).select('id').single()
      return {
        data: n,
        error: r,
      }
    },
    i = await r(t)
  if (!i.error || !/column|schema cache|PGRST204|42703/i.test(`${i.error.message} ${i.error.code ?? ''}`)) return i
  let a = (e) => Object.fromEntries(Object.entries(e).filter(([e]) => !n.includes(e)))
  return r(Array.isArray(t) ? t.map(a) : a(t))
}
