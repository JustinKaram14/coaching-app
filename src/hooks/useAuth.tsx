import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string, inviteCode: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    // Update last_active silently — used by coach dashboard to show activity
    supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', userId)
    import('./usePushNotifications').then(m => m.subscribeToPush(userId))
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email: string, password: string, name: string, inviteCode: string) {
    // Validate invite code
    const { data: code, error: codeError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.toUpperCase().trim())
      .is('used_by', null)
      .single()

    if (codeError || !code) {
      return { error: new Error('Ungültiger oder bereits verwendeter Einladungscode.') }
    }

    // Check expiry
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { error: new Error('Dieser Einladungscode ist abgelaufen.') }
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`,
      },
    })
    if (signUpError || !authData.user) return { error: signUpError }

    // Upsert profile — trigger may have already created it without coach_id
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email,
      name,
      role: 'client',
      coach_id: code.coach_id,
    }, { onConflict: 'id' })

    // Mark code as used
    await supabase.from('invite_codes').update({ used_by: authData.user.id }).eq('id', code.id)

    // Create default client settings
    await supabase.from('client_settings').insert({
      user_id: authData.user.id,
      kalorie_tagesziel: 2000,
      trainings_pro_woche: 4,
      schlaf_ziel: 8,
      startdatum: new Date().toISOString().split('T')[0],
    })

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
