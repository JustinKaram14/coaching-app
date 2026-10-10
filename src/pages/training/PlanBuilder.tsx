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

export const EQUIPMENT_FILTERS = ['Alle', 'Langhantel', 'Kurzhantel', 'Kabel', 'Maschine', 'Körpergewicht']
export const PAGE_SIZE = 60
export function ExerciseThumb({ ex: exercise }) {
  let [imageFailed, setImageFailed] = useState(false)
  return (
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
  )
}
export function ExercisePicker({ open: isOpen, onClose: handleClose, group: initialGroup, role: slotRole, onPick: onChoose }) {
  let [pool, setPool] = useState(null),
    [loadFailed, setLoadFailed] = useState(false),
    [query, setQuery] = useState(''),
    [groupFilter, setGroupFilter] = useState(initialGroup),
    [equipmentFilter, setEquipmentFilter] = useState('Alle'),
    [hideStretch, setHideStretch] = useState(true),
    [visibleCount, setVisibleCount] = useState(PAGE_SIZE),
    { user: authUser } = useAuth(),
    [ownNames, setOwnNames] = useState([])
  ;(useEffect(() => {
    if (!isOpen || !authUser || !pool) return
    let alive = true
    loadMyExerciseNames(authUser.id, pool).then((names) => alive && setOwnNames(names))
    return () => {
      alive = false
    }
  }, [isOpen, authUser, pool]),
    useEffect(() => {
    isOpen && (setGroupFilter(initialGroup), setQuery(''), setEquipmentFilter('Alle'), setVisibleCount(PAGE_SIZE))
  }, [isOpen, initialGroup]),
    useEffect(() => {
      !isOpen ||
        pool ||
        loadExerciseData()
          .then(setPool)
          .catch(() => setLoadFailed(true))
    }, [isOpen, pool]),
    useEffect(() => {
      setVisibleCount(PAGE_SIZE)
    }, [query, groupFilter, equipmentFilter, hideStretch]))
  let haystacks = useMemo(() => (pool ? new Map(pool.map((poolItem) => [poolItem.id, searchHaystack(poolItem)])) : new Map()), [pool]),
    results = useMemo(() => {
      if (!pool) return []
      let normalized = normalizeText(query),
        queryWords = normalized ? normalized.split(' ') : []
      return pool
        .filter((poolEntry) => {
          if ((groupFilter !== 'alle' && poolEntry.group !== groupFilter) || (hideStretch && poolEntry.stretch) || (equipmentFilter !== 'Alle' && poolEntry.equipment_group !== equipmentFilter))
            return false
          if (queryWords.length) {
            let haystack = haystacks.get(poolEntry.id) ?? ''
            return queryWords.every((queryWord) => haystack.includes(queryWord))
          }
          return true
        })
        .sort((exerciseA, exerciseB) => {
          let preferCompound = +(slotRole === 'grund')
          return (exerciseA.compound === preferCompound ? 0 : 1) - (exerciseB.compound === preferCompound ? 0 : 1) || exerciseA.name.localeCompare(exerciseB.name, 'de')
        })
    }, [pool, haystacks, query, groupFilter, equipmentFilter, hideStretch, slotRole])
  // Eigene Übungen: Namen aus früheren Plänen und Trainings, die nicht im Übungspool stehen (ohne GIF und Anleitung)
  const typed = query.trim()
  const typedKey = normalizeText(typed)
  const ownMatches = ownNames.filter((name) => {
    const words = typedKey.split(' ').filter(Boolean)
    return words.every((queryWord) => normalizeText(name).includes(queryWord))
  })
  const canUseTyped =
    typed.length >= 2 &&
    !ownNames.some((name) => normalizeText(name) === typedKey) &&
    !(pool ?? []).some((poolExercise) => normalizeText(poolExercise.name) === typedKey || normalizeText(poolExercise.name_en ?? '') === typedKey)
  const pickOwn = (name) => onChoose({ id: `own:${name}`, name, image: '', own: true })
  return (
    <BottomSheet open={isOpen} onClose={handleClose} title="Übung wählen" tall>
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            className="input pl-9 pr-9"
            placeholder="Übung suchen, z. B. Bankdrücken"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Übung suchen"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
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
            ...MUSCLE_GROUPS.filter((muscle) => muscle.key !== 'sonstige'),
          ].map((muscle) => (
            <button
              onClick={() => setGroupFilter(muscle.key)}
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
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
          {EQUIPMENT_FILTERS.map((equipment) => (
            <button
              onClick={() => setEquipmentFilter(equipment)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-all active:scale-95',
                equipmentFilter === equipment
                  ? 'bg-brand/15 border-brand/50 text-brand'
                  : 'border-border text-text-muted hover:border-brand/40',
              )}
              key={equipment}
            >
              {equipment}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={hideStretch} onChange={(event) => setHideStretch(event.target.checked)} />
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
        {loadFailed ? (
          <div className="card text-sm text-text-secondary">Der Übungspool konnte nicht geladen werden.</div>
        ) : pool ? (
          results.length === 0 ? (
            <div className="card text-sm text-text-secondary text-center">
              Keine passende Übung gefunden. Lockere die Filter.
            </div>
          ) : (
            <ul className="space-y-0.5 pb-4">
              {results.slice(0, visibleCount).map((exercise) => (
                <li key={exercise.id}>
                  <button
                    onClick={() => onChoose(exercise)}
                    className="flex items-center gap-3 w-full py-2 px-2 rounded-2xl hover:bg-bg-elevated active:scale-[0.985] transition-all text-left"
                  >
                    <ExerciseThumb ex={exercise} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-text-primary truncate">{exercise.name}</span>
                      <span className="block text-xs text-text-muted truncate">
                        {exercise.equipment_de} · {exercise.target_de}
                      </span>
                    </span>
                    {exercise.compound === 1 && <span className="badge bg-brand/10 text-brand shrink-0">Grundübung</span>}
                  </button>
                </li>
              ))}
              {results.length > visibleCount && (
                <li>
                  <button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="btn-secondary w-full mt-2 text-sm">
                    Mehr anzeigen ({results.length - visibleCount} weitere)
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
export const compoundSlot = (groupKey) => ({
  group: groupKey,
  role: 'grund',
})
export const isolationSlot = (groupKey) => ({
  group: groupKey,
  role: 'iso',
})
export function defaultVolume(roleKey, groupKey) {
  return groupKey === 'bauch' || groupKey === 'waden' || groupKey === 'unterarme'
    ? {
        sets: 3,
        reps: '12-15',
      }
    : roleKey === 'grund'
      ? {
          sets: 4,
          reps: '6-8',
        }
      : {
          sets: 3,
          reps: '10-15',
        }
}
export const ROLE_LABELS = {
  grund: 'Grundübung',
  iso: 'Isolation',
}
export const fullBodyDay = (dayName, pushGroup, pullGroup) => ({
  name: dayName,
  slots: [compoundSlot('quadrizeps'), compoundSlot(pushGroup), compoundSlot(pullGroup), compoundSlot('schultern'), isolationSlot('beinbeuger'), isolationSlot('bizeps'), isolationSlot('trizeps'), isolationSlot('bauch')],
})
export const PUSH_DAY = {
  name: 'Push',
  slots: [compoundSlot('brust'), compoundSlot('brust'), compoundSlot('schultern'), isolationSlot('brust'), isolationSlot('schultern'), isolationSlot('trizeps'), isolationSlot('trizeps')],
}
export const PULL_DAY = {
  name: 'Pull',
  slots: [compoundSlot('ruecken'), compoundSlot('ruecken'), isolationSlot('ruecken'), isolationSlot('schultern'), isolationSlot('trapez'), isolationSlot('bizeps'), isolationSlot('bizeps')],
}
export const LEGS_DAY = {
  name: 'Legs',
  slots: [compoundSlot('quadrizeps'), compoundSlot('quadrizeps'), compoundSlot('beinbeuger'), compoundSlot('gesaess'), isolationSlot('beinbeuger'), isolationSlot('waden'), isolationSlot('bauch')],
}
export const upperDay = (dayName) => ({
  name: dayName,
  slots: [compoundSlot('brust'), compoundSlot('ruecken'), compoundSlot('schultern'), isolationSlot('ruecken'), isolationSlot('brust'), isolationSlot('bizeps'), isolationSlot('trizeps')],
})
export const lowerDay = (dayName) => ({
  name: dayName,
  slots: [compoundSlot('quadrizeps'), compoundSlot('beinbeuger'), compoundSlot('gesaess'), isolationSlot('quadrizeps'), isolationSlot('waden'), isolationSlot('bauch')],
})
export const SPLITS = [
  {
    id: 'ganzkoerper',
    name: 'Ganzkörper',
    tagline: '3 Tage · jeder Muskel mehrmals pro Woche',
    description: 'Ideal für den Einstieg und wenig Zeit: Pro Tag der ganze Körper, dazwischen Pausentage.',
    days: [
      fullBodyDay('Ganzkörper A', 'brust', 'ruecken'),
      fullBodyDay('Ganzkörper B', 'brust', 'ruecken'),
      fullBodyDay('Ganzkörper C', 'brust', 'ruecken'),
    ],
  },
  {
    id: 'ober-unter',
    name: 'Ober- / Unterkörper',
    tagline: '4 Tage · Oberkörper und Beine im Wechsel',
    description: 'Jede Muskelgruppe zweimal pro Woche mit genug Erholung. Klassiker für Muskelaufbau.',
    days: [upperDay('Oberkörper A'), lowerDay('Unterkörper A'), upperDay('Oberkörper B'), lowerDay('Unterkörper B')],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    tagline: '3 Tage · Drücken, Ziehen, Beine',
    description: 'Der 3er-Split: Push (Brust, Schultern, Trizeps), Pull (Rücken, Bizeps), Legs (Beine, Bauch).',
    days: [PUSH_DAY, PULL_DAY, LEGS_DAY],
  },
  {
    id: 'ppl6',
    name: 'Push / Pull / Legs (6 Tage)',
    tagline: '6 Tage · jede Gruppe zweimal pro Woche',
    description: 'Der 3er-Split doppelt: Push, Pull, Legs, dann noch einmal mit anderen Übungen.',
    days: [
      {
        ...PUSH_DAY,
        name: 'Push A',
      },
      {
        ...PULL_DAY,
        name: 'Pull A',
      },
      {
        ...LEGS_DAY,
        name: 'Legs A',
      },
      {
        ...PUSH_DAY,
        name: 'Push B',
      },
      {
        ...PULL_DAY,
        name: 'Pull B',
      },
      {
        ...LEGS_DAY,
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
      upperDay('Torso A'),
      {
        ...LEGS_DAY,
        name: 'Legs A',
      },
      upperDay('Torso B'),
      {
        ...LEGS_DAY,
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
        slots: [compoundSlot('brust'), compoundSlot('brust'), compoundSlot('brust'), isolationSlot('brust'), isolationSlot('brust'), isolationSlot('bauch')],
      },
      {
        name: 'Rücken',
        slots: [compoundSlot('ruecken'), compoundSlot('ruecken'), compoundSlot('ruecken'), isolationSlot('ruecken'), isolationSlot('trapez'), isolationSlot('unterer_ruecken')],
      },
      {
        name: 'Schultern',
        slots: [compoundSlot('schultern'), compoundSlot('schultern'), isolationSlot('schultern'), isolationSlot('schultern'), isolationSlot('trapez'), isolationSlot('bauch')],
      },
      {
        name: 'Arme',
        slots: [compoundSlot('trizeps'), compoundSlot('bizeps'), isolationSlot('trizeps'), isolationSlot('bizeps'), isolationSlot('trizeps'), isolationSlot('bizeps'), isolationSlot('unterarme')],
      },
      {
        name: 'Beine',
        slots: [
          compoundSlot('quadrizeps'),
          compoundSlot('quadrizeps'),
          compoundSlot('beinbeuger'),
          compoundSlot('gesaess'),
          isolationSlot('beinbeuger'),
          isolationSlot('waden'),
          isolationSlot('waden'),
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
        slots: [compoundSlot('brust'), compoundSlot('ruecken'), compoundSlot('brust'), compoundSlot('ruecken'), isolationSlot('brust'), isolationSlot('ruecken'), isolationSlot('bauch')],
      },
      {
        name: 'Schultern & Arme',
        slots: [compoundSlot('schultern'), compoundSlot('schultern'), isolationSlot('schultern'), isolationSlot('bizeps'), isolationSlot('trizeps'), isolationSlot('bizeps'), isolationSlot('trizeps')],
      },
      {
        name: 'Beine',
        slots: [
          compoundSlot('quadrizeps'),
          compoundSlot('quadrizeps'),
          compoundSlot('beinbeuger'),
          compoundSlot('gesaess'),
          isolationSlot('waden'),
          isolationSlot('waden'),
          isolationSlot('bauch'),
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
export function trainingWeekdays(dayCount) {
  return {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  }[Math.min(Math.max(dayCount, 1), 7)]
}
export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export let slotCounter = 0
export const newId = () => `p${Date.now().toString(36)}${(slotCounter++).toString(36)}`
export function newSlot(groupKey, roleKey) {
  let volume = defaultVolume(roleKey, groupKey)
  return {
    id: newId(),
    group: groupKey,
    role: roleKey,
    sets: String(volume.sets),
    reps: volume.reps,
  }
}
export function daysFromSplit(splitData) {
  let weekdayPlan = trainingWeekdays(splitData.days.length)
  return splitData.days.map((splitDay, dayIndex) => ({
    id: newId(),
    name: splitDay.name,
    weekdays: [weekdayPlan[dayIndex]],
    slots: splitDay.slots.map((slotItem) => newSlot(slotItem.group, slotItem.role)),
  }))
}
export function SortableItem({ id: itemId, children: renderChild }) {
  let {
      attributes: dragAttributes,
      listeners: dragListeners,
      setNodeRef: setRef,
      setActivatorNodeRef: setHandleRef,
      transform: dragTransform,
      transition: dragTransition,
      isDragging: beingDragged,
    } = useSortable({
      id: itemId,
    }),
    handleButton = (
      <button
        ref={setHandleRef}
        {...dragAttributes}
        {...dragListeners}
        className="p-1.5 -ml-1 rounded-lg text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Zum Verschieben ziehen"
      >
        <GripVertical size={18} />
      </button>
    )
  return (
    <div
      ref={setRef}
      style={{
        transform: CSS.Transform.toString(dragTransform),
        transition: dragTransition,
        zIndex: beingDragged ? 20 : undefined,
        position: 'relative',
      }}
      className={cn(beingDragged && 'opacity-90 shadow-glow rounded-3xl')}
    >
      {renderChild({
        handle: handleButton,
        dragging: beingDragged,
      })}
    </div>
  )
}
export function useDragSensors() {
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
export function SlotRow({ slot: slotItem, handle: dragHandleNode, onPick: onPickExercise, onChange: onChangeSlot, onRemove: onRemoveSlot }) {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        {dragHandleNode}
        <span className="badge bg-brand/10 text-brand">{muscleGroupLabel(slotItem.group)}</span>
        <button
          onClick={() =>
            onChangeSlot({
              role: slotItem.role === 'grund' ? 'iso' : 'grund',
              ...defaultVolume(slotItem.role === 'grund' ? 'iso' : 'grund', slotItem.group),
              sets: String(defaultVolume(slotItem.role === 'grund' ? 'iso' : 'grund', slotItem.group).sets),
            })
          }
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
          title="Rolle wechseln"
        >
          {ROLE_LABELS[slotItem.role]}
        </button>
        <button
          onClick={onRemoveSlot}
          className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Platz entfernen"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <button
        onClick={onPickExercise}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl text-left transition-all active:scale-[0.985]',
          slotItem.ex
            ? 'bg-bg-card border border-border p-2'
            : 'border-2 border-dashed border-brand/40 text-brand p-3 justify-center hover:bg-brand/5',
        )}
      >
        {slotItem.ex ? (
          <>
            <span className="w-11 h-11 rounded-lg bg-bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
              {slotItem.ex.own ? (
                <UserRound size={20} className="text-brand" aria-hidden="true" />
              ) : (
              <img
                src={exerciseImageUrl({
                  image: slotItem.ex.image,
                })}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(event) => {
                  event.target.style.visibility = 'hidden'
                }}
              />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-text-primary truncate">{slotItem.ex.name}</span>
              <span className="block text-xs text-text-muted">{slotItem.ex.own ? 'Eigene Übung · antippen zum Tauschen' : 'Antippen zum Tauschen'}</span>
            </span>
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Plus size={16} /> Übung für {muscleGroupLabel(slotItem.group)} wählen
          </span>
        )}
      </button>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          inputMode="numeric"
          aria-label="Sätze"
          className="input !w-14 !px-2 !py-1.5 text-center text-sm font-semibold"
          value={slotItem.sets}
          onChange={(event) =>
            onChangeSlot({
              sets: event.target.value.replace(/\D/g, '').slice(0, 2),
            })
          }
        />
        <span>Sätze ×</span>
        <input
          aria-label="Wiederholungen"
          className="input !w-20 !px-2 !py-1.5 text-center text-sm font-semibold"
          value={slotItem.reps}
          onChange={(event) =>
            onChangeSlot({
              reps: event.target.value.replace(/[^0-9-–]/g, '').slice(0, 7),
            })
          }
        />
        <span>Wdh.</span>
      </div>
    </div>
  )
}
export function DayCard({ day: dayItem, index: dayPos, handle: dragHandle, onChange: onChangeDay, onRemove: onRemoveDay, onPickSlot: onPickSlotId }) {
  let dragSensors = useDragSensors(),
    [groupSheetOpen, setGroupSheetOpen] = useState(false),
    filledCount = dayItem.slots.filter((slotItem) => slotItem.ex).length
  function handleDragEnd(dragEvent) {
    if (!dragEvent.over || dragEvent.active.id === dragEvent.over.id) return
    let fromIndex = dayItem.slots.findIndex((slotItem) => slotItem.id === dragEvent.active.id),
      toIndex = dayItem.slots.findIndex((slotItem) => slotItem.id === dragEvent.over.id)
    onChangeDay({
      slots: arrayMove(dayItem.slots, fromIndex, toIndex),
    })
  }
  let updateSlot = (slotKey, changes) =>
    onChangeDay({
      slots: dayItem.slots.map((slotItem) =>
        slotItem.id === slotKey
          ? {
              ...slotItem,
              ...changes,
            }
          : slotItem,
      ),
    })
  return (
    <div
      className="card enter space-y-3"
      style={{
        '--d': 80 + dayPos * 70,
      }}
    >
      <div className="flex items-center gap-2">
        {dragHandle}
        <input
          className="flex-1 min-w-0 bg-transparent text-lg font-bold text-text-primary tracking-tight outline-none focus:ring-1 focus:ring-brand rounded-lg px-1"
          value={dayItem.name}
          onChange={(event) =>
            onChangeDay({
              name: event.target.value,
            })
          }
          aria-label="Name des Trainingstags"
        />
        <span className="text-xs text-text-muted whitespace-nowrap">
          {filledCount}/{dayItem.slots.length}
        </span>
        <button
          onClick={onRemoveDay}
          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Tag entfernen"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Wochentage">
        {WEEKDAY_LABELS.map((weekdayLabel, weekdayIndex) => {
          let isSelected = dayItem.weekdays.includes(weekdayIndex + 1)
          return (
            <button
              aria-pressed={isSelected}
              onClick={() =>
                onChangeDay({
                  weekdays: isSelected ? dayItem.weekdays.filter((dayNumber) => dayNumber !== weekdayIndex + 1) : [...dayItem.weekdays, weekdayIndex + 1].sort(),
                })
              }
              className={cn(
                'w-9 h-8 rounded-full text-xs font-bold border transition-all active:scale-90',
                isSelected ? 'bg-primary border-brand text-white' : 'border-border text-text-muted hover:border-brand/40',
              )}
              key={weekdayLabel}
            >
              {weekdayLabel}
            </button>
          )
        })}
      </div>
      <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dayItem.slots.map((slotItem) => slotItem.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {dayItem.slots.map((slotItem) => (
              <SortableItem id={slotItem.id} key={slotItem.id}>
                {({ handle: slotHandle }) => (
                  <SlotRow
                    slot={slotItem}
                    handle={slotHandle}
                    onPick={() => onPickSlotId(slotItem.id)}
                    onChange={(slotChanges) => updateSlot(slotItem.id, slotChanges)}
                    onRemove={() =>
                      onChangeDay({
                        slots: dayItem.slots.filter((other) => other.id !== slotItem.id),
                      })
                    }
                  />
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={() => setGroupSheetOpen(true)} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
        <Plus size={15} /> Muskelgruppe hinzufügen
      </button>
      <BottomSheet open={groupSheetOpen} onClose={() => setGroupSheetOpen(false)} title="Muskelgruppe hinzufügen">
        <div className="grid grid-cols-2 gap-2 pb-3">
          {MUSCLE_GROUPS.filter((muscle) => muscle.key !== 'sonstige').map((muscle) => (
            <button
              onClick={() => {
                ;(onChangeDay({
                  slots: [...dayItem.slots, newSlot(muscle.key, 'iso')],
                }),
                  setGroupSheetOpen(false))
              }}
              className="rounded-2xl bg-bg-elevated border border-border px-3 py-3 text-sm font-semibold text-text-primary hover:border-brand/50 active:scale-95 transition-all text-left"
              key={muscle.key}
            >
              {muscle.label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
export function PlanBuilder({ onSaved: handleSaved }) {
  let { user: currentUser } = useAuth(),
    dragSensors = useDragSensors(),
    [splitData, setSplit] = useState(null),
    [planName, setPlanName] = useState(''),
    [planDays, setDays] = useState([]),
    [pickTarget, setPickTarget] = useState(null),
    [saving, setSaving] = useState(false),
    [suggesting, setSuggesting] = useState(false),
    [errorText, setErrorText] = useState(''),
    pickedSlot = useMemo(
      () => (pickTarget ? (planDays.find((dayItem) => dayItem.id === pickTarget.dayId)?.slots.find((slotItem) => slotItem.id === pickTarget.slotId) ?? null) : null),
      [pickTarget, planDays],
    ),
    slotTotal = planDays.reduce((sum, dayItem) => sum + dayItem.slots.length, 0),
    chosenTotal = planDays.reduce((sum, dayItem) => sum + dayItem.slots.filter((slotItem) => slotItem.ex).length, 0)
  function chooseSplit(chosenSplit) {
    ;(setSplit(chosenSplit), setPlanName(chosenSplit.id === 'frei' ? 'Mein Plan' : chosenSplit.name), setDays(daysFromSplit(chosenSplit)), setErrorText(''))
  }
  let updateDay = (dayKey, changes) =>
    setDays((prevDays) =>
      prevDays.map((dayItem) =>
        dayItem.id === dayKey
          ? {
              ...dayItem,
              ...changes,
            }
          : dayItem,
      ),
    )
  function handleDayDragEnd(dragEvent) {
    !dragEvent.over ||
      dragEvent.active.id === dragEvent.over.id ||
      setDays((prevDays) =>
        arrayMove(
          prevDays,
          prevDays.findIndex((dayItem) => dayItem.id === dragEvent.active.id),
          prevDays.findIndex((dayItem) => dayItem.id === dragEvent.over.id),
        ),
      )
  }
  function pickExercise(exercise) {
    pickTarget &&
      (updateDay(pickTarget.dayId, {
        slots: planDays
          .find((dayItem) => dayItem.id === pickTarget.dayId)
          .slots.map((slotItem) =>
            slotItem.id === pickTarget.slotId
              ? {
                  ...slotItem,
                  ex: {
                    id: exercise.id,
                    name: exercise.name,
                    image: exercise.image,
                    own: !!exercise.own,
                  },
                }
              : slotItem,
          ),
      }),
      setPickTarget(null))
  }
  async function suggestFill() {
    setSuggesting(true)
    try {
      let allExercises = await loadExerciseData(),
        usedIds = new Set(planDays.flatMap((dayItem) => dayItem.slots.map((slotItem) => slotItem.ex?.id)).filter(Boolean)),
        equipmentRank = (exercise) =>
          ({
            Langhantel: 0,
            Kurzhantel: 1,
            Maschine: 2,
            Kabel: 3,
            Körpergewicht: 4,
          })[exercise.equipment_group] ?? 5
      setDays((prevDays) =>
        prevDays.map((dayItem) => ({
          ...dayItem,
          slots: dayItem.slots.map((slotItem) => {
            if (slotItem.ex) return slotItem
            let suggestion = allExercises
              .filter(
                (candidate) =>
                  candidate.group === slotItem.group && !candidate.stretch && !usedIds.has(candidate.id) && !/\(.*(pov|male|female).*\)/i.test(candidate.name_en),
              )
              .sort((candidateA, candidateB) => {
                let wantCompound = +(slotItem.role === 'grund')
                return (
                  (candidateA.compound === wantCompound ? 0 : 1) - (candidateB.compound === wantCompound ? 0 : 1) ||
                  equipmentRank(candidateA) - equipmentRank(candidateB) ||
                  candidateA.name.length - candidateB.name.length
                )
              })[0]
            return suggestion
              ? (usedIds.add(suggestion.id),
                {
                  ...slotItem,
                  ex: {
                    id: suggestion.id,
                    name: suggestion.name,
                    image: suggestion.image,
                  },
                })
              : slotItem
          }),
        })),
      )
    } finally {
      setSuggesting(false)
    }
  }
  async function savePlan() {
    if (!currentUser) return
    let filledDays = planDays
      .map((dayItem) => ({
        ...dayItem,
        slots: dayItem.slots.filter((slotItem) => slotItem.ex),
      }))
      .filter((dayItem) => dayItem.slots.length)
    if (!filledDays.length) {
      setErrorText('Wähle mindestens eine Übung aus.')
      return
    }
    ;(setSaving(true), setErrorText(''))
    try {
      for (let dayIndex = 0; dayIndex < filledDays.length; dayIndex++) {
        let dayItem = filledDays[dayIndex],
          { data: created, error: insertError } = await insertWithFallback(
            'training_vorlagen',
            {
              user_id: currentUser.id,
              name: `${planName.trim() || 'Mein Plan'} · ${dayItem.name}`,
              trainingstyp: 'Kraft',
              wochentage: dayItem.weekdays.join(',') || null,
              plan_name: planName.trim() || 'Mein Plan',
              plan_split: splitData?.id ?? null,
              plan_reihenfolge: dayIndex,
            },
            ['plan_name', 'plan_split', 'plan_reihenfolge'],
          )
        if (insertError || !created) throw Error(insertError?.message ?? 'Speichern fehlgeschlagen')
        let { error: slotsError } = await insertWithFallback(
          'vorlagen_uebungen',
          dayItem.slots.map((slotItem, slotIndex) => ({
            vorlage_id: created.id,
            uebungsname: slotItem.ex.name,
            saetze: parseInt(slotItem.sets) || null,
            wdh: parseInt(slotItem.reps) || null,
            wdh_text: slotItem.reps || null,
            gruppe: slotItem.group,
            rolle: slotItem.role,
            reihenfolge: slotIndex,
          })),
          ['wdh_text', 'gruppe', 'rolle'],
        )
        if (slotsError) throw Error(slotsError.message)
      }
      handleSaved()
    } catch (saveError) {
      setErrorText(saveError instanceof Error ? saveError.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }
  return splitData ? (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3 enter">
        <button
          onClick={() => setSplit(null)}
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
            value={planName}
            onChange={(event) => setPlanName(event.target.value)}
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
          {splitData.name} · {chosenTotal} von {slotTotal} Übungen gewählt
        </span>
        <button onClick={suggestFill} disabled={suggesting} className="btn-secondary text-sm !px-4 !py-2 ml-auto flex items-center gap-2">
          {suggesting ? <Spinner size={14} /> : <Sparkles size={14} />} Leere Plätze vorschlagen
        </button>
      </div>
      <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDayDragEnd}>
        <SortableContext items={planDays.map((dayItem) => dayItem.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {planDays.map((dayItem, dayIndex) => (
              <SortableItem id={dayItem.id} key={dayItem.id}>
                {({ handle: dragHandle }) => (
                  <DayCard
                    day={dayItem}
                    index={dayIndex}
                    handle={dragHandle}
                    onChange={(dayChanges) => updateDay(dayItem.id, dayChanges)}
                    onRemove={() => setDays((prevDays) => prevDays.filter((other) => other.id !== dayItem.id))}
                    onPickSlot={(slotKey) =>
                      setPickTarget({
                        dayId: dayItem.id,
                        slotId: slotKey,
                      })
                    }
                  />
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={() =>
          setDays((prevDays) => [
            ...prevDays,
            {
              id: newId(),
              name: `Tag ${prevDays.length + 1}`,
              weekdays: [],
              slots: [],
            },
          ])
        }
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Trainingstag hinzufügen
      </button>
      {errorText && (
        <div className="text-sm text-danger" role="alert">
          {errorText}
        </div>
      )}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)_-_2.5rem)] lg:bottom-4 z-10">
        <button
          onClick={savePlan}
          disabled={saving || chosenTotal === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 shadow-glow disabled:opacity-50"
        >
          {saving ? <Spinner size={16} /> : <Check size={18} />}Plan speichern (
          {planDays.filter((dayItem) => dayItem.slots.some((slotItem) => slotItem.ex)).length} Vorlagen)
        </button>
      </div>
      <ExercisePicker open={!!pickTarget} onClose={() => setPickTarget(null)} group={pickedSlot?.group ?? 'brust'} role={pickedSlot?.role ?? 'grund'} onPick={pickExercise} />
      {slotTotal === 0 && (
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
        {SPLITS.map((splitItem, splitIndex) => (
          <button
            onClick={() => chooseSplit(splitItem)}
            className="card enter text-left space-y-2 hover:border-brand/50 active:scale-[0.985] transition-all"
            style={{
              '--d': 60 + splitIndex * 55,
            }}
            key={splitItem.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-text-primary">{splitItem.name}</div>
                <div className="text-xs text-brand font-semibold mt-0.5">{splitItem.tagline}</div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0 mt-1" />
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{splitItem.description}</p>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {splitItem.days.map((splitDay, splitDayIndex) => (
                <span className="badge bg-bg-elevated text-text-secondary border border-border" key={splitDayIndex}>
                  {splitDay.name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
export async function insertWithFallback(table, payload, optionalColumns) {
  let attempt = async (body) => {
      if (Array.isArray(body)) {
        let { error: batchError } = await supabase.from(table).insert(body)
        return {
          data: null,
          error: batchError,
        }
      }
      let { data: insertedRow, error: singleError } = await supabase.from(table).insert(body).select('id').single()
      return {
        data: insertedRow,
        error: singleError,
      }
    },
    firstResult = await attempt(payload)
  if (!firstResult.error || !/column|schema cache|PGRST204|42703/i.test(`${firstResult.error.message} ${firstResult.error.code ?? ''}`)) return firstResult
  let stripOptional = (record) => Object.fromEntries(Object.entries(record).filter(([column]) => !optionalColumns.includes(column)))
  return attempt(Array.isArray(payload) ? payload.map(stripOptional) : stripOptional(payload))
}
