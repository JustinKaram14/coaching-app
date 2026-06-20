import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Clock, Pencil, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import type { KalenderEvent } from '../types/database'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addWeeks, addDays,
  eachDayOfInterval, isSameMonth, isSameDay, parseISO,
} from 'date-fns'
import { de } from 'date-fns/locale'

const EVENT_COLORS: Record<string, string> = {
  coaching: 'bg-primary/20 text-primary border-primary/30',
  training: 'bg-success/20 text-success border-success/30',
  sonstiges: 'bg-warning/20 text-warning border-warning/30',
}

interface EventForm {
  titel: string; datum: string; uhrzeit: string; dauer_min: string
  typ: 'coaching' | 'training' | 'sonstiges'; notizen: string; client_id: string
  recurring: boolean; recur_freq: 'weekly' | 'biweekly' | 'monthly'; recur_count: string
}

const EMPTY_FORM: EventForm = {
  titel: '', datum: todayISO(), uhrzeit: '', dauer_min: '',
  typ: 'training', notizen: '', client_id: '',
  recurring: false, recur_freq: 'weekly', recur_count: '8',
}

function generateRecurringDates(startDate: string, freq: string, count: number): string[] {
  const dates: string[] = []
  const start = parseISO(startDate)
  for (let i = 0; i < count; i++) {
    let d: Date
    if (freq === 'weekly') d = addWeeks(start, i)
    else if (freq === 'biweekly') d = addWeeks(start, i * 2)
    else d = addMonths(start, i)
    dates.push(format(d, 'yyyy-MM-dd'))
  }
  return dates
}

