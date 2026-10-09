// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { addDays, addWeeks, format, getDay, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, ChevronUp, Layers, Plus, Trash2 } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

export const BQ = ['Kraft', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Schwimmen', 'Radfahren', 'Laufen', 'Sonstiges']
export const VQ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const HQ = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  0: 7,
}
export function UQ(e) {
  let t = e.plan_name ? `${e.plan_name} · ` : ''
  return t && e.name.startsWith(t) && e.name.length > t.length ? e.name.slice(t.length) : e.name
}
export function WQ(e) {
  return e ? e.split(',').map(Number).filter(Boolean) : []
}
export function TrainingVorlagen({ embedded: e = false, onBuildPlan: t }) {
  let { user: n } = useAuth(),
    r = useNavigate(),
    [i, a] = useState([]),
    [o, s] = useState(true),
    [c, l] = useState(false),
    [u, d] = useState(false),
    [f, p] = useState({
      name: '',
      trainingstyp: 'Kraft',
      wochentage: [],
    }),
    [m, h] = useState([
      {
        uebungsname: '',
        saetze: '',
        wdh: '',
        gewicht_kg: '',
      },
    ]),
    [g, _] = useState(null),
    [y, b] = useState('8'),
    [x, S] = useState(format(new Date(), 'yyyy-MM-dd')),
    [C, w] = useState(false),
    [T, E] = useState('')
  async function D() {
    if (!n) return
    let { data: e } = await supabase.from('training_vorlagen').select('*').eq('user_id', n.id).order('created_at', {
      ascending: false,
    })
    if (!e?.length) {
      ;(a([]), s(false))
      return
    }
    let t = e.map((e) => e.id),
      { data: r } = await supabase.from('vorlagen_uebungen').select('*').in('vorlage_id', t).order('reihenfolge'),
      i = (r ?? []).reduce(
        (e, t) => (
          e[t.vorlage_id] || (e[t.vorlage_id] = []),
          e[t.vorlage_id].push({
            id: t.id,
            uebungsname: t.uebungsname,
            wdh_text: t.wdh_text ?? null,
            saetze: String(t.saetze ?? ''),
            wdh: String(t.wdh ?? ''),
            gewicht_kg: String(t.gewicht_kg ?? ''),
          }),
          e
        ),
        {},
      )
    ;(a(
      e.map((e) => ({
        ...e,
        uebungen: i[e.id] ?? [],
      })),
    ),
      s(false))
  }
  useEffect(() => {
    D()
  }, [n])
  function O(e) {
    p((t) => ({
      ...t,
      wochentage: t.wochentage.includes(e) ? t.wochentage.filter((t) => t !== e) : [...t.wochentage, e].sort(),
    }))
  }
  function k() {
    h((e) => [
      ...e,
      {
        uebungsname: '',
        saetze: '',
        wdh: '',
        gewicht_kg: '',
      },
    ])
  }
  function A(e) {
    h((t) => t.filter((t, n) => n !== e))
  }
  function j(e, t, n) {
    h((r) => {
      let i = [...r]
      return (
        (i[e] = {
          ...i[e],
          [t]: n,
        }),
        i
      )
    })
  }
  async function M() {
    if (!n || !f.name) return
    d(true)
    let { data: e } = await supabase
      .from('training_vorlagen')
      .insert({
        user_id: n.id,
        name: f.name,
        trainingstyp: f.trainingstyp,
        wochentage: f.wochentage.join(',') || null,
      })
      .select()
      .single()
    if (e) {
      let t = m.filter((e) => e.uebungsname.trim())
      t.length &&
        (await supabase.from('vorlagen_uebungen').insert(
          t.map((t, n) => ({
            vorlage_id: e.id,
            uebungsname: t.uebungsname,
            saetze: t.saetze ? parseInt(t.saetze) : null,
            wdh: t.wdh ? parseInt(t.wdh) : null,
            gewicht_kg: t.gewicht_kg ? parseFloat(t.gewicht_kg) : null,
            reihenfolge: n,
          })),
        ))
    }
    ;(await D(),
      l(false),
      p({
        name: '',
        trainingstyp: 'Kraft',
        wochentage: [],
      }),
      h([
        {
          uebungsname: '',
          saetze: '',
          wdh: '',
          gewicht_kg: '',
        },
      ]),
      d(false))
  }
  async function N(e) {
    ;(await supabase.from('training_vorlagen').delete().eq('id', e), a((t) => t.filter((t) => t.id !== e)))
  }
  function P(e) {
    a((t) =>
      t.map((t) =>
        t.id === e
          ? {
              ...t,
              expanded: !t.expanded,
            }
          : t,
      ),
    )
  }
  async function F() {
    if (!n || !g) return
    let e = WQ(g.wochentage)
    if (!e.length) return
    w(true)
    let t = parseInt(y) || 8,
      r = [],
      i = parseISO(x)
    for (let a = 0; a < t; a++)
      for (let t of e) {
        let e = addWeeks(i, a),
          o = t - HQ[getDay(e)]
        o < 0 && (o += 7)
        let s = addDays(e, o)
        format(s, 'yyyy-MM-dd') >= x &&
          r.push({
            user_id: n.id,
            coach_id: n.id,
            client_id: n.id,
            titel: g.name,
            datum: format(s, 'yyyy-MM-dd'),
            typ: 'training',
          })
      }
    let a = r.filter((e, t, n) => n.findIndex((t) => t.datum === e.datum) === t || true)
    ;(await supabase.from('kalender_events').insert(a),
      w(false),
      _(null),
      E(`${a.length} Kalendereinträge erstellt.`),
      window.setTimeout(() => E(''), 4e3))
  }
  let I = (() => {
      let e = new Map(),
        t = []
      for (let n of i) n.plan_name ? (e.get(n.plan_name) ?? e.set(n.plan_name, []).get(n.plan_name)).push(n) : t.push(n)
      for (let t of e.values()) t.sort((e, t) => (e.plan_reihenfolge ?? 0) - (t.plan_reihenfolge ?? 0))
      return {
        plans: [...e],
        single: t,
      }
    })(),
    L = (e, t) => {
      let n = WQ(e.wochentage)
      return (
        <div
          className="card enter"
          style={{
            '--d': 60 + t * 55,
          }}
          key={e.id}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{UQ(e)}</div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-text-muted">
                  {e.trainingstyp} · {e.uebungen?.length ?? 0} Übungen
                </span>
                {n.length > 0 && (
                  <div className="flex gap-1">
                    {VQ.map((e, t) => (
                      <span
                        className={`text-xs w-5 h-5 rounded flex items-center justify-center font-medium ${n.includes(t + 1) ? 'bg-brand/20 text-brand' : 'text-text-muted'}`}
                        key={e}
                      >
                        {e[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {n.length > 0 && (
                <button
                  onClick={() => _(e)}
                  className="p-1.5 rounded-lg hover:bg-success/10 hover:text-success text-text-muted transition-colors"
                  title="Im Kalender eintragen"
                  aria-label="Im Kalender eintragen"
                >
                  <CalendarDays size={16} />
                </button>
              )}
              <button
                onClick={() => P(e.id)}
                className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                aria-label={e.expanded ? 'Übungen ausblenden' : 'Übungen anzeigen'}
              >
                {e.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                onClick={() => N(e.id)}
                className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors"
                aria-label="Vorlage löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {e.expanded && (e.uebungen?.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {e.uebungen.map((e, t) => (
                <div
                  className="flex items-center justify-between gap-3 text-sm p-2.5 rounded-xl bg-bg-elevated"
                  key={t}
                >
                  <span className="font-medium text-text-primary min-w-0 truncate">{e.uebungsname}</span>
                  <span className="text-text-secondary text-xs whitespace-nowrap">
                    {e.saetze && (e.wdh_text || e.wdh) ? `${e.saetze}×${e.wdh_text || e.wdh}` : ''}
                    {e.gewicht_kg ? ` @ ${e.gewicht_kg}kg` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {e ? (
          <p className="text-text-secondary text-sm">Deine Trainingstage zum Starten und für den Kalender.</p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => r('/training')}
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Zurück"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="section-title text-2xl">Trainingsvorlagen</h1>
              <p className="text-text-secondary text-sm mt-0.5">Push Day, Pull Day, Legs…</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {t && (
            <button onClick={t} className="btn-secondary flex items-center gap-2 text-sm">
              <Layers size={16} /> Eigenen Plan bauen
            </button>
          )}
          <button onClick={() => l(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Vorlage erstellen
          </button>
        </div>
      </div>
      {T && (
        <div className="card !p-4 border-success/40 bg-success/5 text-sm text-text-primary enter" role="status">
          {T}
        </div>
      )}
      <div className="space-y-6">
        {o ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : i.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={BookOpen}
              title="Noch keine Vorlagen"
              description="Erstelle eine Vorlage für deinen typischen Trainingstag oder baue dir einen kompletten Plan aus dem Übungspool."
              action={
                t ? (
                  <button onClick={t} className="btn-primary flex items-center gap-2 mx-auto">
                    <Layers size={16} /> Eigenen Plan bauen
                  </button>
                ) : (
                  <button onClick={() => l(true)} className="btn-primary flex items-center gap-2 mx-auto">
                    <Plus size={16} /> Erste Vorlage erstellen
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            {I.plans.map(([e, t]) => (
              <section className="space-y-3" aria-label={`Plan ${e}`} key={e}>
                <div className="flex items-center gap-2 px-1">
                  <Layers size={16} className="text-brand" aria-hidden="true" />
                  <h2 className="section-title text-base">{e}</h2>
                  <span className="text-xs text-text-muted">
                    {t.length} {t.length === 1 ? 'Tag' : 'Tage'}
                  </span>
                </div>
                {t.map((e, t) => L(e, t))}
              </section>
            ))}
            {I.single.length > 0 && (
              <section className="space-y-3" aria-label="Einzelne Vorlagen">
                {I.plans.length > 0 && <h2 className="section-title text-base px-1">Einzelne Vorlagen</h2>}
                {I.single.map((e, t) => L(e, t))}
              </section>
            )}
          </>
        )}
      </div>
      <Modal open={c} onClose={() => l(false)} title="Vorlage erstellen" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                className="input"
                placeholder="z.B. Push Day"
                value={f.name}
                onChange={(e) =>
                  p((t) => ({
                    ...t,
                    name: e.target.value,
                  }))
                }
                autoFocus
              />
            </div>
            <div>
              <label className="label">Typ</label>
              <select
                className="input"
                value={f.trainingstyp}
                onChange={(e) =>
                  p((t) => ({
                    ...t,
                    trainingstyp: e.target.value,
                  }))
                }
              >
                {BQ.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Wiederkehrende Tage (optional)</label>
            <div className="flex gap-2">
              {VQ.map((e, t) => (
                <button
                  type="button"
                  onClick={() => O(t + 1)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${f.wochentage.includes(t + 1) ? 'bg-brand/20 text-brand border-brand/40' : 'bg-bg-elevated text-text-muted border-border hover:border-border-light'}`}
                  key={e}
                >
                  {e}
                </button>
              ))}
            </div>
            {f.wochentage.length > 0 && (
              <p className="text-xs text-text-muted mt-1.5">
                Jede Woche: {f.wochentage.map((e) => VQ[e - 1]).join(', ')} — du kannst diese Tage dann automatisch im
                Kalender eintragen lassen.
              </p>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Übungen</div>
            <div className="space-y-3">
              {m.map((e, t) => (
                <div className="p-3 bg-bg-elevated rounded-lg space-y-2" key={t}>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm py-2"
                      placeholder="Übungsname (z.B. Bankdrücken)"
                      value={e.uebungsname}
                      onChange={(e) => j(t, 'uebungsname', e.target.value)}
                    />
                    <button
                      onClick={() => A(t)}
                      className="p-2 rounded hover:bg-danger/10 hover:text-danger text-text-muted"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Sätze</label>
                      <input
                        type="number"
                        className="input text-sm py-2"
                        placeholder="4"
                        value={e.saetze}
                        onChange={(e) => j(t, 'saetze', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Wdh.</label>
                      <input
                        type="number"
                        className="input text-sm py-2"
                        placeholder="8"
                        value={e.wdh}
                        onChange={(e) => j(t, 'wdh', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Gewicht (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="input text-sm py-2"
                        placeholder="80"
                        value={e.gewicht_kg}
                        onChange={(e) => j(t, 'gewicht_kg', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={k} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Plus size={14} /> Übung hinzufügen
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={() => l(false)} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button
              onClick={M}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={u || !f.name}
            >
              {u && <Spinner size={16} />}Vorlage speichern
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={!!g} onClose={() => _(null)} title="Im Kalender eintragen">
        {g && (
          <div className="space-y-4">
            <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl">
              <div className="font-medium text-text-primary">{g.name}</div>
              <div className="text-xs text-text-muted mt-0.5">
                Tage:{' '}
                {WQ(g.wochentage)
                  .map((e) => VQ[e - 1])
                  .join(', ')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Startdatum</label>
                <input type="date" className="input" value={x} onChange={(e) => S(e.target.value)} />
              </div>
              <div>
                <label className="label">Wie viele Wochen?</label>
                <input type="number" className="input" min="1" max="52" value={y} onChange={(e) => b(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Es werden ca. {WQ(g.wochentage).length * (parseInt(y) || 8)} Kalendereinträge erstellt. Jeder kann danach
              einzeln bearbeitet oder gelöscht werden.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => _(null)} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button onClick={F} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={C}>
                {C && <Spinner size={16} />}Einträge erstellen
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
