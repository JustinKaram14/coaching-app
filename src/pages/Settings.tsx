// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { berechneTDEE, bmi, bmiCategory, cn, generateCode } from '../lib/utils'
import { planAppointments, planNotifications } from '../lib/notificationPlan'
import {
  Bell,
  BellRing,
  Calculator,
  Check,
  CircleCheckBig,
  Copy,
  Droplets,
  FileText,
  Flame,
  Key,
  MonitorSmartphone,
  Moon,
  Plus,
  Save,
  SettingsIcon,
  Share,
  Shield,
  Smartphone,
  Sparkles,
  SquarePlus,
  Sun,
  Trash2,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { disablePush, enablePush, getPushState, listDevices, removeDevice, sendPushToUser } from '../lib/push'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { Link } from 'react-router-dom'

export function R3_({ checked: e, onChange: t, label: n, disabled: r }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={e}
      aria-label={n}
      disabled={r}
      onClick={() => t(!e)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
        e ? 'bg-primary ring-1 ring-brand/40' : 'bg-border-input',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
          e ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
export const b3 = {
  weight: false,
  sleep: false,
  training: false,
  mealsMain: 0,
  supplementsTotal: 0,
  supplementsTaken: 0,
  waterMl: 0,
}
export const x3 = {
  timezone: 'Europe/Berlin',
  notif_daily_reminder: true,
  notif_reminder_time: '20:00',
  wasser_ziel_ml: 2500,
  notif_max_per_day: 3,
}
export const S3 = ''
export function C3(
  e,
  t,
  n = {
    days: 0,
    includesToday: false,
  },
) {
  return planNotifications({
    now: new Date(e),
    settings: x3,
    facts: {
      ...b3,
      ...t,
    },
    streak: n,
    sent: [],
    appUrl: S3,
  })[0]
}
export function w3() {
  let e = [
      ((e) =>
        e && {
          id: 'missing',
          type: 'missing',
          c: e,
        })(
        C3(
          '2026-07-01T18:05:00Z',
          {},
          {
            days: 12,
            includesToday: false,
          },
        ),
      ),
      ((e) =>
        e && {
          id: 'partial',
          type: 'missing',
          c: e,
        })(
        C3('2026-07-01T18:05:00Z', {
          weight: true,
          mealsMain: 2,
        }),
      ),
      ((e) =>
        e && {
          id: 'praise',
          type: 'praise',
          c: e,
        })(
        C3('2026-07-01T10:30:00Z', {
          training: true,
          trainingMin: 45,
          trainingType: 'Krafttraining',
          trainingAt: '2026-07-01T09:00:00Z',
        }),
      ),
      ((e) =>
        e && {
          id: 'streak',
          type: 'streak',
          c: e,
        })(
        C3(
          '2026-07-01T10:00:00Z',
          {
            weight: true,
          },
          {
            days: 7,
            includesToday: true,
          },
        ),
      ),
      ((e) =>
        e && {
          id: 'water',
          type: 'water',
          c: e,
        })(
        C3('2026-07-01T14:00:00Z', {
          waterMl: 600,
        }),
      ),
    ],
    t = planAppointments(
      [
        {
          id: 'x',
          titel: 'Upper Body',
          datum: '2026-07-01',
          uhrzeit: '17:30',
          vorlage_name: 'Push-Tag',
        },
      ],
      new Date('2026-07-01T14:40:00Z'),
      x3,
      [],
      S3,
    )[0],
    n = e.filter((e) => !!e)
  return (
    t &&
      n.push({
        id: 'appointment',
        type: 'appointment',
        c: t,
      }),
    n
  )
}
export function T3({ c: e, dim: t }) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-2xl bg-bg-elevated border border-border p-3 transition-opacity duration-300',
        t && 'opacity-45',
      )}
    >
      <span
        className="w-9 h-9 rounded-xl bg-primary ring-1 ring-inset ring-brand/30 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Zap size={16} className="text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-text-muted">
          <span>HLX TOGETHER</span>
          <span>jetzt</span>
        </div>
        <div className="text-sm font-semibold text-text-primary leading-snug">{e.title}</div>
        <div className="text-sm text-text-secondary leading-snug">{e.body}</div>
      </div>
    </div>
  )
}
export function E3({ icon: e, title: t, hint: n, children: r }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-t border-border first:border-t-0">
      {e && (
        <span
          className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {e}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-text-primary">{t}</div>
        <div className="text-xs text-text-secondary leading-snug">{n}</div>
      </div>
      {r}
    </div>
  )
}
export const D3 = [
  {
    value: 15,
    label: '15 Minuten vorher',
  },
  {
    value: 30,
    label: '30 Minuten vorher',
  },
  {
    value: 60,
    label: '1 Stunde vorher',
  },
  {
    value: 120,
    label: '2 Stunden vorher',
  },
  {
    value: 1440,
    label: '1 Tag vorher',
  },
]
export function O3({ userId: e, isCoach: t, settings: n, onPatch: r }) {
  let [i, a] = useState('loading'),
    [o, s] = useState(false),
    [c, l] = useState(null),
    [u, d] = useState([]),
    [f, p] = useState(false),
    m = useMemo(w3, []),
    h = useCallback(async () => {
      try {
        a(await getPushState())
      } catch {
        a('unsupported')
      }
      try {
        d(await listDevices(e))
      } catch {}
    }, [e])
  useEffect(() => {
    h()
  }, [h])
  async function g(t) {
    ;(r(t), p(false))
    let { error: n } = await supabase.from('client_settings').update(t).eq('user_id', e)
    n && p(true)
  }
  async function _() {
    ;(s(true), l(null))
    let t = await enablePush(e)
    ;(s(false),
      l(
        t === 'ok'
          ? {
              tone: 'ok',
              text: 'Fertig: Dieses Gerät bekommt jetzt Nachrichten.',
            }
          : t === 'denied'
            ? {
                tone: 'warn',
                text: 'Die Erlaubnis wurde verweigert. Du kannst sie in den Einstellungen deines Geräts oder Browsers wieder erlauben.',
              }
            : t === 'unsupported'
              ? {
                  tone: 'warn',
                  text: 'Dieses Gerät oder dieser Browser unterstützt keine Push-Nachrichten.',
                }
              : {
                  tone: 'warn',
                  text: 'Das hat nicht geklappt. Lade die App neu und versuche es noch einmal.',
                },
      ),
      await h())
  }
  async function y() {
    ;(s(true), l(null), await disablePush(e), s(false), await h())
  }
  async function b() {
    ;(s(true), l(null))
    let { data: t, error: n } = await sendPushToUser(e, 'Test erfolgreich', 'So meldet sich HLX Together bei dir.')
    ;(s(false),
      !n && t && (t.sent ?? 0) > 0
        ? l({
            tone: 'ok',
            text: `Test gesendet an ${t.sent} Gerät${t.sent === 1 ? '' : 'e'}. Es sollte gleich ankommen.`,
          })
        : l({
            tone: 'warn',
            text: 'Der Test konnte nicht zugestellt werden. Prüfe, ob dieses Gerät aktiviert ist.',
          }))
  }
  async function x(e) {
    ;(await removeDevice(e.id), await h())
  }
  let S = n.notif_daily_reminder !== false,
    C = (e) => n[e] !== false,
    w = n.notif_max_per_day ?? 3,
    T = n.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    E = (e) =>
      e === 'missing'
        ? !S
        : e === 'praise'
          ? !C('notif_praise')
          : e === 'streak'
            ? !C('notif_streak')
            : e === 'water'
              ? !C('notif_water')
              : n.notif_appointments === false
  return (
    <div className="card space-y-5">
      <h2 className="font-semibold text-text-primary flex items-center gap-2">
        <Bell size={18} className="text-brand" aria-hidden="true" /> Benachrichtigungen
      </h2>
      <div className="rounded-2xl bg-bg-elevated border border-border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
              i === 'on' ? 'bg-success/15 text-success' : 'bg-brand/10 text-brand',
            )}
            aria-hidden="true"
          >
            {i === 'on' ? <BellRing size={20} /> : <Smartphone size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-text-primary">
              {i === 'on' ? 'Auf diesem Gerät aktiv' : i === 'loading' ? 'Prüfe Gerät …' : 'Auf diesem Gerät noch aus'}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
              {i === 'on' && 'Du bekommst die gewählten Nachrichten auch bei geschlossener App.'}
              {i === 'off' &&
                'Aktiviere Nachrichten, damit dich HLX Together erinnert und lobt. Die Erlaubnis fragt dein Gerät einmalig ab.'}
              {i === 'denied' &&
                'Nachrichten sind für diese App blockiert. Erlaube sie in den Einstellungen deines Geräts oder Browsers und lade die App neu.'}
              {i === 'unsupported' &&
                'Dieser Browser unterstützt keine Push-Nachrichten. Chrome, Edge, Firefox und Safari (macOS 13 oder neuer) können es.'}
              {i === 'ios-old' &&
                'Push-Nachrichten brauchen auf iPhone und iPad mindestens iOS 16.4. Bitte aktualisiere dein Gerät.'}
              {i === 'ios-install' &&
                'Auf iPhone und iPad funktionieren Nachrichten, sobald die App auf dem Home-Bildschirm liegt:'}
            </p>
          </div>
        </div>
        {i === 'ios-install' && (
          <ol
            className="space-y-2 text-sm text-text-secondary"
            aria-label="So installierst du die App auf iPhone und iPad"
          >
            {[
              {
                icon: <Share size={16} />,
                text: (
                  <>
                    In Safari unten auf <strong className="text-text-primary">Teilen</strong> tippen
                  </>
                ),
              },
              {
                icon: <SquarePlus size={16} />,
                text: (
                  <>
                    <strong className="text-text-primary">Zum Home-Bildschirm</strong> wählen und bestätigen
                  </>
                ),
              },
              {
                icon: <Smartphone size={16} />,
                text: (
                  <>
                    App <strong className="text-text-primary">vom Home-Bildschirm</strong> öffnen und hier „Aktivieren“
                    tippen
                  </>
                ),
              },
            ].map((e, t) => (
              <li className="flex items-center gap-3" key={t}>
                <span
                  className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {e.icon}
                </span>
                <span>{e.text}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-2">
          {(i === 'off' || i === 'denied') && (
            <button
              onClick={_}
              disabled={o || i === 'denied'}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {o ? <Spinner size={16} /> : <Bell size={16} aria-hidden="true" />} Auf diesem Gerät aktivieren
            </button>
          )}
          {i === 'on' && (
            <>
              <button onClick={b} disabled={o} className="btn-secondary text-sm flex items-center gap-2">
                {o ? <Spinner size={16} /> : <Sparkles size={16} aria-hidden="true" />} Test senden
              </button>
              <button onClick={y} disabled={o} className="btn-secondary text-sm">
                Auf diesem Gerät ausschalten
              </button>
            </>
          )}
        </div>
        {c && (
          <p
            role="status"
            className={cn(
              'text-xs leading-relaxed flex items-start gap-1.5',
              c.tone === 'ok' ? 'text-success' : 'text-warning',
            )}
          >
            {c.tone === 'ok' && <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
            {c.text}
          </p>
        )}
        {u.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs font-semibold text-text-secondary mb-2">Angemeldete Geräte</div>
            <ul className="space-y-1.5">
              {u.map((e) => (
                <li className="flex items-center gap-2.5 text-sm" key={e.id}>
                  <MonitorSmartphone size={16} className="text-text-muted shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0 truncate text-text-primary">{e.device_label ?? 'Gerät'}</span>
                  {e.thisDevice && <span className="badge bg-success/15 text-success">Dieses Gerät</span>}
                  {!e.thisDevice && (
                    <button
                      onClick={() => x(e)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      aria-label={`${e.device_label ?? 'Gerät'} entfernen`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {!t && (
        <>
          <div>
            <E3
              icon={<Bell size={18} />}
              title="Abendliche Erinnerung"
              hint="„Heute noch nichts eingetragen“, wenn dir noch etwas fehlt"
            >
              <R3_
                checked={S}
                onChange={(e) =>
                  g({
                    notif_daily_reminder: e,
                  })
                }
                label="Abendliche Erinnerung"
              />
            </E3>
            {S && (
              <div className="pb-3.5 -mt-1 pl-12">
                <label htmlFor="notif-time" className="label !mb-1 !text-xs">
                  Uhrzeit (deine Ortszeit)
                </label>
                <input
                  id="notif-time"
                  type="time"
                  className="input !w-40"
                  value={n.notif_reminder_time ?? '20:00'}
                  onChange={(e) =>
                    g({
                      notif_reminder_time: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Zeitzone: {T.replace('_', ' ')} (wird automatisch erkannt)
                </p>
              </div>
            )}
            <E3
              icon={<Sparkles size={18} />}
              title="Lob für Erledigtes"
              hint="Zum Beispiel nach dem Training: „Heute schon fleißig trainiert“"
            >
              <R3_
                checked={C('notif_praise')}
                onChange={(e) =>
                  g({
                    notif_praise: e,
                  })
                }
                label="Lob für Erledigtes"
              />
            </E3>
            <E3
              icon={<Flame size={18} />}
              title="Serien und Meilensteine"
              hint="Wenn du 3, 7, 14, 30 … Tage in Folge dabei bist"
            >
              <R3_
                checked={C('notif_streak')}
                onChange={(e) =>
                  g({
                    notif_streak: e,
                  })
                }
                label="Serien und Meilensteine"
              />
            </E3>
            <E3
              icon={<Droplets size={18} />}
              title="Wasser"
              hint="Ein sanfter Hinweis am Nachmittag, wenn du erst wenig getrunken hast"
            >
              <R3_
                checked={C('notif_water')}
                onChange={(e) =>
                  g({
                    notif_water: e,
                  })
                }
                label="Wasser-Erinnerung"
              />
            </E3>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-text-primary">Höchstens pro Tag</div>
            <p className="text-xs text-text-secondary">
              Empfohlen sind 3. Nie vor 8 Uhr und nach 22 Uhr, Terminerinnerungen zählen nicht mit.
            </p>
            <SegmentedTabs
              tabs={[
                {
                  key: '1',
                  label: '1',
                },
                {
                  key: '2',
                  label: '2',
                },
                {
                  key: '3',
                  label: '3',
                },
              ]}
              value={String(w)}
              onChange={(e) =>
                g({
                  notif_max_per_day: Number(e),
                })
              }
              label="Höchstzahl Nachrichten pro Tag"
              className="max-w-xs"
            />
          </div>
          <div>
            <E3
              icon={<Check size={18} />}
              title="Termin-Erinnerungen"
              hint="Vor jedem Termin im Kalender, bei jedem Termin einzeln einstellbar"
            >
              <R3_
                checked={n.notif_appointments !== false}
                onChange={(e) =>
                  g({
                    notif_appointments: e,
                  })
                }
                label="Termin-Erinnerungen"
              />
            </E3>
            {n.notif_appointments !== false && (
              <div className="pb-1 pl-12">
                <label htmlFor="notif-lead" className="label !mb-1 !text-xs">
                  Standard für neue Termine
                </label>
                <select
                  id="notif-lead"
                  className="input !w-auto"
                  value={n.notif_appointment_minutes ?? 60}
                  onChange={(e) =>
                    g({
                      notif_appointment_minutes: Number(e.target.value),
                    })
                  }
                >
                  {D3.map((e) => (
                    <option value={e.value} key={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {f && (
            <p role="alert" className="text-xs text-warning">
              Das konnte nicht gespeichert werden. Wenn das öfter passiert, fehlt in der Datenbank noch das Update für
              Benachrichtigungen.
            </p>
          )}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-text-primary">So melden wir uns bei dir</div>
            <p className="text-xs text-text-secondary">
              Ruhig, freundlich und nur, wenn es etwas bringt. Ausgeschaltete Arten erscheinen blass.
            </p>
            <div className="space-y-2">
              {m.map((e) => (
                <T3 c={e.c} dim={E(e.type)} key={e.id} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
export const k3 = ['timezone', 'notif_praise', 'notif_streak', 'notif_water', 'notif_max_per_day']
export function Settings() {
  let { user: e, profile: t, refreshProfile: n } = useAuth(),
    { theme: r, setTheme: i } = useTheme(),
    [a, o] = useState({}),
    [s, c] = useState([]),
    [l, u] = useState(true),
    [d, f] = useState(false),
    [p, m] = useState(false),
    [h, g] = useState(t?.name ?? ''),
    [_, y] = useState(false),
    [b, x] = useState(''),
    [S, C] = useState(null),
    w = t?.role === 'coach',
    [T, E] = useState(null)
  async function D() {
    if (!e) return
    let [t, n] = await Promise.all([
      supabase.from('client_settings').select('*').eq('user_id', e.id).single(),
      w
        ? Promise.resolve({
            data: null,
          })
        : supabase.from('coach_plans').select('*').eq('client_id', e.id).maybeSingle(),
    ])
    if ((t.data && o(t.data), E(n.data ?? null), w)) {
      let t = await supabase.from('invite_codes').select('*').eq('coach_id', e.id).order('created_at', {
        ascending: false,
      })
      t.data && c(t.data)
    }
    u(false)
  }
  ;(useEffect(() => {
    D()
  }, [e]),
    useEffect(() => {
      g(t?.name ?? '')
    }, [t]))
  async function O() {
    if (!e) return
    f(true)
    let [, t] = await Promise.all([
      supabase
        .from('profiles')
        .update({
          name: h,
        })
        .eq('id', e.id),
      supabase.from('client_settings').upsert(
        {
          ...a,
          user_id: e.id,
        },
        {
          onConflict: 'user_id',
        },
      ),
    ])
    if (t.error && /column|schema cache/i.test(t.error.message)) {
      let t = Object.fromEntries(Object.entries(a).filter(([e]) => !k3.includes(e)))
      await supabase.from('client_settings').upsert(
        {
          ...t,
          user_id: e.id,
        },
        {
          onConflict: 'user_id',
        },
      )
    }
    ;(await n(), f(false), m(true), setTimeout(() => m(false), 2e3))
  }
  async function k() {
    !e ||
      b !== 'LÖSCHEN' ||
      (y(true), await supabase.from('profiles').delete().eq('id', e.id), await supabase.auth.signOut())
  }
  async function A() {
    if (!e) return
    let t = generateCode(),
      n = new Date()
    ;(n.setDate(n.getDate() + 30),
      await supabase.from('invite_codes').insert({
        code: t,
        coach_id: e.id,
        used_by: null,
        expires_at: n.toISOString(),
      }),
      await D())
  }
  async function j(e) {
    ;(await supabase.from('invite_codes').delete().eq('id', e), c((t) => t.filter((t) => t.id !== e)))
  }
  function M(e) {
    navigator.clipboard.writeText(e)
  }
  function N() {
    let e = a.startgewicht,
      t = a.koerpergroesse,
      n = a.alter_jahre
    if (!e || !t || !n) return
    let r = berechneTDEE(
      e,
      t,
      n,
      a.aktivitaetsniveau ?? 'maessig_aktiv',
      a.sport_ziel ?? 'halten',
      a.ernaehrungs_typ ?? 'standard',
    )
    ;(C(r),
      o((e) => ({
        ...e,
        kalorie_tagesziel: r.kalorien,
        protein_ziel: r.protein,
        karbs_ziel: r.karbs,
        fett_ziel: r.fett,
      })))
  }
  let P = a.startgewicht && a.koerpergroesse ? bmi(a.startgewicht, a.koerpergroesse) : null
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="section-title text-2xl">Einstellungen</h1>
        <p className="text-text-secondary text-sm mt-0.5">{'Persönliche Daten & Coaching-Ziele'}</p>
      </div>
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <SettingsIcon size={18} className="text-brand" /> Profil
        </h2>
        <div>
          <label className="label">Name</label>
          <input type="text" className="input" value={h} onChange={(e) => g(e.target.value)} placeholder="Dein Name" />
        </div>
        <div>
          <label className="label">E-Mail</label>
          <input
            type="email"
            aria-label="E-Mail-Adresse"
            className="input opacity-60 cursor-not-allowed"
            value={e?.email ?? ''}
            disabled
          />
        </div>
        <div>
          <label className="label">Rolle</label>
          <div className="input text-text-secondary cursor-default capitalize">
            {t?.role === 'coach' ? 'Coach' : 'Athlet / Klient'}
          </div>
        </div>
      </div>
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          {r === 'dark' ? <Moon size={18} className="text-brand" /> : <Sun size={18} className="text-brand" />}{' '}
          Darstellung
        </h2>
        <div
          role="group"
          aria-label="Farbschema"
          className="grid grid-cols-2 gap-2 p-1 rounded-full bg-bg-elevated border border-border"
        >
          {[
            ['dark', 'Dunkel', Moon],
            ['light', 'Hell', Sun],
          ].map(([e, t, N_]) => (
            <button
              type="button"
              aria-pressed={r === e}
              onClick={() => i(e)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${r === e ? 'bg-primary text-white ring-1 ring-inset ring-brand/30' : 'text-text-secondary hover:text-text-primary'}`}
              key={e}
            >
              <N_ size={16} /> {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Standard ist der dunkle Modus. Die Auswahl wird auf diesem Gerät gespeichert.
        </p>
      </div>
      {!w && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-text-primary">{'Ziele & Körperdaten'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Startgewicht (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="75.0"
                value={a.startgewicht ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    startgewicht: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Zielgewicht (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="70.0"
                value={a.zielgewicht ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    zielgewicht: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Körpergröße (cm)</label>
              <input
                type="number"
                className="input"
                placeholder="180"
                value={a.koerpergroesse ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    koerpergroesse: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Alter (Jahre)</label>
              <input
                type="number"
                className="input"
                placeholder="30"
                value={a.alter_jahre ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    alter_jahre: parseInt(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Kalorienziel (kcal/Tag)</label>
              <input
                type="number"
                className="input"
                placeholder="2000"
                value={a.kalorie_tagesziel ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    kalorie_tagesziel: parseInt(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Trainings/Woche (Ziel)</label>
              <input
                type="number"
                className="input"
                placeholder="4"
                value={a.trainings_pro_woche ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    trainings_pro_woche: parseInt(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Schlafziel (Stunden)</label>
              <input
                type="number"
                step="0.5"
                className="input"
                placeholder="8"
                value={a.schlaf_ziel ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    schlaf_ziel: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Wasserziel (ml/Tag)</label>
              <input
                type="number"
                className="input"
                placeholder="2000"
                value={a.wasser_ziel_ml ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    wasser_ziel_ml: parseInt(e.target.value) || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Startdatum Coaching</label>
              <input
                type="date"
                aria-label="Startdatum"
                className="input"
                value={a.startdatum ?? ''}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    startdatum: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          {P && (
            <div className="p-4 bg-bg-elevated rounded-xl border border-border">
              <div className="text-sm text-text-muted mb-1">BMI (berechnet)</div>
              <div className="text-2xl font-bold text-text-primary">{P}</div>
              <div className="text-sm text-text-secondary">{bmiCategory(P)}</div>
            </div>
          )}
        </div>
      )}
      {!w && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Calculator size={18} className="text-brand" /> Ernährungsberechnung
          </h2>
          <p className="text-xs text-text-muted -mt-2">
            {'Wähle deine Ziele — die Kalorien & Makros werden automatisch berechnet.'}
          </p>
          <div className="space-y-2">
            <label className="label">Aktivitätsniveau</label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                ['sitzend', 'Kaum Bewegung', 'Bürojob, keine Sport'],
                ['leicht_aktiv', 'Leicht aktiv', '1–2× Sport/Woche'],
                ['maessig_aktiv', 'Moderat aktiv', '3–5× Sport/Woche'],
                ['sehr_aktiv', 'Sehr aktiv', '6–7× Sport/Woche'],
                ['extrem_aktiv', 'Extrem aktiv', 'Profisportler / körperl. Arbeit'],
              ].map(([e, t, n]) => (
                <button
                  type="button"
                  onClick={() =>
                    o((t) => ({
                      ...t,
                      aktivitaetsniveau: e,
                    }))
                  }
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${(a.aktivitaetsniveau ?? 'maessig_aktiv') === e ? 'border-brand bg-brand/10 text-text-primary' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={e}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 shrink-0 ${(a.aktivitaetsniveau ?? 'maessig_aktiv') === e ? 'border-brand bg-brand' : 'border-border'}`}
                  />
                  <div>
                    <div className="text-sm font-medium">{t}</div>
                    <div className="text-xs text-text-muted">{n}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">Mein Ziel</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['abnehmen', 'Abnehmen', '−400 kcal'],
                ['halten', 'Halten', '±0 kcal'],
                ['zunehmen', 'Zunehmen', '+350 kcal'],
              ].map(([e, t, n]) => (
                <button
                  type="button"
                  onClick={() =>
                    o((t) => ({
                      ...t,
                      sport_ziel: e,
                    }))
                  }
                  className={`py-3 rounded-xl border text-center transition-colors ${(a.sport_ziel ?? 'halten') === e ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={e}
                >
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-text-muted mt-0.5">{n}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">Ernährungsweise</label>
            <div className="flex flex-wrap gap-2">
              {[
                ['standard', 'Ausgewogen'],
                ['low_carb', 'Low Carb'],
                ['high_protein', 'High Protein'],
                ['vegan', 'Vegan'],
                ['vegetarisch', 'Vegetarisch'],
                ['pescetarisch', 'Pescetarisch'],
              ].map(([e, t]) => (
                <button
                  type="button"
                  onClick={() =>
                    o((t) => ({
                      ...t,
                      ernaehrungs_typ: e,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${(a.ernaehrungs_typ ?? 'standard') === e ? 'bg-primary border-brand text-white' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={e}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">Intervallfasten</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['kein', 'Kein Fasten', 'Normale Mahlzeitenverteilung'],
                ['12:12', '12:12', '12h fasten · 12h essen'],
                ['14:10', '14:10', '14h fasten · 10h essen'],
                ['16:8', '16:8', '16h fasten · 8h essen'],
              ].map(([e, t, n]) => (
                <button
                  type="button"
                  onClick={() =>
                    o((t) => ({
                      ...t,
                      intervall_fasten: e,
                    }))
                  }
                  className={`px-3 py-2.5 rounded-xl border text-left transition-colors ${(a.intervall_fasten ?? 'kein') === e ? 'border-brand bg-brand/10 text-text-primary' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={e}
                >
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-text-muted">{n}</div>
                </button>
              ))}
            </div>
          </div>
          {a.startgewicht && a.koerpergroesse && a.alter_jahre ? (
            <button type="button" onClick={N} className="btn-primary flex items-center gap-2 w-full justify-center">
              <Zap size={16} />
              {' Ziele berechnen & übernehmen'}
            </button>
          ) : (
            <p className="text-xs text-text-muted text-center">
              {'Bitte zuerst Gewicht, Größe und Alter unter «Ziele & Körperdaten» eintragen.'}
            </p>
          )}
          {S && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/20 space-y-1.5">
              <div className="text-xs font-semibold text-success flex items-center gap-1">
                <CircleCheckBig size={13} />
                {' Berechnet & gesetzt'}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="font-bold text-text-primary text-base">{S.kalorien}</div>
                  <div className="text-text-muted">kcal</div>
                </div>
                <div>
                  <div className="font-bold text-text-primary text-base">{S.protein}g</div>
                  <div className="text-text-muted">Protein</div>
                </div>
                <div>
                  <div className="font-bold text-text-primary text-base">{S.karbs}g</div>
                  <div className="text-text-muted">Karbs</div>
                </div>
                <div>
                  <div className="font-bold text-text-primary text-base">{S.fett}g</div>
                  <div className="text-text-muted">Fett</div>
                </div>
              </div>
              <p className="text-xs text-text-muted">Klicke «Einstellungen speichern» um die Werte zu sichern.</p>
            </div>
          )}
        </div>
      )}
      {!w && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-text-primary">Körperfotos</h2>
          <label className="flex items-center justify-between cursor-pointer gap-4">
            <div>
              <div className="text-sm font-medium text-text-primary">Coach darf Körperfotos sehen</div>
              <div className="text-xs text-text-muted mt-0.5">
                Dein Coach kann deine Körperfotos im Gewichtsverlauf einsehen
              </div>
            </div>
            <div className="relative shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={!!a.coach_foto_freigabe}
                onChange={(e) =>
                  o((t) => ({
                    ...t,
                    coach_foto_freigabe: e.target.checked,
                  }))
                }
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${a.coach_foto_freigabe ? 'bg-primary ring-1 ring-brand/40' : 'bg-border-input'}`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${a.coach_foto_freigabe ? 'translate-x-5' : ''}`}
              />
            </div>
          </label>
        </div>
      )}
      {!w && T && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <FileText size={18} className="text-brand" /> Mein Masterplan
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{T.pdf_name ?? 'Coaching-Plan'}</div>
              <div className="text-xs text-text-muted mt-0.5">
                Erstellt: {T.angewendet_am ? new Date(T.angewendet_am).toLocaleDateString('de') : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
      {w && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Key size={18} className="text-brand" /> Einladungscodes
            </h2>
            <button onClick={A} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Code erstellen
            </button>
          </div>
          {l ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : s.length === 0 ? (
            <p className="text-sm text-text-muted">Noch keine Codes erstellt.</p>
          ) : (
            <div className="space-y-2">
              {s.map((e) => (
                <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl border border-border" key={e.id}>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-text-primary tracking-widest">{e.code}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {e.used_by ? (
                        <span className="text-success">Verwendet</span>
                      ) : e.expires_at ? (
                        <span>Läuft ab: {new Date(e.expires_at).toLocaleDateString('de')}</span>
                      ) : (
                        'Unbegrenzt gültig'
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => M(e.code)}
                    className="p-2 rounded-lg hover:bg-brand/10 hover:text-brand text-text-muted transition-colors"
                    title="Kopieren"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => j(e.id)}
                    className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {e && (
        <O3
          userId={e.id}
          isCoach={w}
          settings={a}
          onPatch={(e) =>
            o((t) => ({
              ...t,
              ...e,
            }))
          }
        />
      )}
      <button
        onClick={O}
        className={`btn-primary flex items-center gap-2 ${p ? 'bg-success hover:bg-success' : ''}`}
        disabled={d}
      >
        {d ? <Spinner size={18} /> : <Save size={18} />}
        {p ? 'Gespeichert!' : d ? 'Speichern...' : 'Einstellungen speichern'}
      </button>
      <div className="card space-y-4 border-border/60">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Shield size={18} className="text-brand" />
          {' Datenschutz & Rechtliches'}
        </h2>
        {!w && a.consent_given_at && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-xs text-text-secondary space-y-1">
            <div className="flex items-center gap-2 text-success font-semibold">
              <CircleCheckBig size={14} /> Einwilligungen erteilt
            </div>
            <div>DSGVO-Einwilligung: {a.consent_dsgvo ? '✓' : '✗'}</div>
            <div>KI-Analyse: {a.consent_ai ? '✓ aktiviert' : '✗ nicht erteilt'}</div>
            <div>
              Erteilt am:{' '}
              {new Date(a.consent_given_at).toLocaleDateString('de', {
                dateStyle: 'long',
              })}
            </div>
          </div>
        )}
        {!w && (
          <div className="p-3 rounded-xl bg-brand/5 border border-brand/20 flex items-start gap-2 text-xs text-text-secondary">
            <Zap size={14} className="text-brand shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-brand mb-0.5">KI-Analyse aktiv</div>Fotos werden zur automatischen
              Ernährungs- und Trainingsanalyse an Google Gemini übermittelt (gemäß deiner Einwilligung bei der
              Registrierung).
            </div>
          </div>
        )}
        <div className="flex gap-3 text-sm">
          <Link to="/legal" className="text-brand hover:underline flex items-center gap-1">
            <FileText size={14} /> Impressum
          </Link>
          <Link
            to="/legal"
            onClick={() => setTimeout(() => document.getElementById('datenschutz-tab')?.click(), 50)}
            className="text-brand hover:underline flex items-center gap-1"
          >
            <Shield size={14} /> Datenschutzerklärung
          </Link>
        </div>
      </div>
      <div className="card space-y-4 border-danger/20">
        <h2 className="font-semibold text-danger flex items-center gap-2">
          <TriangleAlert size={18} /> Konto löschen
        </h2>
        <p className="text-sm text-text-secondary">
          Durch das Löschen deines Kontos werden{' '}
          <strong className="text-text-primary">alle deine Daten unwiderruflich gelöscht</strong>: Gewicht, Training,
          Ernährung, Schlaf, Körperfotos und alle weiteren persönlichen Daten. Dies kann nicht rückgängig gemacht werden
          (DSGVO Art. 17).
        </p>
        <div className="space-y-2">
          <label className="text-xs text-text-muted">
            Tippe <strong className="text-danger font-mono">LÖSCHEN</strong> zur Bestätigung:
          </label>
          <input
            type="text"
            className="input border-danger/30 focus:border-danger"
            placeholder="LÖSCHEN"
            value={b}
            onChange={(e) => x(e.target.value)}
          />
        </div>
        <button
          onClick={k}
          disabled={b !== 'LÖSCHEN' || _}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-bg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {_ ? <Spinner size={16} /> : <Trash2 size={16} />}
          {_ ? 'Wird gelöscht...' : 'Konto und alle Daten löschen'}
        </button>
      </div>
    </div>
  )
}
