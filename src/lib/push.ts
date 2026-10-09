// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { supabase } from './supabase'

export const PUSH_USER_KEY = 'hlx-push-user'
export const isIOS = () =>
  typeof navigator < 'u' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
export const isStandalone = () =>
  typeof window < 'u' && (navigator.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches)
export const pushCapable = () =>
  typeof window < 'u' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export function deviceLabel() {
  let e = navigator.userAgent
  if (/iPhone/.test(e)) return 'iPhone'
  if (/iPad/.test(e) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Android/.test(e)) return /Mobile/.test(e) ? 'Android-Handy' : 'Android-Tablet'
  let t = /Edg\//.test(e)
    ? 'Edge'
    : /Firefox\//.test(e)
      ? 'Firefox'
      : /Chrome\//.test(e)
        ? 'Chrome'
        : /Safari\//.test(e)
          ? 'Safari'
          : 'Browser'
  return `${/Mac OS X/.test(e) ? 'Mac' : /Windows/.test(e) ? 'Windows' : /Linux/.test(e) ? 'Linux' : 'Computer'} (${t})`
}
export async function serviceWorkerReady(e = 6e3) {
  try {
    return 'serviceWorker' in navigator
      ? await Promise.race([navigator.serviceWorker.ready, new Promise((t) => setTimeout(() => t(null), e))])
      : null
  } catch {
    return null
  }
}
export const getPushUser = () => {
  try {
    return localStorage.getItem(PUSH_USER_KEY)
  } catch {
    return null
  }
}
export const setPushUser = (e) => {
  try {
    e ? localStorage.setItem(PUSH_USER_KEY, e) : localStorage.removeItem(PUSH_USER_KEY)
  } catch {}
}
export async function getPushState() {
  if (!pushCapable()) return isIOS() ? (isStandalone() ? 'ios-old' : 'ios-install') : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'off'
  let e = await serviceWorkerReady(3e3)
  return e ? ((await e.pushManager.getSubscription()) ? 'on' : 'off') : 'unsupported'
}
export async function saveTimezone(e) {
  try {
    let t = Intl.DateTimeFormat().resolvedOptions().timeZone
    t &&
      (await supabase
        .from('client_settings')
        .update({
          timezone: t,
        })
        .eq('user_id', e))
  } catch {}
}
export async function saveSubscription(e, t) {
  let n = t.toJSON()
  if (!n.endpoint || !n.keys?.p256dh || !n.keys?.auth) return
  let r = {
      user_id: e,
      endpoint: n.endpoint,
      p256dh: n.keys.p256dh,
      auth: n.keys.auth,
    },
    i = {
      ...r,
      user_agent: navigator.userAgent.slice(0, 250),
      device_label: deviceLabel(),
      last_seen_at: new Date().toISOString(),
    },
    { error: a } = await supabase.from('push_subscriptions').upsert(i, {
      onConflict: 'endpoint',
    })
  a &&
    (await supabase.from('push_subscriptions').upsert(r, {
      onConflict: 'user_id',
    }))
}
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Liefert das Push-Abo dieses Geräts; legt es an, falls es fehlt oder mit einem anderen VAPID-Schlüssel erstellt wurde
export async function getOrCreateSubscription(registration: ServiceWorkerRegistration) {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.error('[Push] VITE_VAPID_PUBLIC_KEY fehlt im Build')
    return null
  }
  const key = urlBase64ToUint8Array(vapidKey)
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    const current = existing.options.applicationServerKey
    const same = current && new Uint8Array(current).length === key.length && new Uint8Array(current).every((b, i) => b === key[i])
    if (same) return existing
    await existing.unsubscribe() // anderer Schlüssel: neu anlegen, sonst bricht subscribe() mit AbortError ab
  }
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
}
export async function enablePush(e) {
  if (!pushCapable()) return 'unsupported'
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied'
    let t = await serviceWorkerReady()
    if (!t) return 'error'
    let n = await getOrCreateSubscription(t)
    return n ? (await saveSubscription(e, n), await saveTimezone(e), setPushUser(e), 'ok') : 'error'
  } catch (e) {
    return (console.error('Push-Aktivierung fehlgeschlagen:', e), 'error')
  }
}
export async function refreshPushSubscription(e) {
  try {
    if (!pushCapable() || Notification.permission !== 'granted' || getPushUser() !== e) return
    let t = await serviceWorkerReady(4e3)
    if (!t) return
    let n = await getOrCreateSubscription(t)
    ;(n && (await saveSubscription(e, n)), await saveTimezone(e))
  } catch (e) {
    console.error('Push-Abo erneuern fehlgeschlagen:', e)
  }
}
export async function disablePush(e) {
  try {
    let t = await (await serviceWorkerReady(3e3))?.pushManager.getSubscription()
    t &&
      (await supabase.from('push_subscriptions').delete().eq('user_id', e).eq('endpoint', t.endpoint),
      await t.unsubscribe())
  } finally {
    setPushUser(null)
  }
}
export async function forgetThisDevice(e) {
  getPushUser() === e && (await disablePush(e).catch(() => {}))
}
export async function listDevices(e) {
  let { data: t } = await supabase.from('push_subscriptions').select('*').eq('user_id', e),
    n = (await (await serviceWorkerReady(2e3))?.pushManager.getSubscription())?.endpoint
  return (t ?? []).map((e) => ({
    id: e.id,
    endpoint: e.endpoint,
    device_label: e.device_label ?? null,
    last_seen_at: e.last_seen_at ?? null,
    thisDevice: !!n && e.endpoint === n,
  }))
}
export async function removeDevice(e) {
  await supabase.from('push_subscriptions').delete().eq('id', e)
}
export async function sendPushToUser(e, t, n, r) {
  let { data: i, error: a } = await supabase.functions.invoke('send-notification', {
    body: {
      targetUserId: e,
      title: t,
      body: n,
      url: r,
    },
  })
  return {
    data: i,
    error: a,
  }
}
