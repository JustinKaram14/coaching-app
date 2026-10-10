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

export function ToggleSwitch({ checked: isOn, onChange: onToggle, label: switchLabel, disabled: isDisabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={switchLabel}
      disabled={isDisabled}
      onClick={() => onToggle(!isOn)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
        isOn ? 'bg-primary ring-1 ring-brand/40' : 'bg-border-input',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
          isOn ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
export const EMPTY_FACTS = {
  weight: false,
  sleep: false,
  training: false,
  mealsMain: 0,
  supplementsTotal: 0,
  supplementsTaken: 0,
  waterMl: 0,
}
export const PREVIEW_SETTINGS = {
  timezone: 'Europe/Berlin',
  notif_daily_reminder: true,
  notif_reminder_time: '20:00',
  wasser_ziel_ml: 2500,
  notif_max_per_day: 3,
}
export const PREVIEW_APP_URL = ''
export function previewNotification(
  isoTime,
  factOverrides,
  streakInfo = {
    days: 0,
    includesToday: false,
  },
) {
  return planNotifications({
    now: new Date(isoTime),
    settings: PREVIEW_SETTINGS,
    facts: {
      ...EMPTY_FACTS,
      ...factOverrides,
    },
    streak: streakInfo,
    sent: [],
    appUrl: PREVIEW_APP_URL,
  })[0]
}
export function buildPreviews() {
  let candidates = [
      ((candidate) =>
        candidate && {
          id: 'missing',
          type: 'missing',
          c: candidate,
        })(
        previewNotification(
          '2026-07-01T18:05:00Z',
          {},
          {
            days: 12,
            includesToday: false,
          },
        ),
      ),
      ((candidate) =>
        candidate && {
          id: 'partial',
          type: 'missing',
          c: candidate,
        })(
        previewNotification('2026-07-01T18:05:00Z', {
          weight: true,
          mealsMain: 2,
        }),
      ),
      ((candidate) =>
        candidate && {
          id: 'praise',
          type: 'praise',
          c: candidate,
        })(
        previewNotification('2026-07-01T10:30:00Z', {
          training: true,
          trainingMin: 45,
          trainingType: 'Krafttraining',
          trainingAt: '2026-07-01T09:00:00Z',
        }),
      ),
      ((candidate) =>
        candidate && {
          id: 'streak',
          type: 'streak',
          c: candidate,
        })(
        previewNotification(
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
      ((candidate) =>
        candidate && {
          id: 'water',
          type: 'water',
          c: candidate,
        })(
        previewNotification('2026-07-01T14:00:00Z', {
          waterMl: 600,
        }),
      ),
    ],
    appointment = planAppointments(
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
      PREVIEW_SETTINGS,
      [],
      PREVIEW_APP_URL,
    )[0],
    previews = candidates.filter((item) => !!item)
  return (
    appointment &&
      previews.push({
        id: 'appointment',
        type: 'appointment',
        c: appointment,
      }),
    previews
  )
}
export function NotificationCard({ c: notification, dim: isDimmed }) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-2xl bg-bg-elevated border border-border p-3 transition-opacity duration-300',
        isDimmed && 'opacity-45',
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
        <div className="text-sm font-semibold text-text-primary leading-snug">{notification.title}</div>
        <div className="text-sm text-text-secondary leading-snug">{notification.body}</div>
      </div>
    </div>
  )
}
export function SettingRow({ icon: iconNode, title: rowTitle, hint: rowHint, children: rowControl }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-t border-border first:border-t-0">
      {iconNode && (
        <span
          className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {iconNode}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-text-primary">{rowTitle}</div>
        <div className="text-xs text-text-secondary leading-snug">{rowHint}</div>
      </div>
      {rowControl}
    </div>
  )
}
export const LEAD_OPTIONS = [
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
export function NotificationSettings({ userId: uid, isCoach: coach, settings: notifSettings, onPatch: patch }) {
  let [pushState, setPushState] = useState('loading'),
    [busy, setBusy] = useState(false),
    [statusNote, setStatusNote] = useState(null),
    [devices, setDevices] = useState([]),
    [saveFailed, setSaveFailed] = useState(false),
    previewList = useMemo(buildPreviews, []),
    refreshState = useCallback(async () => {
      try {
        setPushState(await getPushState())
      } catch {
        setPushState('unsupported')
      }
      try {
        setDevices(await listDevices(uid))
      } catch {}
    }, [uid])
  useEffect(() => {
    refreshState()
  }, [refreshState])
  async function saveSetting(changes) {
    ;(patch(changes), setSaveFailed(false))
    let { error: updateError } = await supabase.from('client_settings').update(changes).eq('user_id', uid)
    updateError && setSaveFailed(true)
  }
  async function activate() {
    ;(setBusy(true), setStatusNote(null))
    let result = await enablePush(uid)
    ;(setBusy(false),
      setStatusNote(
        result === 'ok'
          ? {
              tone: 'ok',
              text: 'Fertig: Dieses Gerät bekommt jetzt Nachrichten.',
            }
          : result === 'denied'
            ? {
                tone: 'warn',
                text: 'Die Erlaubnis wurde verweigert. Du kannst sie in den Einstellungen deines Geräts oder Browsers wieder erlauben.',
              }
            : result === 'unsupported'
              ? {
                  tone: 'warn',
                  text: 'Dieses Gerät oder dieser Browser unterstützt keine Push-Nachrichten.',
                }
              : {
                  tone: 'warn',
                  text: 'Das hat nicht geklappt. Lade die App neu und versuche es noch einmal.',
                },
      ),
      await refreshState())
  }
  async function deactivate() {
    ;(setBusy(true), setStatusNote(null), await disablePush(uid), setBusy(false), await refreshState())
  }
  async function sendTest() {
    ;(setBusy(true), setStatusNote(null))
    let { data: testData, error: testError } = await sendPushToUser(uid, 'Test erfolgreich', 'So meldet sich HLX Together bei dir.')
    ;(setBusy(false),
      !testError && testData && (testData.sent ?? 0) > 0
        ? setStatusNote({
            tone: 'ok',
            text: `Test gesendet an ${testData.sent} Gerät${testData.sent === 1 ? '' : 'e'}. Es sollte gleich ankommen.`,
          })
        : setStatusNote({
            tone: 'warn',
            text: 'Der Test konnte nicht zugestellt werden. Prüfe, ob dieses Gerät aktiviert ist.',
          }))
  }
  async function removeOne(device) {
    ;(await removeDevice(device.id), await refreshState())
  }
  let dailyOn = notifSettings.notif_daily_reminder !== false,
    isEnabled = (settingKey) => notifSettings[settingKey] !== false,
    maxPerDay = notifSettings.notif_max_per_day ?? 3,
    zoneName = notifSettings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    isDimmedType = (previewType) =>
      previewType === 'missing'
        ? !dailyOn
        : previewType === 'praise'
          ? !isEnabled('notif_praise')
          : previewType === 'streak'
            ? !isEnabled('notif_streak')
            : previewType === 'water'
              ? !isEnabled('notif_water')
              : notifSettings.notif_appointments === false
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
              pushState === 'on' ? 'bg-success/15 text-success' : 'bg-brand/10 text-brand',
            )}
            aria-hidden="true"
          >
            {pushState === 'on' ? <BellRing size={20} /> : <Smartphone size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-text-primary">
              {pushState === 'on' ? 'Auf diesem Gerät aktiv' : pushState === 'loading' ? 'Prüfe Gerät …' : 'Auf diesem Gerät noch aus'}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
              {pushState === 'on' && 'Du bekommst die gewählten Nachrichten auch bei geschlossener App.'}
              {pushState === 'off' &&
                'Aktiviere Nachrichten, damit dich HLX Together erinnert und lobt. Die Erlaubnis fragt dein Gerät einmalig ab.'}
              {pushState === 'denied' &&
                'Nachrichten sind für diese App blockiert. Erlaube sie in den Einstellungen deines Geräts oder Browsers und lade die App neu.'}
              {pushState === 'unsupported' &&
                'Dieser Browser unterstützt keine Push-Nachrichten. Chrome, Edge, Firefox und Safari (macOS 13 oder neuer) können es.'}
              {pushState === 'ios-old' &&
                'Push-Nachrichten brauchen auf iPhone und iPad mindestens iOS 16.4. Bitte aktualisiere dein Gerät.'}
              {pushState === 'ios-install' &&
                'Auf iPhone und iPad funktionieren Nachrichten, sobald die App auf dem Home-Bildschirm liegt:'}
            </p>
          </div>
        </div>
        {pushState === 'ios-install' && (
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
            ].map((howToStep, stepIndex) => (
              <li className="flex items-center gap-3" key={stepIndex}>
                <span
                  className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {howToStep.icon}
                </span>
                <span>{howToStep.text}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-2">
          {(pushState === 'off' || pushState === 'denied') && (
            <button
              onClick={activate}
              disabled={busy || pushState === 'denied'}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {busy ? <Spinner size={16} /> : <Bell size={16} aria-hidden="true" />} Auf diesem Gerät aktivieren
            </button>
          )}
          {pushState === 'on' && (
            <>
              <button onClick={sendTest} disabled={busy} className="btn-secondary text-sm flex items-center gap-2">
                {busy ? <Spinner size={16} /> : <Sparkles size={16} aria-hidden="true" />} Test senden
              </button>
              <button onClick={deactivate} disabled={busy} className="btn-secondary text-sm">
                Auf diesem Gerät ausschalten
              </button>
            </>
          )}
        </div>
        {statusNote && (
          <p
            role="status"
            className={cn(
              'text-xs leading-relaxed flex items-start gap-1.5',
              statusNote.tone === 'ok' ? 'text-success' : 'text-warning',
            )}
          >
            {statusNote.tone === 'ok' && <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
            {statusNote.text}
          </p>
        )}
        {devices.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs font-semibold text-text-secondary mb-2">Angemeldete Geräte</div>
            <ul className="space-y-1.5">
              {devices.map((device) => (
                <li className="flex items-center gap-2.5 text-sm" key={device.id}>
                  <MonitorSmartphone size={16} className="text-text-muted shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0 truncate text-text-primary">{device.device_label ?? 'Gerät'}</span>
                  {device.thisDevice && <span className="badge bg-success/15 text-success">Dieses Gerät</span>}
                  {!device.thisDevice && (
                    <button
                      onClick={() => removeOne(device)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      aria-label={`${device.device_label ?? 'Gerät'} entfernen`}
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
      {!coach && (
        <>
          <div>
            <SettingRow
              icon={<Bell size={18} />}
              title="Abendliche Erinnerung"
              hint="„Heute noch nichts eingetragen“, wenn dir noch etwas fehlt"
            >
              <ToggleSwitch
                checked={dailyOn}
                onChange={(enabled) =>
                  saveSetting({
                    notif_daily_reminder: enabled,
                  })
                }
                label="Abendliche Erinnerung"
              />
            </SettingRow>
            {dailyOn && (
              <div className="pb-3.5 -mt-1 pl-12">
                <label htmlFor="notif-time" className="label !mb-1 !text-xs">
                  Uhrzeit (deine Ortszeit)
                </label>
                <input
                  id="notif-time"
                  type="time"
                  className="input !w-40"
                  value={notifSettings.notif_reminder_time ?? '20:00'}
                  onChange={(event) =>
                    saveSetting({
                      notif_reminder_time: event.target.value,
                    })
                  }
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Zeitzone: {zoneName.replace('_', ' ')} (wird automatisch erkannt)
                </p>
              </div>
            )}
            <SettingRow
              icon={<Sparkles size={18} />}
              title="Lob für Erledigtes"
              hint="Zum Beispiel nach dem Training: „Heute schon fleißig trainiert“"
            >
              <ToggleSwitch
                checked={isEnabled('notif_praise')}
                onChange={(enabled) =>
                  saveSetting({
                    notif_praise: enabled,
                  })
                }
                label="Lob für Erledigtes"
              />
            </SettingRow>
            <SettingRow
              icon={<Flame size={18} />}
              title="Serien und Meilensteine"
              hint="Wenn du 3, 7, 14, 30 … Tage in Folge dabei bist"
            >
              <ToggleSwitch
                checked={isEnabled('notif_streak')}
                onChange={(enabled) =>
                  saveSetting({
                    notif_streak: enabled,
                  })
                }
                label="Serien und Meilensteine"
              />
            </SettingRow>
            <SettingRow
              icon={<Droplets size={18} />}
              title="Wasser"
              hint="Ein sanfter Hinweis am Nachmittag, wenn du erst wenig getrunken hast"
            >
              <ToggleSwitch
                checked={isEnabled('notif_water')}
                onChange={(enabled) =>
                  saveSetting({
                    notif_water: enabled,
                  })
                }
                label="Wasser-Erinnerung"
              />
            </SettingRow>
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
              value={String(maxPerDay)}
              onChange={(choice) =>
                saveSetting({
                  notif_max_per_day: Number(choice),
                })
              }
              label="Höchstzahl Nachrichten pro Tag"
              className="max-w-xs"
            />
          </div>
          <div>
            <SettingRow
              icon={<Check size={18} />}
              title="Termin-Erinnerungen"
              hint="Vor jedem Termin im Kalender, bei jedem Termin einzeln einstellbar"
            >
              <ToggleSwitch
                checked={notifSettings.notif_appointments !== false}
                onChange={(enabled) =>
                  saveSetting({
                    notif_appointments: enabled,
                  })
                }
                label="Termin-Erinnerungen"
              />
            </SettingRow>
            {notifSettings.notif_appointments !== false && (
              <div className="pb-1 pl-12">
                <label htmlFor="notif-lead" className="label !mb-1 !text-xs">
                  Standard für neue Termine
                </label>
                <select
                  id="notif-lead"
                  className="input !w-auto"
                  value={notifSettings.notif_appointment_minutes ?? 60}
                  onChange={(event) =>
                    saveSetting({
                      notif_appointment_minutes: Number(event.target.value),
                    })
                  }
                >
                  {LEAD_OPTIONS.map((leadOption) => (
                    <option value={leadOption.value} key={leadOption.value}>
                      {leadOption.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {saveFailed && (
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
              {previewList.map((preview) => (
                <NotificationCard c={preview.c} dim={isDimmedType(preview.type)} key={preview.id} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
export const LEGACY_COLUMNS = ['timezone', 'notif_praise', 'notif_streak', 'notif_water', 'notif_max_per_day']
export function Settings() {
  let { user: authUser, profile: authProfile, refreshProfile: reloadProfile } = useAuth(),
    { theme: themeName, setTheme: changeTheme } = useTheme(),
    [form, setForm] = useState({}),
    [inviteCodes, setInviteCodes] = useState([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [displayName, setDisplayName] = useState(authProfile?.name ?? ''),
    [deleting, setDeleting] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState(''),
    [tdeeResult, setTdeeResult] = useState(null),
    coachMode = authProfile?.role === 'coach',
    [masterplan, setMasterplan] = useState(null)
  async function loadSettings() {
    if (!authUser) return
    let [settingsResult, planResult] = await Promise.all([
      supabase.from('client_settings').select('*').eq('user_id', authUser.id).single(),
      coachMode
        ? Promise.resolve({
            data: null,
          })
        : supabase.from('coach_plans').select('*').eq('client_id', authUser.id).maybeSingle(),
    ])
    if ((settingsResult.data && setForm(settingsResult.data), setMasterplan(planResult.data ?? null), coachMode)) {
      let codesResult = await supabase.from('invite_codes').select('*').eq('coach_id', authUser.id).order('created_at', {
        ascending: false,
      })
      codesResult.data && setInviteCodes(codesResult.data)
    }
    setLoading(false)
  }
  ;(useEffect(() => {
    loadSettings()
  }, [authUser]),
    useEffect(() => {
      setDisplayName(authProfile?.name ?? '')
    }, [authProfile]))
  async function saveAll() {
    if (!authUser) return
    setSaving(true)
    let [, saveResult] = await Promise.all([
      supabase
        .from('profiles')
        .update({
          name: displayName,
        })
        .eq('id', authUser.id),
      supabase.from('client_settings').upsert(
        {
          ...form,
          user_id: authUser.id,
        },
        {
          onConflict: 'user_id',
        },
      ),
    ])
    if (saveResult.error && /column|schema cache/i.test(saveResult.error.message)) {
      let fallback = Object.fromEntries(Object.entries(form).filter(([columnName]) => !LEGACY_COLUMNS.includes(columnName)))
      await supabase.from('client_settings').upsert(
        {
          ...fallback,
          user_id: authUser.id,
        },
        {
          onConflict: 'user_id',
        },
      )
    }
    ;(await reloadProfile(), setSaving(false), setSaved(true), setTimeout(() => setSaved(false), 2e3))
  }
  async function deleteAccount() {
    !authUser ||
      deleteConfirm !== 'LÖSCHEN' ||
      (setDeleting(true), await supabase.from('profiles').delete().eq('id', authUser.id), await supabase.auth.signOut())
  }
  async function createInviteCode() {
    if (!authUser) return
    let newCode = generateCode(),
      expires = new Date()
    ;(expires.setDate(expires.getDate() + 30),
      await supabase.from('invite_codes').insert({
        code: newCode,
        coach_id: authUser.id,
        used_by: null,
        expires_at: expires.toISOString(),
      }),
      await loadSettings())
  }
  async function deleteInviteCode(codeId) {
    ;(await supabase.from('invite_codes').delete().eq('id', codeId), setInviteCodes((list) => list.filter((codeRow) => codeRow.id !== codeId)))
  }
  function copyCode(clipText) {
    navigator.clipboard.writeText(clipText)
  }
  function calculateTargets() {
    let startWeight = form.startgewicht,
      height = form.koerpergroesse,
      age = form.alter_jahre
    if (!startWeight || !height || !age) return
    let tdee = berechneTDEE(
      startWeight,
      height,
      age,
      form.aktivitaetsniveau ?? 'maessig_aktiv',
      form.sport_ziel ?? 'halten',
      form.ernaehrungs_typ ?? 'standard',
    )
    ;(setTdeeResult(tdee),
      setForm((prev) => ({
        ...prev,
        kalorie_tagesziel: tdee.kalorien,
        protein_ziel: tdee.protein,
        karbs_ziel: tdee.karbs,
        fett_ziel: tdee.fett,
      })))
  }
  let bmiValue = form.startgewicht && form.koerpergroesse ? bmi(form.startgewicht, form.koerpergroesse) : null
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
          <input type="text" className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Dein Name" />
        </div>
        <div>
          <label className="label">E-Mail</label>
          <input
            type="email"
            aria-label="E-Mail-Adresse"
            className="input opacity-60 cursor-not-allowed"
            value={authUser?.email ?? ''}
            disabled
          />
        </div>
        <div>
          <label className="label">Rolle</label>
          <div className="input text-text-secondary cursor-default capitalize">
            {authProfile?.role === 'coach' ? 'Coach' : 'Athlet / Klient'}
          </div>
        </div>
      </div>
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          {themeName === 'dark' ? <Moon size={18} className="text-brand" /> : <Sun size={18} className="text-brand" />}{' '}
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
          ].map(([themeKey, themeLabel, ThemeIcon]) => (
            <button
              type="button"
              aria-pressed={themeName === themeKey}
              onClick={() => changeTheme(themeKey)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all ${themeName === themeKey ? 'bg-primary text-white ring-1 ring-inset ring-brand/30' : 'text-text-secondary hover:text-text-primary'}`}
              key={themeKey}
            >
              <ThemeIcon size={16} /> {themeLabel}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Standard ist der dunkle Modus. Die Auswahl wird auf diesem Gerät gespeichert.
        </p>
      </div>
      {!coachMode && (
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
                value={form.startgewicht ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startgewicht: parseFloat(event.target.value) || undefined,
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
                value={form.zielgewicht ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    zielgewicht: parseFloat(event.target.value) || undefined,
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
                value={form.koerpergroesse ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    koerpergroesse: parseFloat(event.target.value) || undefined,
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
                value={form.alter_jahre ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    alter_jahre: parseInt(event.target.value) || undefined,
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
                value={form.kalorie_tagesziel ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    kalorie_tagesziel: parseInt(event.target.value) || undefined,
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
                value={form.trainings_pro_woche ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    trainings_pro_woche: parseInt(event.target.value) || undefined,
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
                value={form.schlaf_ziel ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    schlaf_ziel: parseFloat(event.target.value) || undefined,
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
                value={form.wasser_ziel_ml ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    wasser_ziel_ml: parseInt(event.target.value) || undefined,
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
                value={form.startdatum ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startdatum: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          {bmiValue && (
            <div className="p-4 bg-bg-elevated rounded-xl border border-border">
              <div className="text-sm text-text-muted mb-1">BMI (berechnet)</div>
              <div className="text-2xl font-bold text-text-primary">{bmiValue}</div>
              <div className="text-sm text-text-secondary">{bmiCategory(bmiValue)}</div>
            </div>
          )}
        </div>
      )}
      {!coachMode && (
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
              ].map(([levelKey, levelLabel, levelHint]) => (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      aktivitaetsniveau: levelKey,
                    }))
                  }
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${(form.aktivitaetsniveau ?? 'maessig_aktiv') === levelKey ? 'border-brand bg-brand/10 text-text-primary' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={levelKey}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 shrink-0 ${(form.aktivitaetsniveau ?? 'maessig_aktiv') === levelKey ? 'border-brand bg-brand' : 'border-border'}`}
                  />
                  <div>
                    <div className="text-sm font-medium">{levelLabel}</div>
                    <div className="text-xs text-text-muted">{levelHint}</div>
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
              ].map(([goalKey, goalLabel, goalHint]) => (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      sport_ziel: goalKey,
                    }))
                  }
                  className={`py-3 rounded-xl border text-center transition-colors ${(form.sport_ziel ?? 'halten') === goalKey ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={goalKey}
                >
                  <div className="text-sm font-semibold">{goalLabel}</div>
                  <div className="text-xs text-text-muted mt-0.5">{goalHint}</div>
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
              ].map(([dietKey, dietLabel]) => (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      ernaehrungs_typ: dietKey,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${(form.ernaehrungs_typ ?? 'standard') === dietKey ? 'bg-primary border-brand text-white' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={dietKey}
                >
                  {dietLabel}
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
              ].map(([fastKey, fastLabel, fastHint]) => (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      intervall_fasten: fastKey,
                    }))
                  }
                  className={`px-3 py-2.5 rounded-xl border text-left transition-colors ${(form.intervall_fasten ?? 'kein') === fastKey ? 'border-brand bg-brand/10 text-text-primary' : 'border-border text-text-secondary hover:border-brand/40'}`}
                  key={fastKey}
                >
                  <div className="text-sm font-semibold">{fastLabel}</div>
                  <div className="text-xs text-text-muted">{fastHint}</div>
                </button>
              ))}
            </div>
          </div>
          {form.startgewicht && form.koerpergroesse && form.alter_jahre ? (
            <button type="button" onClick={calculateTargets} className="btn-primary flex items-center gap-2 w-full justify-center">
              <Zap size={16} />
              {' Ziele berechnen & übernehmen'}
            </button>
          ) : (
            <p className="text-xs text-text-muted text-center">
              {'Bitte zuerst Gewicht, Größe und Alter unter «Ziele & Körperdaten» eintragen.'}
            </p>
          )}
          {tdeeResult && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/20 space-y-1.5">
              <div className="text-xs font-semibold text-success flex items-center gap-1">
                <CircleCheckBig size={13} />
                {' Berechnet & gesetzt'}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="font-bold text-text-primary text-base">{tdeeResult.kalorien}</div>
                  <div className="text-text-muted">kcal</div>
                </div>
                <div>
                  <div className="font-bold text-text-primary text-base">{tdeeResult.protein}g</div>
                  <div className="text-text-muted">Protein</div>
                </div>
                <div>
                  <div className="font-bold text-text-primary text-base">{tdeeResult.karbs}g</div>
                  <div className="text-text-muted">Karbs</div>
                </div>
                <div>
                  <div className="font-bold text-text-primary text-base">{tdeeResult.fett}g</div>
                  <div className="text-text-muted">Fett</div>
                </div>
              </div>
              <p className="text-xs text-text-muted">Klicke «Einstellungen speichern» um die Werte zu sichern.</p>
            </div>
          )}
        </div>
      )}
      {!coachMode && (
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
                checked={!!form.coach_foto_freigabe}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    coach_foto_freigabe: event.target.checked,
                  }))
                }
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${form.coach_foto_freigabe ? 'bg-primary ring-1 ring-brand/40' : 'bg-border-input'}`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.coach_foto_freigabe ? 'translate-x-5' : ''}`}
              />
            </div>
          </label>
        </div>
      )}
      {!coachMode && masterplan && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <FileText size={18} className="text-brand" /> Mein Masterplan
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{masterplan.pdf_name ?? 'Coaching-Plan'}</div>
              <div className="text-xs text-text-muted mt-0.5">
                Erstellt: {masterplan.angewendet_am ? new Date(masterplan.angewendet_am).toLocaleDateString('de') : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
      {coachMode && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Key size={18} className="text-brand" /> Einladungscodes
            </h2>
            <button onClick={createInviteCode} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Code erstellen
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : inviteCodes.length === 0 ? (
            <p className="text-sm text-text-muted">Noch keine Codes erstellt.</p>
          ) : (
            <div className="space-y-2">
              {inviteCodes.map((inviteCode) => (
                <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl border border-border" key={inviteCode.id}>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-text-primary tracking-widest">{inviteCode.code}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {inviteCode.used_by ? (
                        <span className="text-success">Verwendet</span>
                      ) : inviteCode.expires_at ? (
                        <span>Läuft ab: {new Date(inviteCode.expires_at).toLocaleDateString('de')}</span>
                      ) : (
                        'Unbegrenzt gültig'
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => copyCode(inviteCode.code)}
                    className="p-2 rounded-lg hover:bg-brand/10 hover:text-brand text-text-muted transition-colors"
                    title="Kopieren"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => deleteInviteCode(inviteCode.id)}
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
      {authUser && (
        <NotificationSettings
          userId={authUser.id}
          isCoach={coachMode}
          settings={form}
          onPatch={(patchValues) =>
            setForm((prev) => ({
              ...prev,
              ...patchValues,
            }))
          }
        />
      )}
      <button
        onClick={saveAll}
        className={`btn-primary flex items-center gap-2 ${saved ? 'bg-success hover:bg-success' : ''}`}
        disabled={saving}
      >
        {saving ? <Spinner size={18} /> : <Save size={18} />}
        {saved ? 'Gespeichert!' : saving ? 'Speichern...' : 'Einstellungen speichern'}
      </button>
      <div className="card space-y-4 border-border/60">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Shield size={18} className="text-brand" />
          {' Datenschutz & Rechtliches'}
        </h2>
        {!coachMode && form.consent_given_at && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-xs text-text-secondary space-y-1">
            <div className="flex items-center gap-2 text-success font-semibold">
              <CircleCheckBig size={14} /> Einwilligungen erteilt
            </div>
            <div>DSGVO-Einwilligung: {form.consent_dsgvo ? '✓' : '✗'}</div>
            <div>KI-Analyse: {form.consent_ai ? '✓ aktiviert' : '✗ nicht erteilt'}</div>
            <div>
              Erteilt am:{' '}
              {new Date(form.consent_given_at).toLocaleDateString('de', {
                dateStyle: 'long',
              })}
            </div>
          </div>
        )}
        {!coachMode && (
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
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
          />
        </div>
        <button
          onClick={deleteAccount}
          disabled={deleteConfirm !== 'LÖSCHEN' || deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-bg transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deleting ? <Spinner size={16} /> : <Trash2 size={16} />}
          {deleting ? 'Wird gelöscht...' : 'Konto und alle Daten löschen'}
        </button>
      </div>
    </div>
  )
}
