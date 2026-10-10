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
  let agent = navigator.userAgent
  if (/iPhone/.test(agent)) return 'iPhone'
  if (/iPad/.test(agent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Android/.test(agent)) return /Mobile/.test(agent) ? 'Android-Handy' : 'Android-Tablet'
  let browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent)
          ? 'Safari'
          : 'Browser'
  return `${/Mac OS X/.test(agent) ? 'Mac' : /Windows/.test(agent) ? 'Windows' : /Linux/.test(agent) ? 'Linux' : 'Computer'} (${browser})`
}
export async function serviceWorkerReady(timeoutMs = 6e3) {
  try {
    return 'serviceWorker' in navigator
      ? await Promise.race([navigator.serviceWorker.ready, new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))])
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
export const setPushUser = (userId) => {
  try {
    userId ? localStorage.setItem(PUSH_USER_KEY, userId) : localStorage.removeItem(PUSH_USER_KEY)
  } catch {}
}
export async function getPushState() {
  if (!pushCapable()) return isIOS() ? (isStandalone() ? 'ios-old' : 'ios-install') : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'off'
  let stateWorker = await serviceWorkerReady(3e3)
  return stateWorker ? ((await stateWorker.pushManager.getSubscription()) ? 'on' : 'off') : 'unsupported'
}
export async function saveTimezone(userId) {
  try {
    let zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    zone &&
      (await supabase
        .from('client_settings')
        .update({
          timezone: zone,
        })
        .eq('user_id', userId))
  } catch {}
}
export async function saveSubscription(userId, subscription) {
  let json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return
  let basicRow = {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    fullRow = {
      ...basicRow,
      user_agent: navigator.userAgent.slice(0, 250),
      device_label: deviceLabel(),
      last_seen_at: new Date().toISOString(),
    },
    { error: upsertError } = await supabase.from('push_subscriptions').upsert(fullRow, {
      onConflict: 'endpoint',
    })
  upsertError &&
    (await supabase.from('push_subscriptions').upsert(basicRow, {
      onConflict: 'user_id',
    }))
}
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)))
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
    const same = current && new Uint8Array(current).length === key.length && new Uint8Array(current).every((byte, index) => byte === key[index])
    if (same) return existing
    await existing.unsubscribe() // anderer Schlüssel: neu anlegen, sonst bricht subscribe() mit AbortError ab
  }
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
}
export async function enablePush(userId) {
  if (!pushCapable()) return 'unsupported'
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied'
    let worker = await serviceWorkerReady()
    if (!worker) return 'error'
    let subscription = await getOrCreateSubscription(worker)
    return subscription ? (await saveSubscription(userId, subscription), await saveTimezone(userId), setPushUser(userId), 'ok') : 'error'
  } catch (pushError) {
    return (console.error('Push-Aktivierung fehlgeschlagen:', pushError), 'error')
  }
}
export async function refreshPushSubscription(userId) {
  try {
    if (!pushCapable() || Notification.permission !== 'granted' || getPushUser() !== userId) return
    let worker = await serviceWorkerReady(4e3)
    if (!worker) return
    let subscription = await getOrCreateSubscription(worker)
    ;(subscription && (await saveSubscription(userId, subscription)), await saveTimezone(userId))
  } catch (pushError) {
    console.error('Push-Abo erneuern fehlgeschlagen:', pushError)
  }
}
export async function disablePush(userId) {
  try {
    let subscription = await (await serviceWorkerReady(3e3))?.pushManager.getSubscription()
    subscription &&
      (await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint),
      await subscription.unsubscribe())
  } finally {
    setPushUser(null)
  }
}
export async function forgetThisDevice(userId) {
  getPushUser() === userId && (await disablePush(userId).catch(() => {}))
}
export async function listDevices(userId) {
  let { data: rows } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId),
    thisEndpoint = (await (await serviceWorkerReady(2e3))?.pushManager.getSubscription())?.endpoint
  return (rows ?? []).map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    device_label: row.device_label ?? null,
    last_seen_at: row.last_seen_at ?? null,
    thisDevice: !!thisEndpoint && row.endpoint === thisEndpoint,
  }))
}
export async function removeDevice(deviceId) {
  await supabase.from('push_subscriptions').delete().eq('id', deviceId)
}
export async function sendPushToUser(recipientId, heading, message, link) {
  let { data: result, error: invokeError } = await supabase.functions.invoke('send-notification', {
    body: {
      targetUserId: recipientId,
      title: heading,
      body: message,
      url: link,
    },
  })
  return {
    data: result,
    error: invokeError,
  }
}
