import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, configError } from './lib/supabaseClient'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!uid || !supabase) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (error) {
      // Non nascondiamo più l'errore: lo teniamo per mostrarlo a schermo
      // (es. "infinite recursion detected in policy for relation profiles",
      // o un problema di permessi) invece di far sembrare che il profilo
      // semplicemente non esista.
      setProfileError(error)
      setProfile(null)
      return
    }
    setProfileError(null)
    setProfile(data || null)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess)
      await loadProfile(sess?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session])

  return (
    <AuthCtx.Provider value={{ session, profile, loading, refreshProfile, configError, profileError }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
