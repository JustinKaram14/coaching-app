import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.')
}

// Meldet geänderte Tagesdaten (Gewicht, Schlaf, Training, Essen, Supplements, Wasser) an die App,
// damit Tagesstatus und Figur-XP sofort nachziehen.
export const DATA_CHANGED_EVENT = 'hlx:data-changed'
const TRACKED_TABLES = /\/rest\/v1\/(gewicht|schlaf|training|food_log|supplement_log|supplements|wasser_log)(\?|$|\/)/

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: async (input, init) => {
        const response = await fetch(input, init)
        try {
          const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
          if (method !== 'GET' && method !== 'HEAD' && response.ok) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
            if (TRACKED_TABLES.test(url)) window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
          }
        } catch { /* Meldung ist optional */ }
        return response
      },
    },
  }
)
