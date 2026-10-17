// Eigene Artikel der Einkaufsliste (Tabelle einkauf_artikel)

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { EigenerArtikel } from './liste'

export function useEigeneArtikel(userId: string) {
  const [artikel, setArtikel] = useState<EigenerArtikel[]>([])
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    let aktiv = true
    supabase.from('einkauf_artikel').select('id,text').eq('user_id', userId).order('created_at').then(({ data, error }) => {
      if (!aktiv) return
      if (error) setFehler('Eigene Artikel konnten nicht geladen werden.')
      else setArtikel((data ?? []) as EigenerArtikel[])
    })
    return () => { aktiv = false }
  }, [userId])

  const hinzufuegen = useCallback(async (text: string): Promise<boolean> => {
    const t = text.trim().slice(0, 120)
    if (!t) return false
    setFehler('')
    const { data, error } = await supabase.from('einkauf_artikel').insert({ user_id: userId, text: t }).select('id,text').single()
    if (error || !data) { setFehler('Der Artikel konnte nicht gespeichert werden.'); return false }
    setArtikel(prev => [...prev, data as EigenerArtikel])
    return true
  }, [userId])

  const entfernen = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setArtikel(prev => prev.filter(a => !ids.includes(a.id)))
    const { error } = await supabase.from('einkauf_artikel').delete().in('id', ids)
    if (error) setFehler('Der Artikel konnte nicht entfernt werden.')
  }, [])

  const leeren = useCallback(async () => {
    setArtikel([])
    await supabase.from('einkauf_artikel').delete().eq('user_id', userId)
  }, [userId])

  return { artikel, hinzufuegen, entfernen, leeren, fehler }
}
