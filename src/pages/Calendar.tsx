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
export const $4 = (e) => Q4.find((t) => t.value === String(e))?.label ?? `${e} Minuten vorher`
export const e3 = (e) =>
  e.plan_name && e.name.startsWith(`${e.plan_name} · `) ? e.name.slice(e.plan_name.length + 3) : e.name
export function t3(e, t, n) {
  let r = [],
    i = parseISO(e)
  for (let e = 0; e < n; e++) {
    let n
    ;((n = t === 'weekly' ? addWeeks(i, e) : t === 'biweekly' ? addWeeks(i, e * 2) : addMonths(i, e)),
      r.push(format(n, 'yyyy-MM-dd')))
  }
  return r
}
export function Calendar() {
  let { user: e, profile: t } = useAuth(),
    n = useNavigate(),
    r = t?.role === 'coach',
    [i, a] = useState([]),
    [o, s] = useState(60),
    [c, l] = useState(''),
    [u, d] = useState([]),
    [f, p] = useState(true),
    [m, h] = useState([]),
    [g, _] = useState(new Date()),
    [y, b] = useState(null),
    [x, S] = useState(false),
    [C, w] = useState(null),
    [T, E] = useState(false),
    [D, O] = useState(Z4)
  async function k() {
    if (!e) return
    let { data: t } = await supabase
      .from('kalender_events')
      .select('*')
      .or(`coach_id.eq.${e.id},client_id.eq.${e.id}`)
      .order('datum', {
        ascending: true,
      })
    ;(d(t ?? []), p(false))
  }
  async function A() {
    if (!e || !r) return
    let { data: t } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('coach_id', e.id)
      .eq('role', 'client')
    h(t ?? [])
  }
  async function j() {
    if (!e || r) return
    let [t, n] = await Promise.all([
      supabase.from('training_vorlagen').select('*').eq('user_id', e.id).order('created_at', {
        ascending: false,
      }),
      supabase.from('client_settings').select('notif_appointment_minutes').eq('user_id', e.id).maybeSingle(),
    ])
    ;(a(t.data ?? []), s(n.data?.notif_appointment_minutes ?? 60))
  }
  useEffect(() => {
    ;(k(), A(), j())
  }, [e, t])
  function M(e) {
    ;(w(null),
      O({
        ...Z4,
        datum: e ? format(e, 'yyyy-MM-dd') : todayISO(),
      }),
      S(true))
  }
  function N(e) {
    ;(w(e.id),
      O({
        titel: e.titel,
        datum: e.datum,
        uhrzeit: e.uhrzeit ?? '',
        dauer_min: e.dauer_min ? String(e.dauer_min) : '',
        typ: e.typ,
        notizen: e.notizen ?? '',
        client_id: e.client_id ?? '',
        vorlage_id: e.vorlage_id ?? '',
        erinnerung: e.erinnerung_min == null ? '' : String(e.erinnerung_min),
        recurring: false,
        recur_freq: 'weekly',
        recur_count: '8',
      }),
      S(true))
  }
  async function P() {
    if (!e || !D.titel) return
    E(true)
    let n = {
        coach_id: r ? e.id : (t?.coach_id ?? e.id),
        client_id: r ? D.client_id || null : e.id,
        titel: D.titel,
        uhrzeit: D.uhrzeit || null,
        dauer_min: D.dauer_min ? parseInt(D.dauer_min) : null,
        typ: D.typ,
        notizen: D.notizen || null,
        vorlage_id: !r && D.vorlage_id ? D.vorlage_id : null,
        erinnerung_min: D.erinnerung === '' ? null : parseInt(D.erinnerung),
      },
      i = ['vorlage_id', 'erinnerung_min'],
      a = async (e) => {
        let t = (t) => (e ? omitKeys(t, i) : t)
        if (C)
          return supabase
            .from('kalender_events')
            .update(
              t({
                ...n,
                datum: D.datum,
              }),
            )
            .eq('id', C)
        if (D.recurring) {
          let e = t3(D.datum, D.recur_freq, parseInt(D.recur_count) || 8)
          return supabase.from('kalender_events').insert(
            e.map((e) =>
              t({
                ...n,
                datum: e,
              }),
            ),
          )
        }
        return supabase.from('kalender_events').insert(
          t({
            ...n,
            datum: D.datum,
          }),
        )
      },
      o = await a(false)
    if (
      (isMissingColumn(o.error) &&
        ((o = await a(true)),
        o.error || l('Gespeichert. Vorlage und eigene Erinnerung brauchen noch das Datenbank-Update.')),
      o.error && l('Der Termin konnte nicht gespeichert werden. Bitte versuche es noch einmal.'),
      r && n.client_id && n.client_id !== e.id)
    ) {
      let e = C ? 'aktualisiert' : 'erstellt'
      sendPushToUser(
        n.client_id,
        `Neuer Termin ${e}`,
        `${D.titel} am ${D.datum}${D.uhrzeit ? ' um ' + D.uhrzeit : ''}`,
        'https://justinkaram14.github.io/coaching-app/#/calendar',
      )
    }
    ;(await k(), S(false), w(null), O(Z4), E(false))
  }
  async function F(e) {
    ;(await supabase.from('kalender_events').delete().eq('id', e), d((t) => t.filter((t) => t.id !== e)))
  }
  let I = startOfMonth(g),
    L = endOfMonth(g),
    ee = eachDayOfInterval({
      start: startOfWeek(I, {
        weekStartsOn: 1,
      }),
      end: endOfWeek(L, {
        weekStartsOn: 1,
      }),
    }),
    te = (t) => (r ? t.coach_id === e?.id : t.created_by === e?.id),
    ne = (e) => {
      let t = i.find((t) => t.id === e)
      return t ? e3(t) : null
    },
    re = todayISO(),
    ie = (e) => !r && !!e.vorlage_id && e.datum === re && !!i.find((t) => t.id === e.vorlage_id),
    R = (e) => u.filter((t) => isSameDay(parseISO(t.datum), e)),
    ae = y ? R(y) : [],
    oe = u.filter((e) => e.datum >= todayISO()).slice(0, 5)
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Kalender</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {r ? 'Termine für deine Klienten' : 'Deine Termine und geplantes Training'}
          </p>
        </div>
        <button onClick={() => M()} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> {r ? 'Termin erstellen' : 'Training planen'}
        </button>
      </div>
      {c && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-2xl bg-bg-elevated border border-border px-4 py-3 text-sm text-text-secondary"
        >
          <span>{c}</span>
          <button
            onClick={() => l('')}
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
              onClick={() => _(subMonths(g, 1))}
              aria-label="Vorheriger Monat"
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-text-primary">
              {format(g, 'MMMM yyyy', {
                locale: de,
              })}
            </h2>
            <button
              onClick={() => _(addMonths(g, 1))}
              aria-label="Nächster Monat"
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((e) => (
              <div className="text-center text-xs font-medium text-text-muted py-2" key={e}>
                {e}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {ee.map((e) => {
              let t = R(e),
                n = isSameDay(e, new Date()),
                r = isSameMonth(e, g),
                i = y && isSameDay(e, y)
              return (
                <div
                  onClick={() => b(i ? null : e)}
                  className={`min-h-[64px] p-1.5 rounded-lg cursor-pointer transition-all border
                    ${r ? 'text-text-primary' : 'text-text-muted'}
                    ${n ? 'bg-brand/10 border-brand/30' : i ? 'bg-bg-elevated border-border-light' : 'border-transparent hover:bg-bg-elevated'}`}
                  key={e.toISOString()}
                >
                  <div
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${n ? 'bg-primary text-white' : ''}`}
                  >
                    {format(e, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {t.slice(0, 2).map((e) => (
                      <div
                        className={`text-xs px-1 py-0.5 rounded truncate border ${X4[e.typ] || X4.sonstiges}`}
                        key={e.id}
                      >
                        {e.titel}
                      </div>
                    ))}
                    {t.length > 2 && <div className="text-xs text-text-muted px-1">+{t.length - 2}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-4">
          {y && (
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">{formatDate(y, 'EEEE, dd. MMM')}</h3>
              {ae.length === 0 ? (
                <div className="text-sm text-text-muted py-2">Keine Termine</div>
              ) : (
                <div className="space-y-2">
                  {ae.map((e) => {
                    let t = m.find((t) => t.id === e.client_id)?.name,
                      r = ne(e.vorlage_id)
                    return (
                      <div className={`p-3 rounded-lg border ${X4[e.typ] || X4.sonstiges}`} key={e.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{e.titel}</div>
                            {t && <div className="text-xs mt-0.5">👤 {t}</div>}
                            {e.uhrzeit && (
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Clock size={11} /> {e.uhrzeit.slice(0, 5)} {e.dauer_min ? `(${e.dauer_min} min)` : ''}
                              </div>
                            )}
                            {r && (
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Layers size={11} aria-hidden="true" /> Vorlage: {r}
                              </div>
                            )}
                            {e.uhrzeit && e.erinnerung_min != null && e.erinnerung_min > 0 && (
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Bell size={11} aria-hidden="true" /> {$4(e.erinnerung_min)}
                              </div>
                            )}
                            {e.notizen && <div className="text-xs mt-1">{e.notizen}</div>}
                          </div>
                          {te(e) && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => N(e)}
                                className="p-1 rounded hover:bg-black/10 transition-colors"
                                aria-label="Termin bearbeiten"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => F(e.id)}
                                className="p-1 rounded hover:bg-black/10 transition-colors"
                                aria-label="Termin löschen"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {ie(e) && (
                          <button
                            onClick={() => n(`/training?start=${e.vorlage_id}`)}
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
                onClick={() => M(y)}
                className="btn-secondary w-full mt-3 text-sm flex items-center justify-center gap-2"
              >
                <Plus size={14} /> {r ? 'Termin für diesen Tag' : 'Training für diesen Tag planen'}
              </button>
            </div>
          )}
          <div className="card">
            <h3 className="font-semibold text-text-primary mb-3">Nächste Termine</h3>
            {f ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : oe.length === 0 ? (
              <div className="text-sm text-text-muted">Keine anstehenden Termine</div>
            ) : (
              <div className="space-y-2">
                {oe.map((e) => {
                  let t = r ? m.find((t) => t.id === e.client_id)?.name : null
                  return (
                    <div className="flex items-start gap-3" key={e.id}>
                      <div className="text-center shrink-0 w-10">
                        <div className="text-xs text-text-muted">
                          {format(parseISO(e.datum), 'MMM', {
                            locale: de,
                          })}
                        </div>
                        <div className="text-lg font-bold text-text-primary leading-none">
                          {format(parseISO(e.datum), 'd')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium inline-block px-2 py-0.5 rounded-full border ${X4[e.typ]}`}
                        >
                          {e.typ}
                        </div>
                        <div className="text-sm text-text-primary mt-0.5 truncate">{e.titel}</div>
                        {t && <div className="text-xs text-text-muted">👤 {t}</div>}
                        {e.uhrzeit && <div className="text-xs text-text-muted">{e.uhrzeit.slice(0, 5)}</div>}
                        {ne(e.vorlage_id) && (
                          <div className="text-xs text-text-muted flex items-center gap-1">
                            <Layers size={11} aria-hidden="true" /> {ne(e.vorlage_id)}
                          </div>
                        )}
                      </div>
                      {ie(e) && (
                        <button
                          onClick={() => n(`/training?start=${e.vorlage_id}`)}
                          className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1.5 shrink-0"
                          aria-label={`Training starten: ${e.titel}`}
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
        open={x}
        onClose={() => {
          ;(S(false), w(null), O(Z4))
        }}
        title={C ? 'Termin bearbeiten' : r ? 'Termin erstellen' : 'Training planen'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input
              type="text"
              className="input"
              placeholder="Z.B. Pull Day Training"
              value={D.titel}
              onChange={(e) =>
                O((t) => ({
                  ...t,
                  titel: e.target.value,
                }))
              }
              autoFocus
            />
          </div>
          {r && m.length > 0 && (
            <div>
              <label className="label">Klient</label>
              <select
                className="input"
                value={D.client_id}
                onChange={(e) =>
                  O((t) => ({
                    ...t,
                    client_id: e.target.value,
                  }))
                }
              >
                <option value="">— Kein Klient (nur für mich) —</option>
                {m.map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.name ?? e.email}
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
                value={D.datum}
                onChange={(e) =>
                  O((t) => ({
                    ...t,
                    datum: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Uhrzeit</label>
              <input
                type="time"
                className="input"
                value={D.uhrzeit}
                onChange={(e) =>
                  O((t) => ({
                    ...t,
                    uhrzeit: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Typ</label>
              <select
                className="input"
                value={D.typ}
                onChange={(e) =>
                  O((t) => ({
                    ...t,
                    typ: e.target.value,
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
                value={D.dauer_min}
                onChange={(e) =>
                  O((t) => ({
                    ...t,
                    dauer_min: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          {!r && (
            <div>
              <label className="label" htmlFor="cal-vorlage">
                Trainingsvorlage
              </label>
              {i.length > 0 ? (
                <select
                  id="cal-vorlage"
                  className="input"
                  value={D.vorlage_id}
                  onChange={(e) => {
                    let t = i.find((t) => t.id === e.target.value)
                    O((n) => {
                      let r = !n.titel || i.some((e) => e3(e) === n.titel)
                      return {
                        ...n,
                        vorlage_id: e.target.value,
                        typ: t ? 'training' : n.typ,
                        titel: t && r ? e3(t) : n.titel,
                      }
                    })
                  }}
                >
                  <option value="">Keine Vorlage</option>
                  {Array.from(new Set(i.map((e) => e.plan_name ?? ''))).map((e) =>
                    e ? (
                      <optgroup label={e} key={e}>
                        {i
                          .filter((t) => t.plan_name === e)
                          .map((e) => (
                            <option value={e.id} key={e.id}>
                              {e3(e)}
                            </option>
                          ))}
                      </optgroup>
                    ) : (
                      i
                        .filter((e) => !e.plan_name)
                        .map((e) => (
                          <option value={e.id} key={e.id}>
                            {e.name}
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
                    onClick={() => n('/training?tab=vorlagen')}
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
              value={D.erinnerung}
              disabled={!D.uhrzeit}
              onChange={(e) =>
                O((t) => ({
                  ...t,
                  erinnerung: e.target.value,
                }))
              }
            >
              <option value="">{r ? 'Standard des Klienten' : `Standard (${$4(o)})`}</option>
              {Q4.map((e) => (
                <option value={e.value} key={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
            {!D.uhrzeit && (
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
              value={D.notizen}
              onChange={(e) =>
                O((t) => ({
                  ...t,
                  notizen: e.target.value,
                }))
              }
            />
          </div>
          {!C && (
            <div className="border border-border rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={D.recurring}
                  onChange={(e) =>
                    O((t) => ({
                      ...t,
                      recurring: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-brand" /> Wiederkehrender Termin
                </span>
              </label>
              {D.recurring && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Frequenz</label>
                    <select
                      className="input text-sm"
                      value={D.recur_freq}
                      onChange={(e) =>
                        O((t) => ({
                          ...t,
                          recur_freq: e.target.value,
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
                      value={D.recur_count}
                      onChange={(e) =>
                        O((t) => ({
                          ...t,
                          recur_count: e.target.value,
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
                ;(S(false), w(null), O(Z4))
              }}
              className="btn-secondary flex-1"
            >
              Abbrechen
            </button>
            <button
              onClick={P}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={T || !D.titel}
            >
              {T && <Spinner size={16} />}
              {D.recurring && !C ? `${D.recur_count}× speichern` : 'Speichern'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