export function Calendar() {
  const { user, profile } = useAuth()
  const isCoach = profile?.role === 'coach'

  const [events, setEvents] = useState<KalenderEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<{ id: string; name: string | null; email: string }[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)

  async function load() {
    if (!user) return
    const { data } = await supabase
      .from('kalender_events')
      .select('*')
      .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`)
      .order('datum', { ascending: true })
    setEvents(data ?? [])
    setLoading(false)
  }

  async function loadClients() {
    if (!user || !isCoach) return
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('coach_id', user.id)
      .eq('role', 'client')
    setClients(data ?? [])
  }

  useEffect(() => { load(); loadClients() }, [user, profile])

  function openAdd(date?: Date) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, datum: date ? format(date, 'yyyy-MM-dd') : todayISO() })
    setOpen(true)
  }

  function openEdit(e: KalenderEvent) {
    setEditingId(e.id)
    setForm({
      titel: e.titel,
      datum: e.datum,
      uhrzeit: e.uhrzeit ?? '',
      dauer_min: e.dauer_min ? String(e.dauer_min) : '',
      typ: e.typ as EventForm['typ'],
      notizen: e.notizen ?? '',
      client_id: e.client_id ?? '',
      recurring: false, recur_freq: 'weekly', recur_count: '8',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!user || !form.titel) return
    setSaving(true)

    const base = {
      coach_id: isCoach ? user.id : (profile?.coach_id ?? user.id),
      client_id: isCoach ? (form.client_id || null) : user.id,
      titel: form.titel,
      uhrzeit: form.uhrzeit || null,
      dauer_min: form.dauer_min ? parseInt(form.dauer_min) : null,
      typ: form.typ,
      notizen: form.notizen || null,
    }

    if (editingId) {
      await supabase.from('kalender_events').update({ ...base, datum: form.datum }).eq('id', editingId)
    } else if (form.recurring && isCoach) {
      const dates = generateRecurringDates(form.datum, form.recur_freq, parseInt(form.recur_count) || 8)
      await supabase.from('kalender_events').insert(dates.map(datum => ({ ...base, datum })))
    } else {
      await supabase.from('kalender_events').insert({ ...base, datum: form.datum })
    }

    await load()
    setOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('kalender_events').delete().eq('id', id)
    setEvents(e => e.filter(x => x.id !== id))
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsForDay = (day: Date) => events.filter(e => isSameDay(parseISO(e.datum), day))
  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : []
  const upcomingEvents = events.filter(e => e.datum >= todayISO()).slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Kalender</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {isCoach ? 'Termine für deine Klienten' : 'Deine Coaching-Termine'}
          </p>
        </div>
        {isCoach && (
          <button onClick={() => openAdd()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Termin erstellen
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-text-primary">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayEvents = eventsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDay && isSameDay(day, selectedDay)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[64px] p-1.5 rounded-lg cursor-pointer transition-all border
                    ${isCurrentMonth ? 'text-text-primary' : 'text-text-muted opacity-40'}
                    ${isToday ? 'bg-primary/10 border-primary/30' : isSelected ? 'bg-bg-elevated border-border-light' : 'border-transparent hover:bg-bg-elevated'}`}
                >
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-primary text-white' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className={`text-xs px-1 py-0.5 rounded truncate border ${EVENT_COLORS[e.typ] || EVENT_COLORS.sonstiges}`}>
                        {e.titel}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-xs text-text-muted px-1">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedDay && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">
                {formatDate(selectedDay, 'EEEE, dd. MMM')}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <div className="text-sm text-text-muted py-2">Keine Termine</div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(e => {
                    const clientName = clients.find(c => c.id === e.client_id)?.name
                    return (
                      <div key={e.id} className={`p-3 rounded-lg border ${EVENT_COLORS[e.typ] || EVENT_COLORS.sonstiges}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{e.titel}</div>
                            {clientName && <div className="text-xs opacity-75 mt-0.5">👤 {clientName}</div>}
                            {e.uhrzeit && (
                              <div className="flex items-center gap-1 text-xs mt-1 opacity-75">
                                <Clock size={11} /> {e.uhrzeit} {e.dauer_min ? `(${e.dauer_min} min)` : ''}
                              </div>
                            )}
                            {e.notizen && <div className="text-xs mt-1 opacity-75">{e.notizen}</div>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-black/10 transition-colors">
                              <Pencil size={12} />
                            </button>
                            {isCoach && (
                              <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-black/10 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {isCoach && (
                <button onClick={() => openAdd(selectedDay)} className="btn-secondary w-full mt-3 text-sm flex items-center justify-center gap-2">
                  <Plus size={14} /> Termin für diesen Tag
                </button>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Nächste Termine</h3>
            {loading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-sm text-text-muted">Keine anstehenden Termine</div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(e => {
                  const clientName = isCoach ? clients.find(c => c.id === e.client_id)?.name : null
                  return (
                    <div key={e.id} className="flex items-start gap-3">
                      <div className="text-center shrink-0 w-10">
                        <div className="text-xs text-text-muted">{format(parseISO(e.datum), 'MMM', { locale: de })}</div>
                        <div className="text-lg font-bold text-text-primary leading-none">{format(parseISO(e.datum), 'd')}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium inline-block px-2 py-0.5 rounded-full border ${EVENT_COLORS[e.typ]}`}>
                          {e.typ}
                        </div>
                        <div className="text-sm text-text-primary mt-0.5 truncate">{e.titel}</div>
                        {clientName && <div className="text-xs text-text-muted">👤 {clientName}</div>}
                        {e.uhrzeit && <div className="text-xs text-text-muted">{e.uhrzeit}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); setForm(EMPTY_FORM) }}
        title={editingId ? 'Termin bearbeiten' : 'Termin erstellen'}>
        <div className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input type="text" className="input" placeholder="Z.B. Pull Day Training" value={form.titel}
              onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} autoFocus />
          </div>

          {/* Coach selects client */}
          {isCoach && clients.length > 0 && (
            <div>
              <label className="label">Klient</label>
              <select className="input" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                <option value="">— Kein Klient (nur für mich) —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name ?? c.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum}
                onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div>
              <label className="label">Uhrzeit</label>
              <input type="time" className="input" value={form.uhrzeit}
                onChange={e => setForm(f => ({ ...f, uhrzeit: e.target.value }))} />
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.typ}
                onChange={e => setForm(f => ({ ...f, typ: e.target.value as EventForm['typ'] }))}>
                <option value="training">Training</option>
                <option value="coaching">Coaching</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="label">Dauer (Min.)</label>
              <input type="number" className="input" placeholder="60" value={form.dauer_min}
                onChange={e => setForm(f => ({ ...f, dauer_min: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Notizen</label>
            <input type="text" className="input" placeholder="Optional" value={form.notizen}
              onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
          </div>

          {/* Recurring — only for new events as coach */}
          {isCoach && !editingId && (
            <div className="border border-border rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={form.recurring}
                  onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
                <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-primary" /> Wiederkehrender Termin
                </span>
              </label>
              {form.recurring && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Frequenz</label>
                    <select className="input text-sm" value={form.recur_freq}
                      onChange={e => setForm(f => ({ ...f, recur_freq: e.target.value as EventForm['recur_freq'] }))}>
                      <option value="weekly">Wöchentlich</option>
                      <option value="biweekly">2-wöchentlich</option>
                      <option value="monthly">Monatlich</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Wie viele Termine?</label>
                    <input type="number" className="input text-sm" min="2" max="52" value={form.recur_count}
                      onChange={e => setForm(f => ({ ...f, recur_count: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => { setOpen(false); setEditingId(null); setForm(EMPTY_FORM) }} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving || !form.titel}>
              {saving && <Spinner size={16} />}
              {form.recurring && !editingId ? `${form.recur_count}× speichern` : 'Speichern'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
