import { useEffect, useState } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import type { KalenderEvent } from '../types/database'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, parseISO,
} from 'date-fns'
import { de } from 'date-fns/locale'

const EVENT_COLORS: Record<string, string> = {
  coaching: 'bg-primary/20 text-primary border-primary/30',
  training: 'bg-success/20 text-success border-success/30',
  sonstiges: 'bg-warning/20 text-warning border-warning/30',
}

interface EventForm {
  titel: string; datum: string; uhrzeit: string; dauer_min: string; typ: 'coaching' | 'training' | 'sonstiges'; notizen: string
}

export function Calendar() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<KalenderEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EventForm>({
    titel: '', datum: todayISO(), uhrzeit: '', dauer_min: '', typ: 'training', notizen: '',
  })

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

  useEffect(() => { load() }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('kalender_events').insert({
      coach_id: profile?.role === 'coach' ? user.id : (profile?.coach_id ?? user.id),
      client_id: profile?.role === 'client' ? user.id : null,
      titel: form.titel,
      datum: form.datum,
      uhrzeit: form.uhrzeit || null,
      dauer_min: form.dauer_min ? parseInt(form.dauer_min) : null,
      typ: form.typ,
      notizen: form.notizen || null,
    })
    await load()
    setOpen(false)
    setForm({ titel: '', datum: todayISO(), uhrzeit: '', dauer_min: '', typ: 'training', notizen: '' })
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('kalender_events').delete().eq('id', id)
    setEvents(e => e.filter(x => x.id !== id))
  }

  function openAdd(date?: Date) {
    setForm(f => ({ ...f, datum: date ? format(date, 'yyyy-MM-dd') : todayISO() }))
    setOpen(true)
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsForDay = (day: Date) =>
    events.filter(e => isSameDay(parseISO(e.datum), day))

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : []

  const upcomingEvents = events
    .filter(e => e.datum >= todayISO())
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Kalender</h1>
          <p className="text-text-secondary text-sm mt-0.5">Training & Coaching-Termine</p>
        </div>
        <button onClick={() => openAdd()} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Termin hinzufügen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 card">
          {/* Month Navigation */}
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

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
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
                  className={`
                    min-h-[64px] p-1.5 rounded-lg cursor-pointer transition-all border
                    ${isCurrentMonth ? 'text-text-primary' : 'text-text-muted opacity-50'}
                    ${isToday ? 'bg-primary/10 border-primary/30' : isSelected ? 'bg-bg-elevated border-border-light' : 'border-transparent hover:bg-bg-elevated'}
                  `}
                >
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-primary text-white' : ''
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div
                        key={e.id}
                        className={`text-xs px-1 py-0.5 rounded truncate border ${EVENT_COLORS[e.typ] || EVENT_COLORS.sonstiges}`}
                      >
                        {e.titel}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-text-muted px-1">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Day Events */}
          {selectedDay && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">
                {formatDate(selectedDay, 'EEEE, dd. MMM')}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <div className="text-sm text-text-muted py-2">Keine Termine</div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(e => (
                    <div key={e.id} className={`p-3 rounded-lg border ${EVENT_COLORS[e.typ] || EVENT_COLORS.sonstiges}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{e.titel}</div>
                          {e.uhrzeit && (
                            <div className="flex items-center gap-1 text-xs mt-1 opacity-75">
                              <Clock size={11} /> {e.uhrzeit} {e.dauer_min ? `(${e.dauer_min} min)` : ''}
                            </div>
                          )}
                          {e.notizen && <div className="text-xs mt-1 opacity-75">{e.notizen}</div>}
                        </div>
                        <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-black/10 transition-colors shrink-0 ml-2">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => openAdd(selectedDay)} className="btn-secondary w-full mt-3 text-sm flex items-center justify-center gap-2">
                <Plus size={14} /> Termin für diesen Tag
              </button>
            </div>
          )}

          {/* Upcoming Events */}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Nächste Termine</h3>
            {loading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-sm text-text-muted">Keine anstehenden Termine</div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-start gap-3">
                    <div className="text-center shrink-0 w-10">
                      <div className="text-xs text-text-muted">{format(parseISO(e.datum), 'MMM', { locale: de })}</div>
                      <div className="text-lg font-bold text-text-primary leading-none">{format(parseISO(e.datum), 'd')}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium inline-block px-2 py-0.5 rounded-full border ${EVENT_COLORS[e.typ]}`}>
                        {e.typ.charAt(0).toUpperCase() + e.typ.slice(1)}
                      </div>
                      <div className="text-sm text-text-primary mt-0.5 truncate">{e.titel}</div>
                      {e.uhrzeit && <div className="text-xs text-text-muted">{e.uhrzeit}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Termin hinzufügen">
        <div className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input type="text" className="input" placeholder="Z.B. Training Brust" value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div>
              <label className="label">Uhrzeit</label>
              <input type="time" className="input" value={form.uhrzeit} onChange={e => setForm(f => ({ ...f, uhrzeit: e.target.value }))} />
            </div>
            <div>
              <label className="label">Typ</label>
              <select className="input" value={form.typ} onChange={e => setForm(f => ({ ...f, typ: e.target.value as EventForm['typ'] }))}>
                <option value="training">Training</option>
                <option value="coaching">Coaching</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="label">Dauer (Minuten)</label>
              <input type="number" className="input" placeholder="60" value={form.dauer_min} onChange={e => setForm(f => ({ ...f, dauer_min: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notizen</label>
            <input type="text" className="input" placeholder="Optional" value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving || !form.titel}>
              {saving && <Spinner size={16} />}
              Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
