import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Serverseitige Prüfung der KI-Einwilligung (Coach oder Client mit consent_ai) */
export async function kiErlaubt(authHeader: string): Promise<boolean> {
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await client.rpc('ki_erlaubt')
  return !error && data === true
}

export const KI_GESPERRT = 'KI-Funktionen sind deaktiviert. Du kannst sie in den Einstellungen aktivieren.'
