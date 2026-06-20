import { supabase } from '../lib/supabase'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function subscribeToPush(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const registration = await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.error('[Push] VAPID key missing — VITE_VAPID_PUBLIC_KEY not set in build')
      return
    }
    console.log('[Push] VAPID key present:', vapidKey.slice(0, 10) + '...')

    // Unsubscribe any stale subscription (different VAPID key causes AbortError)
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      console.log('[Push] Unsubscribing stale subscription:', existing.endpoint.slice(0, 40) + '...')
      await existing.unsubscribe()
    }

    console.log('[Push] SW state:', registration.active?.state)
    console.log('[Push] Calling pushManager.subscribe...')
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const sub = subscription.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    }, { onConflict: 'user_id' })
  } catch (e) {
    console.error('Push subscription failed:', e)
  }
}

export async function sendPushToUser(targetUserId: string, title: string, body: string, url?: string) {
  await supabase.functions.invoke('send-notification', {
    body: { targetUserId, title, body, url },
  })
}
