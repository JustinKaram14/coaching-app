// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/images'
import { isMissingTable } from '../lib/dbErrors'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn, formatDate, todayISO } from '../lib/utils'
import { ArrowLeftRight, Camera, ImagePlus, Lock, Plus, Scale, Trash2, X } from 'lucide-react'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'

export const VZ = 864e5
export const HZ = (e) => Math.round(Date.parse(`${e}T00:00:00Z`) / VZ)
export const UZ = (e, t) => HZ(e) - HZ(t)
export function WZ(e, t) {
  return new Date(Date.parse(`${e}T00:00:00Z`) + t * VZ).toISOString().slice(0, 10)
}
export function GZ(e, t, n, r) {
  let i = e.filter((e) => e.label === t)
  if (!i.length) return null
  let a = i[0],
    o = i.filter((e) => e.id !== a.id && e.datum < a.datum)
  if (!o.length)
    return {
      now: a,
      before: null,
      gapDays: 0,
      wanted: n === 'custom' || n === 'start' ? -1 : n,
      approximate: false,
    }
  if (n === 'start') {
    let e = o[o.length - 1]
    return {
      now: a,
      before: e,
      gapDays: UZ(a.datum, e.datum),
      wanted: -1,
      approximate: false,
    }
  }
  let s = n === 'custom' && r ? r : WZ(a.datum, -(n === 'custom' ? 30 : n)),
    c = o[0]
  for (let e of o) Math.abs(UZ(e.datum, s)) < Math.abs(UZ(c.datum, s)) && (c = e)
  let l = n === 'custom' ? UZ(a.datum, s) : n
  return {
    now: a,
    before: c,
    gapDays: UZ(a.datum, c.datum),
    wanted: l,
    approximate: Math.abs(UZ(c.datum, s)) > 7,
  }
}
export const KZ = 'body-photos'
export const qZ = ['Vorne', 'Seite', 'Rücken']
export const JZ = 'Foto'
export function YZ(e) {
  let t = e.indexOf(`/${KZ}/`)
  return t < 0 ? null : decodeURIComponent(e.slice(t + 11 + 2).split('?')[0])
}
export async function XZ(e) {
  let t = new Map()
  if (!e.length) return t
  try {
    let { data: n } = await supabase.storage.from(KZ).createSignedUrls(e, 3600)
    for (let e of n ?? []) e.path && e.signedUrl && t.set(e.path, e.signedUrl)
  } catch {}
  for (let n of e) t.has(n) || t.set(n, supabase.storage.from(KZ).getPublicUrl(n).data.publicUrl)
  return t
}
export async function ZZ(e) {
  let [t, n] = await Promise.all([
      supabase.from('koerperfotos').select('*').eq('user_id', e).order('datum', {
        ascending: false,
      }),
      supabase.from('gewicht').select('id, datum, gewicht, foto_url').eq('user_id', e).order('datum', {
        ascending: true,
      }),
    ]),
    r = n.data ?? [],
    i = (e) => {
      let t = null
      for (let n of r)
        if (n.datum <= e) t = n.gewicht
        else break
      return t
    },
    a = (t.error ? [] : (t.data ?? [])).map((e) => ({
      id: e.id,
      datum: e.datum,
      label: e.label || 'Foto',
      path: e.pfad,
      url: null,
      weightKg: i(e.datum),
    })),
    o = new Set(a.map((e) => e.path))
  for (let e of r) {
    if (!e.foto_url) continue
    let t = YZ(e.foto_url)
    ;(t && o.has(t)) ||
      a.push({
        id: `legacy-${e.id}`,
        datum: e.datum,
        label: JZ,
        path: t,
        url: t ? null : e.foto_url,
        legacyWeightId: e.id,
        weightKg: e.gewicht,
      })
  }
  let s = await XZ(a.filter((e) => e.path).map((e) => e.path))
  for (let e of a) e.path && (e.url = s.get(e.path) ?? null)
  return a.sort((e, t) => t.datum.localeCompare(e.datum) || e.label.localeCompare(t.label, 'de'))
}
export async function $Z(e, t, n, r) {
  let i = await compressImage(t),
    a = `${e}/${n}-${Date.now()}.jpg`
  if (
    (
      await supabase.storage.from('body-photos').upload(a, i, {
        contentType: 'image/jpeg',
        upsert: false,
      })
    ).error
  )
    return {
      ok: false,
      reason: 'upload',
    }
  let o = await supabase
    .from('koerperfotos')
    .insert({
      user_id: e,
      datum: n,
      pfad: a,
      label: r.trim() || 'Foto',
    })
    .select('id')
    .single()
  return o.error || !o.data
    ? (await supabase.storage.from(KZ).remove([a]),
      {
        ok: false,
        reason: isMissingTable(o.error) ? 'table' : 'save',
      })
    : {
        ok: true,
        photo: {
          id: o.data.id,
          path: a,
        },
      }
}
export async function eQ(e) {
  ;(e.path && (await supabase.storage.from(KZ).remove([e.path])),
    e.legacyWeightId
      ? await supabase
          .from('gewicht')
          .update({
            foto_url: null,
          })
          .eq('id', e.legacyWeightId)
      : await supabase.from('koerperfotos').delete().eq('id', e.id))
}
export const tQ = [
  {
    key: 30,
    label: '30 Tage',
  },
  {
    key: 60,
    label: '60 Tage',
  },
  {
    key: 90,
    label: '90 Tage',
  },
  {
    key: 'start',
    label: 'Start',
  },
  {
    key: 'custom',
    label: 'Datum',
  },
]
export function nQ(e) {
  return e <= 0 ? 'heute' : e === 1 ? 'gestern' : e < 100 ? `vor ${e} Tagen` : `vor ${Math.round(e / 30.4)} Monaten`
}
export const rQ = (e) =>
  `${e.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`
