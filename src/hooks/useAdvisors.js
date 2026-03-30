import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAdvisors() {
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAdvisors = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (fetchError) throw fetchError
      setAdvisors(data || [])
    } catch (err) {
      const msg = err?.message || String(err)
      if (!msg.includes('Failed to fetch') && !msg.includes('fetch failed')) {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdvisors()
  }, [fetchAdvisors])

  async function createAdvisor({ email, password, fullName, phone, role = 'advisor' }) {
    // Save current admin session before creating user
    const { data: { session: adminSession } } = await supabase.auth.getSession()

    // Use signUp (works with anon key, unlike admin.createUser which needs service_role)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })

    if (authError) throw authError

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario. Verifica que el email no este registrado.')
    }

    // Restore admin session immediately (signUp may have switched sessions)
    if (adminSession) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    }

    // Update the profile with additional data (phone)
    if (phone) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', authData.user.id)

      if (profileError) {
        // Non-critical: profile was created by trigger, phone update failed
      }
    }

    await fetchAdvisors()
    return authData.user
  }

  async function updateAdvisor(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setAdvisors((prev) => prev.map((a) => (a.id === id ? data : a)))
    return data
  }

  async function toggleAdvisorActive(id, active) {
    return updateAdvisor(id, { active })
  }

  return {
    advisors,
    activeAdvisors: advisors.filter((a) => a.active),
    loading,
    error,
    fetchAdvisors,
    createAdvisor,
    updateAdvisor,
    toggleAdvisorActive,
  }
}
