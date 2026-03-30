import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const AUTH_ERRORS_ES = {
  'Invalid login credentials': 'Credenciales incorrectas. Verifica tu correo y contrasena.',
  'Email not confirmed': 'Tu correo aun no ha sido confirmado. Revisa tu bandeja de entrada.',
  'User not found': 'No se encontro un usuario con ese correo.',
  'Too many requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'Network request failed': 'Error de conexion. Verifica tu internet.',
  'Failed to fetch': 'Error de conexion. Verifica tu internet e intenta de nuevo.',
  'fetch failed': 'Error de conexion. Verifica tu internet e intenta de nuevo.',
}

function translateAuthError(errorMessage) {
  if (!errorMessage) return 'Ocurrio un error inesperado.'
  for (const [key, value] of Object.entries(AUTH_ERRORS_ES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) return value
  }
  return errorMessage
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [profileError, setProfileError] = useState(null)

  // Track if profile was already loaded by signIn to skip redundant fetch
  const profileLoadedRef = useRef(false)

  const fetchProfile = useCallback(async (userId) => {
    try {
      setProfileError(null)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Block inactive users
      if (data && !data.active) {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        throw new Error('Tu cuenta ha sido desactivada. Contacta al administrador.')
      }

      setProfile(data)
      profileLoadedRef.current = true
      return data
    } catch (error) {
      const msg = error?.message || String(error)
      // Only clear profile if it wasn't already loaded (avoid breaking existing session)
      if (!profileLoadedRef.current) {
        setProfile(null)
        setProfileError(msg)
      }
      throw error
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Safety timeout: if auth check takes too long, show login
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
        setSessionChecked(true)
      }
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setProfile(null)
          setProfileError(null)
          profileLoadedRef.current = false
          setLoading(false)
          setSessionChecked(true)
          return
        }

        setUser(session.user)

        // Skip profile fetch if signIn already loaded it (prevents race condition)
        if (profileLoadedRef.current) {
          if (mounted) {
            setLoading(false)
            setSessionChecked(true)
          }
          return
        }

        // Fetch profile using setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          if (!mounted) return
          try {
            await fetchProfile(session.user.id)
          } catch {
            // handled inside fetchProfile
          } finally {
            if (mounted) {
              setLoading(false)
              setSessionChecked(true)
            }
          }
        }, 0)
      }
    )

    // Try getSession for the initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) {
        setLoading(false)
        setSessionChecked(true)
      }
    }).catch(() => {
      if (mounted) {
        setLoading(false)
        setSessionChecked(true)
      }
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error

      // Fetch and validate profile BEFORE onAuthStateChange fires
      const profileData = await fetchProfile(data.user.id)
      return { user: data.user, profile: profileData }
    } catch (error) {
      throw new Error(translateAuthError(error.message))
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } finally {
      setUser(null)
      setProfile(null)
      setProfileError(null)
      profileLoadedRef.current = false
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (error) throw error
    } catch (error) {
      throw new Error(translateAuthError(error.message))
    }
  }

  async function updateProfile(updates) {
    if (!user) throw new Error('No hay sesion activa.')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  const isAdmin = profile?.role === 'admin'
  const isAdvisor = profile?.role === 'advisor'

  const value = {
    user,
    profile,
    loading,
    sessionChecked,
    profileError,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve(null),
    isAdmin,
    isAdvisor,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
