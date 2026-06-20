import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://justinkaram14.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!

  webpush.setVapidDetails('mailto:justinkaram1410@gmail.com', vapidPublic, vapidPrivate)

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { targetUserId, title, body, url } = await req.json()

  if (!targetUserId || !title) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders })
  }

  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', targetUserId)
    .single()

  if (!sub) {
    return new Response(JSON.stringify({ sent: false, reason: 'no subscription' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body, url: url || 'https://justinkaram14.github.io/coaching-app/' })
    )
    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Push failed:', err)
    return new Response(JSON.stringify({ sent: false, error: String(err) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
