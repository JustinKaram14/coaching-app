import { useEffect, useState } from 'react'
import { Save, Copy, Plus, Trash2, Settings as SettingsIcon, Key, Bell, CheckCircle, FileText, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { bmi, bmiCategory, generateCode } from '../lib/utils'
import { Spinner } from '../components/ui/Spinner'
import { subscribeToPush } from '../hooks/usePushNotifications'
import type { ClientSettings, InviteCode, CoachPlan } from '../types/database'

export function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const [settings, setSettings] = useState<Partial<ClientSettings>>({})
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState(profile?.name ?? '')
  const [notifStatus, setNotifStatus] = useState<'idle'|'loading'|'ok'|'denied'|'unsupported'>('idle')

  const isCoach = profile?.role === 'coach'
  const [masterplan, setMasterplan] = useState<CoachPlan | null>(null)

  async function load() {
    if (!user) return
    const [settingsRes, planRes] = await Promise.all([
      supabase.from('client_settings').select('*').eq('user_id', user.id).single(),
      !isCoach ? supabase.from('coach_plans').select('*').eq('client_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    if (settingsRes.data) setSettings(settingsRes.data)
    setMasterplan(planRes.data ?? null)
    if (isCoach) {
      const codesRes = await supabase.from('invite_codes').select('*').eq('coach_id', user.id).order('created_at', { ascending: false })
      if (codesRes.data) setInviteCodes(codesRes.data as any[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])
  useEffect(() => { setName(profile?.name ?? '') }, [profile])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await Promise.all([
      supabase.from('profiles').update({ name }).eq('id', user.id),
      supabase.from('client_settings').upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' }),
    ])
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function createInviteCode() {
    if (!user) return
    const code = generateCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    await supabase.from('invite_codes').insert({
      code,
      coach_id: user.id,
      used_by: null,
      expires_at: expiresAt.toISOString(),
    })
    await load()
  }

  async function activateNotifications() {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifStatus('unsupported')
      return
    }
    setNotifStatus('loading')
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { setNotifStatus('denied'); return }
    await subscribeToPush(user.id)
    setNotifStatus('ok')
  }

  async function deleteCode(id: string) {
    await supabase.from('invite_codes').delete().eq('id', id)
    setInviteCodes(c => c.filter(x => x.id !== id))
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  const bmiVal = settings.startgewicht && settings.koerpergroesse
    ? bmi(settings.startgewicht, settings.koerpergroesse)
    : null

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="section-title text-2xl">Einstellungen</h1>
        <p className="text-text-secondary text-sm mt-0.5">Persönliche Daten & Coaching-Ziele</p>
      </div>

      {/* Profile */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <SettingsIcon size={18} className="text-primary" /> Profil
        </h2>
        <div>
          <label className="label">Name</label>
          <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" />
        </div>
        <div>
          <label className="label">E-Mail</label>
          <input type="email" className="input opacity-60 cursor-not-allowed" value={user?.email ?? ''} disabled />
        </div>
        <div>
          <label className="label">Rolle</label>
          <div className="input opacity-60 cursor-not-allowed capitalize">{profile?.role === 'coach' ? 'Coach' : 'Athlet / Klient'}</div>
        </div>
      </div>

      {/* Goals & Stats (only for clients) */}
      {!isCoach && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-text-primary">Ziele & Körperdaten</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Startgewicht (kg)</label>
              <input type="number" step="0.1" className="input" placeholder="75.0" value={settings.startgewicht ?? ''} onChange={e => setSettings(s => ({ ...s, startgewicht: parseFloat(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Zielgewicht (kg)</label>
              <input type="number" step="0.1" className="input" placeholder="70.0" value={settings.zielgewicht ?? ''} onChange={e => setSettings(s => ({ ...s, zielgewicht: parseFloat(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Körpergröße (cm)</label>
              <input type="number" className="input" placeholder="180" value={settings.koerpergroesse ?? ''} onChange={e => setSettings(s => ({ ...s, koerpergroesse: parseFloat(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Alter (Jahre)</label>
              <input type="number" className="input" placeholder="30" value={settings.alter_jahre ?? ''} onChange={e => setSettings(s => ({ ...s, alter_jahre: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Kalorienziel (kcal/Tag)</label>
              <input type="number" className="input" placeholder="2000" value={settings.kalorie_tagesziel ?? ''} onChange={e => setSettings(s => ({ ...s, kalorie_tagesziel: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Trainings/Woche (Ziel)</label>
              <input type="number" className="input" placeholder="4" value={settings.trainings_pro_woche ?? ''} onChange={e => setSettings(s => ({ ...s, trainings_pro_woche: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Schlafziel (Stunden)</label>
              <input type="number" step="0.5" className="input" placeholder="8" value={settings.schlaf_ziel ?? ''} onChange={e => setSettings(s => ({ ...s, schlaf_ziel: parseFloat(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Wasserziel (ml/Tag)</label>
              <input type="number" className="input" placeholder="2000" value={settings.wasser_ziel_ml ?? ''} onChange={e => setSettings(s => ({ ...s, wasser_ziel_ml: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label className="label">Startdatum Coaching</label>
              <input type="date" className="input" value={settings.startdatum ?? ''} onChange={e => setSettings(s => ({ ...s, startdatum: e.target.value }))} />
            </div>
          </div>

          {bmiVal && (
            <div className="p-4 bg-bg-elevated rounded-xl border border-border">
              <div className="text-sm text-text-muted mb-1">BMI (berechnet)</div>
              <div className="text-2xl font-bold text-text-primary">{bmiVal}</div>
              <div className="text-sm text-text-secondary">{bmiCategory(bmiVal)}</div>
            </div>
          )}
        </div>
      )}

      {/* Masterplan Download (clients only) */}
      {!isCoach && masterplan && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Mein Masterplan
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{masterplan.pdf_name ?? 'Coaching-Plan'}</div>
              <div className="text-xs text-text-muted mt-0.5">
                Erstellt: {masterplan.angewendet_am ? new Date(masterplan.angewendet_am).toLocaleDateString('de') : '—'}
              </div>
            </div>
            <button
              onClick={async () => {
                if (!masterplan.pdf_storage_path) return
                const { data } = await supabase.storage.from('masterplans').createSignedUrl(masterplan.pdf_storage_path, 3600)
                if (data?.signedUrl) window.open(data.signedUrl, '_blank')
              }}
              className="btn-primary flex items-center gap-2 text-sm shrink-0"
            >
              <Download size={16} /> PDF herunterladen
            </button>
          </div>
        </div>
      )}

      {/* Invite Codes (Coach only) */}
      {isCoach && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Key size={18} className="text-primary" /> Einladungscodes
            </h2>
            <button onClick={createInviteCode} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Code erstellen
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : inviteCodes.length === 0 ? (
            <p className="text-sm text-text-muted">Noch keine Codes erstellt.</p>
          ) : (
            <div className="space-y-2">
              {inviteCodes.map(code => (
                <div key={code.id} className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-text-primary tracking-widest">{code.code}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {code.used_by
                        ? <span className="text-success">Verwendet</span>
                        : code.expires_at
                        ? <span>Läuft ab: {new Date(code.expires_at).toLocaleDateString('de')}</span>
                        : 'Unbegrenzt gültig'}
                    </div>
                  </div>
                  <button onClick={() => copyCode(code.code)} className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary text-text-muted transition-colors" title="Kopieren">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => deleteCode(code.id)} className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notification Settings */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Bell size={18} className="text-primary" /> Benachrichtigungen
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">Tägliche Erinnerung</div>
            <div className="text-xs text-text-muted">Erinnert dich, Ernährung, Training & Schlaf einzutragen</div>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, notif_daily_reminder: !s.notif_daily_reminder }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.notif_daily_reminder ? 'bg-primary' : 'bg-bg-elevated border border-border'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notif_daily_reminder ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {settings.notif_daily_reminder && (
          <div>
            <label className="label">Uhrzeit der täglichen Erinnerung</label>
            <input
              type="time"
              className="input"
              value={settings.notif_reminder_time ?? '20:00'}
              onChange={e => setSettings(s => ({ ...s, notif_reminder_time: e.target.value }))}
            />
            <p className="text-xs text-text-muted mt-1">Hinweis: Zeiten werden in UTC gespeichert. CET = UTC+1, CEST = UTC+2</p>
          </div>
        )}

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">Termin-Erinnerungen</div>
            <div className="text-xs text-text-muted">Benachrichtigung 1 Stunde vor jedem Termin</div>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, notif_appointments: !s.notif_appointments }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.notif_appointments !== false ? 'bg-primary' : 'bg-bg-elevated border border-border'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notif_appointments !== false ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-sm font-medium text-text-primary mb-2">Push-Benachrichtigungen aktivieren</div>
          <div className="text-xs text-text-muted mb-3">
            {notifStatus === 'ok' && '✅ Benachrichtigungen sind aktiviert'}
            {notifStatus === 'denied' && '❌ Berechtigung verweigert — bitte in Browser-Einstellungen erlauben'}
            {notifStatus === 'unsupported' && '⚠️ Dein Browser unterstützt keine Push-Benachrichtigungen'}
            {(notifStatus === 'idle' || notifStatus === 'loading') && 'Klicke um Benachrichtigungen zu erlauben. Auf iPhone muss die App zuerst zum Homescreen hinzugefügt werden.'}
          </div>
          <button
            onClick={activateNotifications}
            disabled={notifStatus === 'loading' || notifStatus === 'ok'}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {notifStatus === 'loading' ? <Spinner size={16} /> : notifStatus === 'ok' ? <CheckCircle size={16} /> : <Bell size={16} />}
            {notifStatus === 'ok' ? 'Aktiviert' : notifStatus === 'loading' ? 'Wird aktiviert...' : 'Benachrichtigungen aktivieren'}
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`btn-primary flex items-center gap-2 ${saved ? 'bg-success hover:bg-success' : ''}`}
        disabled={saving}
      >
        {saving ? <Spinner size={18} /> : <Save size={18} />}
        {saved ? 'Gespeichert!' : saving ? 'Speichern...' : 'Einstellungen speichern'}
      </button>
    </div>
  )
}
