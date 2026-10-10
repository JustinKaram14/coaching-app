// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { formatDate, todayISO } from '../lib/utils'
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isMissingColumn, omitKeys } from '../lib/dbErrors'
import { sendPushToUser } from '../lib/push'
import { Bell, ChevronLeft, ChevronRight, Clock, Layers, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { de } from 'date-fns/locale'
import { Spinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'

export const X4 = {
  coaching: 'bg-brand/20 text-brand border-brand/30',
  training: 'bg-success/20 text-success border-success/30',
  sonstiges: 'bg-warning/20 text-warning border-warning/30',
}
export const Z4 = {
  titel: '',
  datum: todayISO(),
  uhrzeit: '',
  dauer_min: '',
  typ: 'training',
  notizen: '',
  client_id: '',
  vorlage_id: '',
  erinnerung: '',
  recurring: false,
  recur_freq: 'weekly',
  recur_count: '8',
}
export const Q4 = [
  {
    value: '0',
    label: 'Keine Erinnerung',
  },
  {
    value: '15',
    label: '15 Minuten vorher',
  },
  {
    value: '30',
    label: '30 Minuten vorher',
  },
  {
    value: '60',
    label: '1 Stunde vorher',
  },
  {
    value: '120',
    label: '2 Stunden vorher',
  },
  {
    value: '1440',
    label: '1 Tag vorher',
  },
]
export const $4 = (minutes) => Q4.find((choice) => choice.value === String(minutes))?.label ?? `${minutes} Minuten vorher`
export const e3 = (workout) =>
  workout.plan_name && workout.name.startsWith(`${workout.plan_name} · `) ? workout.name.slice(workout.plan_name.length + 3) : workout.name
export function t3(startDate, frequency, count) {
  let dates = [],
    firstDate = parseISO(startDate)
  for (let step = 0; step < count; step++) {
    let day
    ;((day = frequency === 'weekly' ? addWeeks(firstDate, step) : frequency === 'biweekly' ? addWeeks(firstDate, step * 2) : addMonths(firstDate, step)),
      dates.push(format(day, 'yyyy-MM-dd')))
  }
  return dates
}
export function Calendar() {
  let { user: authUser, profile: authProfile } = useAuth(),
    navigate = useNavigate(),
    isCoach = authProfile?.role === 'coach',
    [workouts, setWorkouts] = useState([]),
    [reminderDefault, setReminderDefault] = useState(60),
    [notice, setNotice] = useState(''),
    [events, setEvents] = useState([]),
    [loading, setLoading] = useState(true),
    [clients, setClients] = useState([]),
    [viewMonth, setViewMonth] = useState(new Date()),
    [selectedDay, setSelectedDay] = useState(null),
    [modalOpen, setModalOpen] = useState(false),
    [editingId, setEditingId] = useState(null),
    [saving, setSaving] = useState(false),
    [form, setForm] = useState(Z4)
  async function loadEvents() {
    if (!authUser) return
    let { data: eventRows } = await supabase
      .from('kalender_events')
      .select('*')
      .or(`coach_id.eq.${authUser.id},client_id.eq.${authUser.id}`)
      .order('datum', {
        ascending: true,
      })
    ;(setEvents(eventRows ?? []), setLoading(false))
  }
  async function loadClients() {
    if (!authUser || !isCoach) return
    let { data: clientRows } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('coach_id', authUser.id)
      .eq('role', 'client')
    setClients(clientRows ?? [])
  }
  async function loadWorkouts() {
    if (!authUser || isCoach) return
    let [workoutsResult, settingsResult] = await Promise.all([
      supabase.from('training_vorlagen').select('*').eq('user_id', authUser.id).order('created_at', {
        ascending: false,
      }),
      supabase.from('client_settings').select('notif_appointment_minutes').eq('user_id', authUser.id).maybeSingle(),
    ])
    ;(setWorkouts(workoutsResult.data ?? []), setReminderDefault(settingsResult.data?.notif_appointment_minutes ?? 60))
  }
  useEffect(() => {
    ;(loadEvents(), loadClients(), loadWorkouts())
  }, [authUser, authProfile])
  function openNew(day) {
    ;(setEditingId(null),
      setForm({
        ...Z4,
        datum: day ? format(day, 'yyyy-MM-dd') : todayISO(),
      }),
      setModalOpen(true))
  }
  function openEdit(event) {
    ;(setEditingId(event.id),
      setForm({
        titel: event.titel,
        datum: event.datum,
        uhrzeit: event.uhrzeit ?? '',
        dauer_min: event.dauer_min ? String(event.dauer_min) : '',
        typ: event.typ,
        notizen: event.notizen ?? '',
        client_id: event.client_id ?? '',
        vorlage_id: event.vorlage_id ?? '',
        erinnerung: event.erinnerung_min == null ? '' : String(event.erinnerung_min),
        recurring: false,
        recur_freq: 'weekly',
        recur_count: '8',
      }),
      setModalOpen(true))
  }
  async function saveEvent() {
    if (!authUser || !form.titel) return
    setSaving(true)
    let payload = {
        coach_id: isCoach ? authUser.id : (authProfile?.coach_id ?? authUser.id),
        client_id: isCoach ? form.client_id || null : authUser.id,
        titel: form.titel,
        uhrzeit: form.uhrzeit || null,
        dauer_min: form.dauer_min ? parseInt(form.dauer_min) : null,
        typ: form.typ,
        notizen: form.notizen || null,
        vorlage_id: !isCoach && form.vorlage_id ? form.vorlage_id : null,
        erinnerung_min: form.erinnerung === '' ? null : parseInt(form.erinnerung),
      },
      optionalKeys = ['vorlage_id', 'erinnerung_min'],
      write = async (withoutOptional) => {
        let prune = (row) => (withoutOptional ? omitKeys(row, optionalKeys) : row)
        if (editingId)
          return supabase
            .from('kalender_events')
            .update(
              prune({
                ...payload,
                datum: form.datum,
              }),
            )
            .eq('id', editingId)
        if (form.recurring) {
          let dates = t3(form.datum, form.recur_freq, parseInt(form.recur_count) || 8)
          return supabase.from('kalender_events').insert(
            dates.map((date) =>
              prune({
                ...payload,
                datum: date,
              }),
            ),
          )
        }
        return supabase.from('kalender_events').insert(
          prune({
            ...payload,
            datum: form.datum,
          }),
        )
      },
      result = await write(false)
    if (
      (isMissingColumn(result.error) &&
        ((result = await write(true)),
        result.error || setNotice('Gespeichert. Vorlage und eigene Erinnerung brauchen noch das Datenbank-Update.')),
      result.error && setNotice('Der Termin konnte nicht gespeichert werden. Bitte versuche es noch einmal.'),
      isCoach && payload.client_id && payload.client_id !== authUser.id)
    ) {
      let verb = editingId ? 'aktualisiert' : 'erstellt'
      sendPushToUser(
        payload.client_id,
        `Neuer Termin ${verb}`,
        `${form.titel} am ${form.datum}${form.uhrzeit ? ' um ' + form.uhrzeit : ''}`,
        'https://justinkaram14.github.io/coaching-app/#/calendar',
      )
    }
    ;(await loadEvents(), setModalOpen(false), setEditingId(null), setForm(Z4), setSaving(false))
  }
  async function deleteEvent(eventId) {
    ;(await supabase.from('kalender_events').delete().eq('id', eventId), setEvents((list) => list.filter((event) => event.id !== eventId)))
  }
  let monthStart = startOfMonth(viewMonth),
    monthEnd = endOfMonth(viewMonth),
    gridDays = eachDayOfInterval({
      start: startOfWeek(monthStart, {
        weekStartsOn: 1,
      }),
      end: endOfWeek(monthEnd, {
        weekStartsOn: 1,
      }),
    }),
    isOwn = (event) => (isCoach ? event.coach_id === authUser?.id : event.created_by === authUser?.id),
    workoutName = (workoutId) => {
      let found = workouts.find((item) => item.id === workoutId)
      return found ? e3(found) : null
    },
    todayStr = todayISO(),
    isPlannedToday = (event) => !isCoach && !!event.vorlage_id && event.datum === todayStr && !!workouts.find((item) => item.id === event.vorlage_id),
    eventsOn = (day) => events.filter((event) => isSameDay(parseISO(event.datum), day)),
    selectedEvents = selectedDay ? eventsOn(selectedDay) : [],
    upcoming = events.filter((event) => event.datum >= todayISO()).slice(0, 5)
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Kalender</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {isCoach ? 'Termine für deine Klienten' : 'Deine Termine und geplantes Training'}
          </p>
        </div>
        <button onClick={() => openNew()} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> {isCoach ? 'Termin erstellen' : 'Training planen'}
        </button>
      </div>
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-2xl bg-bg-elevated border border-border px-4 py-3 text-sm text-text-secondary"
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            className="text-text-muted hover:text-text-primary shrink-0"
            aria-label="Hinweis schließen"
          >
            ×
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              aria-label="Vorheriger Monat"
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-text-primary">
              {format(viewMonth, 'MMMM yyyy', {
                locale: de,
              })}
            </h2>
            <button
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              aria-label="Nächster Monat"
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((weekday) => (
              <div className="text-center text-xs font-medium text-text-muted py-2" key={weekday}>
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((day) => {
              let dayEvents = eventsOn(day),
                isToday = isSameDay(day, new Date()),
                inMonth = isSameMonth(day, viewMonth),
                isSelected = selectedDay && isSameDay(day, selectedDay)
              return (
                <div
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[64px] p-1.5 rounded-lg cursor-pointer transition-all border
                    ${inMonth ? 'text-text-primary' : 'text-text-muted'}
                    ${isToday ? 'bg-brand/10 border-brand/30' : isSelected ? 'bg-bg-elevated border-border-light' : 'border-transparent hover:bg-bg-elevated'}`}
                  key={day.toISOString()}
                >
                  <div
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-primary text-white' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        className={`text-xs px-1 py-0.5 rounded truncate border ${X4[event.typ] || X4.sonstiges}`}
                        key={event.id}
                      >
                        {event.titel}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-xs text-text-muted px-1">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-4">
          {selectedDay && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">{formatDate(selectedDay, 'EEEE, dd. MMM')}</h3>
              {selectedEvents.length === 0 ? (
                <div className="text-sm text-text-muted py-2">Keine Termine</div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((event) => {
                    let clientName = clients.find((client) => client.id === event.client_id)?.name,
                      workoutLabel = workoutName(event.vorlage_id)
                    return (
                      <div className={`p-3 rounded-lg border ${X4[event.typ] || X4.sonstiges}`} key={event.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{event.titel}</div>
                            {clientName && <div className="text-xs mt-0.5">👤 {clientName}</div>}
                            {event.uhrzeit && (
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Clock size={11} /> {event.uhrzeit.slice(0, 5)} {event.dauer_min ? `(${event.dauer_min} min)` : ''}
                              </div>
                            )}
                            {workoutLabel && (
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Layers size={11} aria-hidden="true" /> Vorlage: {workoutLabel}
                              </div>
                            )}
                            {event.uhrzeit && event.erinnerung_min != null && event.erinnerung_min > 0 && (
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Bell size={11} aria-hidden="true" /> {$4(event.erinnerung_min)}
                              </div>
                            )}
                            {event.notizen && <div className="text-xs mt-1">{event.notizen}</div>}
                          </div>
                          {isOwn(event) && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEdit(event)}
                                className="p-1 rounded hover:bg-black/10 transition-colors"
                                aria-label="Termin bearbeiten"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => deleteEvent(event.id)}
                                className="p-1 rounded hover:bg-black/10 transition-colors"
                                aria-label="Termin löschen"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {isPlannedToday(event) && (
                          <button
                            onClick={() => navigate(`/training?start=${event.vorlage_id}`)}
                            className="mt-2.5 w-full btn-primary !py-2 text-sm flex items-center justify-center gap-2"
                          >
                            <Play size={14} aria-hidden="true" /> Training starten
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                onClick={() => openNew(selectedDay)}
                className="btn-secondary w-full mt-3 text-sm flex items-center justify-center gap-2"
              >
                <Plus size={14} /> {isCoach ? 'Termin für diesen Tag' : 'Training für diesen Tag planen'}
              </button>
            </div>
          )}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Nächste Termine</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-sm text-text-muted">Keine anstehenden Termine</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((event) => {
                  let clientName = isCoach ? clients.find((client) => client.id === event.client_id)?.name : null
                  return (
                    <div className="flex items-start gap-3" key={event.id}>
                      <div className="text-center shrink-0 w-10">
                        <div className="text-xs text-text-muted">
                          {format(parseISO(event.datum), 'MMM', {
                            locale: de,
                          })}
                        </div>
                        <div className="text-lg font-bold text-text-primary leading-none">
                          {format(parseISO(event.datum), 'd')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium inline-block px-2 py-0.5 rounded-full border ${X4[event.typ]}`}
                        >
                          {event.typ}
                        </div>
                        <div className="text-sm text-text-primary mt-0.5 truncate">{event.titel}</div>
                        {clientName && <div className="text-xs text-text-muted">👤 {clientName}</div>}
                        {event.uhrzeit && <div className="text-xs text-text-muted">{event.uhrzeit.slice(0, 5)}</div>}
                        {workoutName(event.vorlage_id) && (
                          <div className="text-xs text-text-muted flex items-center gap-1">
                            <Layers size={11} aria-hidden="true" /> {workoutName(event.vorlage_id)}
                          </div>
                        )}
                      </div>
                      {isPlannedToday(event) && (
                        <button
                          onClick={() => navigate(`/training?start=${event.vorlage_id}`)}
                          className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1.5 shrink-0"
                          aria-label={`Training starten: ${event.titel}`}
                        >
                          <Play size={12} aria-hidden="true" /> Starten
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal
        open={modalOpen}
        onClose={() => {
          ;(setModalOpen(false), setEditingId(null), setForm(Z4))
        }}
        title={editingId ? 'Termin bearbeiten' : isCoach ? 'Termin erstellen' : 'Training planen'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input
              type="text"
              className="input"
              placeholder="Z.B. Pull Day Training"
              value={form.titel}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  titel: event.target.value,
                }))
              }
              autoFocus
            />
          </div>
          {isCoach && clients.length > 0 && (
            <div>
              <label className="label">Klient</label>
              <select
                className="input"
                value={form.client_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    client_id: event.target.value,
                  }))
                }
              >
                <option value="">— Kein Klient (nur für mich) —</option>
                {clients.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name ?? client.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input
                type="date"
                className="input"
                value={form.datum}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    datum: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Uhrzeit</label>
              <input
                type="time"
                className="input"
                value={form.uhrzeit}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    uhrzeit: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Typ</label>
              <select
                className="input"
                value={form.typ}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    typ: event.target.value,
                  }))
                }
              >
                <option value="training">Training</option>
                <option value="coaching">Coaching</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="label">Dauer (Min.)</label>
              <input
                type="number"
                className="input"
                placeholder="60"
                value={form.dauer_min}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dauer_min: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          {!isCoach && (
            <div>
              <label className="label" htmlFor="cal-vorlage">
                Trainingsvorlage
              </label>
              {workouts.length > 0 ? (
                <select
                  id="cal-vorlage"
                  className="input"
                  value={form.vorlage_id}
                  onChange={(event) => {
                    let chosen = workouts.find((item) => item.id === event.target.value)
                    setForm((prev) => {
                      let titleIsAuto = !prev.titel || workouts.some((item) => e3(item) === prev.titel)
                      return {
                        ...prev,
                        vorlage_id: event.target.value,
                        typ: chosen ? 'training' : prev.typ,
                        titel: chosen && titleIsAuto ? e3(chosen) : prev.titel,
                      }
                    })
                  }}
                >
                  <option value="">Keine Vorlage</option>
                  {Array.from(new Set(workouts.map((item) => item.plan_name ?? ''))).map((planName) =>
                    planName ? (
                      <optgroup label={planName} key={planName}>
                        {workouts
                          .filter((item) => item.plan_name === planName)
                          .map((item) => (
                            <option value={item.id} key={item.id}>
                              {e3(item)}
                            </option>
                          ))}
                      </optgroup>
                    ) : (
                      workouts
                        .filter((item) => !item.plan_name)
                        .map((item) => (
                          <option value={item.id} key={item.id}>
                            {item.name}
                          </option>
                        ))
                    ),
                  )}
                </select>
              ) : (
                <p className="text-xs text-text-secondary leading-relaxed">
                  Noch keine Vorlage vorhanden. Lege unter{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/training?tab=vorlagen')}
                    className="text-brand font-semibold underline underline-offset-2"
                  >
                    Training, Vorlagen
                  </button>{' '}
                  eine an, dann kannst du sie hier wählen und am Tag direkt starten.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="label" htmlFor="cal-remind">
              Erinnerung
            </label>
            <select
              id="cal-remind"
              className="input"
              value={form.erinnerung}
              disabled={!form.uhrzeit}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  erinnerung: event.target.value,
                }))
              }
            >
              <option value="">{isCoach ? 'Standard des Klienten' : `Standard (${$4(reminderDefault)})`}</option>
              {Q4.map((choice) => (
                <option value={choice.value} key={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            {!form.uhrzeit && (
              <p className="text-xs text-text-muted mt-1">
                Trage eine Uhrzeit ein, dann erinnert dich HLX Together per Push.
              </p>
            )}
          </div>
          <div>
            <label className="label">Notizen</label>
            <input
              type="text"
              className="input"
              placeholder="Optional"
              value={form.notizen}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  notizen: event.target.value,
                }))
              }
            />
          </div>
          {!editingId && (
            <div className="border border-border rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={form.recurring}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      recurring: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-brand" /> Wiederkehrender Termin
                </span>
              </label>
              {form.recurring && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Frequenz</label>
                    <select
                      className="input text-sm"
                      value={form.recur_freq}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          recur_freq: event.target.value,
                        }))
                      }
                    >
                      <option value="weekly">Wöchentlich</option>
                      <option value="biweekly">2-wöchentlich</option>
                      <option value="monthly">Monatlich</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Wie viele Termine?</label>
                    <input
                      type="number"
                      className="input text-sm"
                      min="2"
                      max="52"
                      value={form.recur_count}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          recur_count: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                ;(setModalOpen(false), setEditingId(null), setForm(Z4))
              }}
              className="btn-secondary flex-1"
            >
              Abbrechen
            </button>
            <button
              onClick={saveEvent}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving || !form.titel}
            >
              {saving && <Spinner size={16} />}
              {form.recurring && !editingId ? `${form.recur_count}× speichern` : 'Speichern'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