export const iQ = (e) =>
  `${e > 0 ? '+' : e < 0 ? '−' : '±'}${Math.abs(e).toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`
export function AQ_({ p: e, className: t, onClick: n }) {
  let [r, i] = useState(false),
    [a, o] = useState(false)
  return (
    <button
      type="button"
      onClick={n}
      disabled={!n}
      className={cn('relative overflow-hidden bg-bg-elevated block w-full', t)}
      aria-label={`Foto ${e.label} vom ${formatDate(e.datum)} vergrößern`}
    >
      {!a && e.url && (
        <img
          src={e.url}
          alt=""
          loading="lazy"
          onLoad={() => i(true)}
          onError={() => o(true)}
          className={cn('w-full h-full object-cover transition-opacity duration-500', r ? 'opacity-100' : 'opacity-0')}
        />
      )}
      {(a || !e.url) && (
        <span className="absolute inset-0 flex items-center justify-center text-text-muted">
          <Camera size={22} aria-hidden="true" />
        </span>
      )}
    </button>
  )
}
export function OQ_({ open: e, onClose: t, userId: n, labels: r, defaultLabel: i, onSaved: a }) {
  let [o, s] = useState(todayISO()),
    [c, l] = useState(i ?? qZ[0]),
    [u, d] = useState(null),
    [f, p] = useState(null),
    [m, h] = useState(false),
    [g, _] = useState(''),
    y = useRef(null),
    b = useRef(null)
  ;(useEffect(() => {
    e && (s(todayISO()), l(i ?? qZ[0]), d(null), p(null), _(''))
  }, [e, i]),
    useEffect(
      () => () => {
        f && URL.revokeObjectURL(f)
      },
      [f],
    ))
  let x = useMemo(() => Array.from(new Set([...qZ, ...r])), [r])
  function S(e) {
    e && (d(e), _(''), p((t) => (t && URL.revokeObjectURL(t), URL.createObjectURL(e))))
  }
  async function C() {
    if (!u) {
      _('Wähle zuerst ein Foto aus.')
      return
    }
    if (!c.trim()) {
      _('Gib dem Foto eine Beschriftung, z. B. „Vorne“.')
      return
    }
    ;(h(true), _(''))
    let e = await $Z(n, u, o, c.trim())
    if ((h(false), e.ok)) {
      ;(a(c.trim()), t())
      return
    }
    _(
      e.reason === 'table'
        ? 'Die Datenbank ist noch nicht auf Körperfotos vorbereitet. Bitte das Datenbank-Update einspielen.'
        : e.reason === 'upload'
          ? 'Das Foto konnte nicht hochgeladen werden. Prüfe deine Verbindung und versuche es noch einmal.'
          : 'Das Foto wurde hochgeladen, aber nicht gespeichert. Bitte versuche es noch einmal.',
    )
  }
  return (
    <BottomSheet open={e} onClose={t} title="Körperfoto hinzufügen">
      <div className="space-y-5 pb-4">
        <div>
          <span className="label">Foto</span>
          <input
            ref={y}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => S(e.target.files?.[0])}
          />
          <input
            ref={b}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => S(e.target.files?.[0])}
          />
          {f ? (
            <div className="relative w-40 aspect-[3/4] rounded-2xl overflow-hidden border border-border">
              <img src={f} alt="Vorschau des gewählten Fotos" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  ;(d(null), p(null))
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                aria-label="Foto entfernen"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => y.current?.click()}
                className="rounded-2xl border border-dashed border-brand/50 bg-brand/5 py-5 flex flex-col items-center gap-1.5 text-brand font-semibold text-sm active:scale-[0.97] transition-transform"
              >
                <Camera size={22} aria-hidden="true" /> Kamera
              </button>
              <button
                onClick={() => b.current?.click()}
                className="rounded-2xl border border-dashed border-border bg-bg-elevated py-5 flex flex-col items-center gap-1.5 text-text-secondary font-semibold text-sm active:scale-[0.97] transition-transform"
              >
                <ImagePlus size={22} aria-hidden="true" /> Aus Fotos
              </button>
            </div>
          )}
        </div>
        <div>
          <span className="label">Beschriftung</span>
          <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label="Beschriftung wählen">
            {x.map((e) => (
              <button
                aria-pressed={c === e}
                onClick={() => l(e)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-semibold border transition-all active:scale-95',
                  c === e
                    ? 'bg-primary border-brand text-white'
                    : 'border-border text-text-secondary hover:border-brand/40',
                )}
                key={e}
              >
                {e}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="photo-label">
            Eigene Beschriftung
          </label>
          <input
            id="photo-label"
            className="input"
            maxLength={30}
            placeholder="Eigene Beschriftung, z. B. Bizeps-Pose"
            value={c}
            onChange={(e) => l(e.target.value)}
          />
          <p className="text-xs text-text-muted mt-1.5">
            Fotos mit gleicher Beschriftung werden miteinander verglichen. Nimm sie am besten immer ähnlich auf.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="photo-date">
            Datum
          </label>
          <input
            id="photo-date"
            type="date"
            className="input"
            value={o}
            max={todayISO()}
            onChange={(e) => s(e.target.value)}
          />
        </div>
        {g && (
          <p role="alert" className="text-sm text-danger">
            {g}
          </p>
        )}
        <button onClick={C} disabled={m} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          {m ? <Spinner size={16} /> : <Camera size={18} aria-hidden="true" />} {m ? 'Speichere …' : 'Foto speichern'}
        </button>
        <p className="text-xs text-text-muted text-center">
          Deine Fotos sind privat. Dein Coach sieht sie nur, wenn du sie in den Einstellungen freigibst.
        </p>
      </div>
    </BottomSheet>
  )
}
export function SQ_({ userId: e, readOnly: t = false, consent: n = true, className: r }) {
  let [i, a] = useState(null),
    [o, s] = useState(null),
    [c, l] = useState(30),
    [u, d] = useState(''),
    [f, p] = useState(false),
    [m, h] = useState(null),
    [g, _] = useState(null),
    y = useCallback(async () => {
      a(await ZZ(e))
    }, [e])
  useEffect(() => {
    if (t && !n) {
      a([])
      return
    }
    y()
  }, [y, t, n])
  let b = useMemo(() => {
      let e = new Map()
      for (let t of i ?? []) e.set(t.label, (e.get(t.label) ?? 0) + 1)
      return [...e.entries()].sort((e, t) => t[1] - e[1]).map(([e]) => e)
    }, [i]),
    x = o && b.includes(o) ? o : (b[0] ?? null),
    S = useMemo(() => (i && x ? GZ(i, x, c, u || undefined) : null), [i, x, c, u]),
    C = todayISO()
  useEffect(() => {
    c === 'custom' && !u && S?.before && d(S.before.datum)
  }, [c, u, S])
  async function w(e) {
    ;(_(null), a((t) => t && t.filter((t) => t.id !== e.id)), h(null), await eQ(e))
  }
  if (t && !n)
    return (
      <div className={cn('card flex items-center gap-3 text-sm text-text-secondary', r)}>
        <Lock size={18} className="text-text-muted shrink-0" aria-hidden="true" />
        <span>Körperfotos sind nicht freigegeben. Der Klient kann das in den Einstellungen erlauben.</span>
      </div>
    )
  if (!i)
    return (
      <div className="flex justify-center py-16">
        <Spinner size={32} />
      </div>
    )
  let T = Array.from(i.reduce((e, t) => e.set(t.datum, [...(e.get(t.datum) ?? []), t]), new Map()).entries())
  return (
    <div className={cn('space-y-5', r)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Körperfotos</h2>
        {!t && (
          <button onClick={() => p(true)} className="btn-primary !px-4 !py-2 text-sm flex items-center gap-2">
            <Camera size={16} aria-hidden="true" /> Foto hinzufügen
          </button>
        )}
      </div>
      {i.length === 0 ? (
        <div className="card text-center py-12 space-y-2">
          <Camera size={34} className="text-text-muted mx-auto" aria-hidden="true" />
          <p className="font-semibold text-text-primary">Noch keine Körperfotos</p>
          <p className="text-sm text-text-secondary max-w-xs mx-auto">
            {t
              ? 'Der Klient hat noch keine Fotos hochgeladen.'
              : 'Mach alle paar Wochen ein Foto. So siehst du heute vs. vor 30 Tagen nebeneinander.'}
          </p>
        </div>
      ) : (
        <>
          <div
            className="card space-y-4 enter"
            style={{
              '--d': 40,
            }}
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-brand" aria-hidden="true" />
              <h3 className="font-semibold text-text-primary">Vorher und Nachher</h3>
            </div>
            {b.length > 1 && (
              <div
                className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
                role="group"
                aria-label="Pose wählen"
              >
                {b.map((e) => (
                  <button
                    aria-pressed={x === e}
                    onClick={() => s(e)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-semibold border whitespace-nowrap shrink-0 transition-all active:scale-95',
                      x === e
                        ? 'bg-primary border-brand text-white'
                        : 'border-border text-text-secondary hover:border-brand/40',
                    )}
                    key={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Abstand zum Vergleichsfoto">
              {tQ.map((e) => (
                <button
                  aria-pressed={c === e.key}
                  onClick={() => l(e.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all active:scale-95',
                    c === e.key
                      ? 'bg-brand/15 border-brand/50 text-brand'
                      : 'border-border text-text-muted hover:border-brand/40',
                  )}
                  key={String(e.key)}
                >
                  {e.label}
                </button>
              ))}
            </div>
            {c === 'custom' && (
              <div>
                <label className="label !text-xs" htmlFor="cmp-date">
                  Vorher-Foto am oder um den
                </label>
                <input
                  id="cmp-date"
                  type="date"
                  className="input !w-auto"
                  value={u}
                  max={S?.now.datum}
                  onChange={(e) => d(e.target.value)}
                />
              </div>
            )}
            {S && (
              <div className="max-w-lg mx-auto w-full" key={`${x}-${c}-${u}`}>
                <div className="grid grid-cols-2 gap-3">
                  <figure className="space-y-2 m-0">
                    {S.before ? (
                      <>
                        <AQ_
                          p={S.before}
                          onClick={() => h(S.before)}
                          className="aspect-[3/4] rounded-2xl border border-border enter"
                        />
                        <figcaption className="text-center">
                          <div className="text-xs font-bold text-text-secondary uppercase tracking-wide">Vorher</div>
                          <div className="text-sm font-semibold text-text-primary">{formatDate(S.before.datum)}</div>
                          <div className="text-xs text-text-muted">
                            {nQ(UZ(C, S.before.datum))}
                            {S.before.weightKg != null && ` · ${rQ(S.before.weightKg)}`}
                          </div>
                        </figcaption>
                      </>
                    ) : (
                      <div className="aspect-[3/4] rounded-2xl border border-dashed border-border flex items-center justify-center text-center p-3">
                        <p className="text-xs text-text-muted">
                          Noch kein älteres Foto mit „{S.now.label}“ zum Vergleichen.
                        </p>
                      </div>
                    )}
                  </figure>
                  <figure className="space-y-2 m-0">
                    <AQ_
                      p={S.now}
                      onClick={() => h(S.now)}
                      className="aspect-[3/4] rounded-2xl border-2 border-brand/40 enter"
                    />
                    <figcaption className="text-center">
                      <div className="text-xs font-bold text-brand uppercase tracking-wide">
                        {S.now.datum === C ? 'Heute' : 'Aktuell'}
                      </div>
                      <div className="text-sm font-semibold text-text-primary">{formatDate(S.now.datum)}</div>
                      <div className="text-xs text-text-muted">
                        {nQ(UZ(C, S.now.datum))}
                        {S.now.weightKg != null && ` · ${rQ(S.now.weightKg)}`}
                      </div>
                    </figcaption>
                  </figure>
                </div>
                {S.before && (
                  <p className="text-sm text-text-secondary text-center mt-3" aria-live="polite">
                    <strong className="text-text-primary">{S.gapDays} Tage</strong> dazwischen
                    {S.before.weightKg != null && S.now.weightKg != null && (
                      <>
                        {' '}
                        · Gewicht{' '}
                        <strong className="text-text-primary">{iQ(S.now.weightKg - S.before.weightKg)}</strong>
                      </>
                    )}
                    {S.approximate && S.wanted > 0 && (
                      <span className="block text-xs text-text-muted mt-1">
                        Genau {S.wanted} Tage davor gibt es kein Foto, hier siehst du das nächstgelegene.
                      </span>
                    )}
                  </p>
                )}
                {S.now.datum !== C && !t && UZ(C, S.now.datum) >= 7 && (
                  <p className="text-xs text-text-muted text-center mt-2">
                    Dein letztes Foto ist {nQ(UZ(C, S.now.datum))}. Zeit für ein neues?
                  </p>
                )}
              </div>
            )}
          </div>
          <div
            className="card space-y-4 enter"
            style={{
              '--d': 110,
            }}
          >
            <h3 className="font-semibold text-text-primary">Alle Fotos ({i.length})</h3>
            {T.map(([e, t]) => (
              <div key={e}>
                <div className="text-xs font-semibold text-text-secondary mb-2">
                  {formatDate(e, 'EEEE, dd. MMMM yyyy')}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {t.map((e) => (
                    <div className="space-y-1" key={e.id}>
                      <AQ_
                        p={e}
                        onClick={() => h(e)}
                        className="aspect-[3/4] rounded-xl border border-border hover:border-brand transition-colors"
                      />
                      <div className="text-[11px] text-center font-semibold text-text-secondary truncate">
                        {e.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {m && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 gap-4 fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${m.label}`}
          onClick={() => h(null)}
        >
          <button
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/15 text-white"
            aria-label="Schließen"
            onClick={() => h(null)}
          >
            <X size={20} />
          </button>
          {m.url && (
            <img
              src={m.url}
              alt={`${m.label} vom ${formatDate(m.datum)}`}
              className="max-w-full max-h-[75dvh] object-contain rounded-2xl modal-in"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="text-white text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold">
              {m.label} · {formatDate(m.datum)}
            </div>
            <div className="text-sm text-white/70">
              {nQ(UZ(C, m.datum))}
              {m.weightKg != null && ` · ${rQ(m.weightKg)}`}
            </div>
            <div className="flex gap-2 justify-center mt-3">
              {S && m.label === S.now.label && m.id !== S.now.id && (
                <button
                  className="px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold"
                  onClick={() => {
                    ;(l('custom'), d(m.datum), h(null))
                  }}
                >
                  Als „Vorher“ verwenden
                </button>
              )}
              {!t &&
                (g === m.id ? (
                  <button
                    className="px-4 py-2 rounded-full bg-danger text-bg text-sm font-semibold"
                    onClick={() => w(m)}
                  >
                    Wirklich löschen
                  </button>
                ) : (
                  <button
                    className="px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold flex items-center gap-1.5"
                    onClick={() => _(m.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Löschen
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
      {!t && (
        <OQ_
          open={f}
          onClose={() => p(false)}
          userId={e}
          labels={b}
          defaultLabel={x ?? undefined}
          onSaved={(e) => {
            ;(s(e), y())
          }}
        />
      )}
    </div>
  )
}
export const CQ_ = ({ active: e, payload: t, label: n }) =>
  !e || !t?.length ? null : (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{n}</div>
      <div className="text-text-primary font-bold">{t[0]?.value} kg</div>
    </div>
  )
export function Weight() {
  let { user: e } = useAuth(),
    { colors: t } = useTheme(),
    [n, r] = useState([]),
    [i, a] = useState(true),
    [o, s] = useState(false),
    [c, l] = useState(null),
    [u, d] = useState({
      datum: todayISO(),
      gewicht: '',
      notizen: '',
    }),
    [f, p] = useState(false),
    [m, h] = useState(null),
    [g, _] = useState(null),
    [y, b] = useState(qZ[0]),
    [x, S] = useState(false),
    [C, w] = useState('log'),
    [T, E] = useState(null),
    D = useRef(null)
  async function O() {
    if (!e) return
    let [t, n] = await Promise.all([
      supabase.from('gewicht').select('*').eq('user_id', e.id).order('datum', {
        ascending: true,
      }),
      supabase.from('client_settings').select('zielgewicht').eq('user_id', e.id).single(),
    ])
    ;(r(t.data ?? []), l(n.data?.zielgewicht ?? null), a(false))
  }
  useEffect(() => {
    O()
  }, [e])
  function k(e) {
    h(e)
    let t = new FileReader()
    ;((t.onload = () => _(t.result)), t.readAsDataURL(e))
  }
  async function A(t, n) {
    let r = n.name.split('.').pop() ?? 'jpg',
      i = `${e.id}/${t}.${r}`,
      { error: a } = await supabase.storage.from('body-photos').upload(i, n, {
        upsert: true,
      })
    if (a) return null
    let { data: o } = supabase.storage.from('body-photos').getPublicUrl(i)
    return o.publicUrl
  }
  async function j() {
    if (!e || !u.gewicht) return
    p(true)
    let t = parseFloat(u.gewicht),
      { data: n } = await supabase
        .from('gewicht')
        .upsert(
          {
            user_id: e.id,
            datum: u.datum,
            gewicht: t,
            notizen: u.notizen || null,
          },
          {
            onConflict: 'user_id,datum',
          },
        )
        .select()
        .single()
    if (n && m) {
      S(true)
      let t = await $Z(e.id, m, u.datum, y)
      if (!t.ok && t.reason === 'table') {
        let e = await A(n.id, m)
        e &&
          (await supabase
            .from('gewicht')
            .update({
              foto_url: e,
            })
            .eq('id', n.id))
      }
      S(false)
    }
    ;(await O(),
      s(false),
      d({
        datum: todayISO(),
        gewicht: '',
        notizen: '',
      }),
      h(null),
      _(null),
      p(false))
  }
  async function M(e) {
    let t = n.find((t) => t.id === e)
    if (t?.foto_url) {
      let e = t.foto_url.split('/body-photos/')[1]
      e && (await supabase.storage.from('body-photos').remove([e]))
    }
    ;(await supabase.from('gewicht').delete().eq('id', e), r((t) => t.filter((t) => t.id !== e)))
  }
  let N = n.map((e) => ({
      datum: formatDate(e.datum, 'dd.MM'),
      gewicht: e.gewicht,
    })),
    P = n.at(-1)?.gewicht,
    F = n[0]?.gewicht,
    I = P && F ? P - F : null,
    L = n.length ? Math.min(...n.map((e) => e.gewicht)) - 2 : 50,
    ee = n.length ? Math.max(...n.map((e) => e.gewicht)) + 2 : 100
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Gewicht</h1>
          <p className="text-text-secondary text-sm mt-0.5">Tägliches Gewichtstracking</p>
        </div>
        <button onClick={() => s(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Eintragen
        </button>
      </div>
      <SegmentedTabs
        tabs={[
          {
            key: 'log',
            label: 'Einträge',
          },
          {
            key: 'fotos',
            label: 'Körperfotos',
          },
        ]}
        value={C}
        onChange={(e) => w(e)}
        label="Gewicht oder Körperfotos"
      />
      {C === 'log' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Aktuell',
                value: P ? `${P} kg` : '--',
              },
              {
                label: 'Start',
                value: F ? `${F} kg` : '--',
              },
              {
                label: 'Veränderung',
                value: I === null ? '--' : `${I > 0 ? '+' : ''}${I.toFixed(1)} kg`,
              },
              {
                label: 'Ziel',
                value: c ? `${c} kg` : '--',
              },
            ].map((e) => (
              <div className="card text-center" key={e.label}>
                <div className="text-xl font-bold text-text-primary">{e.value}</div>
                <div className="text-xs text-text-muted mt-1">{e.label}</div>
              </div>
            ))}
          </div>
          {n.length > 1 && (
            <div className="card">
              <h2 className="section-title mb-6">Gewichtsverlauf</h2>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={N}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={t.brand} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={t.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
                  <XAxis
                    dataKey="datum"
                    tick={{
                      fill: t.tick,
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: t.tick,
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                    domain={[L, ee]}
                  />
                  <Tooltip content={<CQ_ />} />
                  {c && (
                    <ReferenceLine
                      y={c}
                      stroke={t.success}
                      strokeDasharray="6 3"
                      label={{
                        value: 'Ziel',
                        fill: t.success,
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="gewicht"
                    stroke={t.brand}
                    strokeWidth={2.5}
                    fill="url(#wGrad)"
                    dot={{
                      fill: t.brand,
                      r: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
      {C === 'log' && (
        <div className="card">
          {i ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : n.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="Noch keine Einträge"
              description="Trage täglich dein Gewicht ein um deinen Fortschritt zu verfolgen."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-text-muted font-medium">Datum</th>
                    <th className="text-right py-2 px-3 text-text-muted font-medium">Gewicht</th>
                    <th className="text-right py-2 px-3 text-text-muted font-medium">Veränderung</th>
                    <th className="text-left py-2 px-3 text-text-muted font-medium">Notizen</th>
                    <th className="text-center py-2 px-3 text-text-muted font-medium">Foto</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...n].reverse().map((e, t, n) => {
                    let r = n[t + 1],
                      i = r ? e.gewicht - r.gewicht : null
                    return (
                      <tr className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors" key={e.id}>
                        <td className="py-2.5 px-3 text-text-secondary">{formatDate(e.datum)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-text-primary">{e.gewicht} kg</td>
                        <td
                          className={`py-2.5 px-3 text-right text-xs font-medium ${i === null ? 'text-text-muted' : i < 0 ? 'text-success' : i > 0 ? 'text-danger' : 'text-text-muted'}`}
                        >
                          {i === null ? '--' : `${i > 0 ? '+' : ''}${i.toFixed(1)} kg`}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted max-w-[120px] truncate">{e.notizen ?? '--'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {e.foto_url ? (
                            <button
                              onClick={() => E(e.foto_url)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-border hover:border-brand transition-colors inline-block"
                            >
                              <img src={e.foto_url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-text-muted text-xs">–</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => M(e.id)}
                            className="p-1.5 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {C === 'fotos' && e && <SQ_ userId={e.id} />}
      {T && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => E(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white">
            <X size={20} />
          </button>
          <img
            src={T}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <Modal
        open={o}
        onClose={() => {
          ;(s(false), h(null), _(null))
        }}
        title="Gewicht eintragen"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Datum</label>
              <input
                type="date"
                className="input"
                value={u.datum}
                onChange={(e) =>
                  d((t) => ({
                    ...t,
                    datum: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Gewicht (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="75.5"
                value={u.gewicht}
                onChange={(e) =>
                  d((t) => ({
                    ...t,
                    gewicht: e.target.value,
                  }))
                }
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="label">Notizen (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Z.B. nach dem Sport"
              value={u.notizen}
              onChange={(e) =>
                d((t) => ({
                  ...t,
                  notizen: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Camera size={13} /> Körperfoto (optional)
            </label>
            <input
              ref={D}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                let t = e.target.files?.[0]
                t && k(t)
              }}
            />
            {g ? (
              <div className="relative">
                <img src={g} alt="Vorschau" className="w-full h-40 object-cover rounded-xl border border-border" />
                <button
                  onClick={() => {
                    ;(h(null), _(null))
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-danger/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => D.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border hover:border-brand/50 hover:bg-brand/5 transition-colors text-sm text-text-muted"
              >
                <Camera size={16} /> Foto aufnehmen oder auswählen
              </button>
            )}
            {g && (
              <div className="mt-3">
                <label className="label !text-xs" htmlFor="weight-photo-label">
                  Beschriftung
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="Beschriftung wählen">
                  {qZ.map((e) => (
                    <button
                      type="button"
                      aria-pressed={y === e}
                      onClick={() => b(e)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${y === e ? 'bg-primary border-brand text-white' : 'border-border text-text-secondary'}`}
                      key={e}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <input
                  id="weight-photo-label"
                  className="input !py-2 text-sm"
                  maxLength={30}
                  value={y}
                  onChange={(e) => b(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                ;(s(false), h(null), _(null))
              }}
              className="btn-secondary flex-1"
            >
              Abbrechen
            </button>
            <button
              onClick={j}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={f || !u.gewicht}
            >
              {(f || x) && <Spinner size={16} />}
              {x ? 'Foto hochladen…' : f ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
