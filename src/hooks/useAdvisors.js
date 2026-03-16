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
        console.error('Error fetching advisors:', err)
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
    // Create auth user via Supabase admin (requires service role or edge function)
    // For MVP, we use signUp which triggers the handle_new_user trigger
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })

    if (authError) throw authError

    // Update the profile with additional data
    if (phone) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', authData.user.id)

      if (profileError) throw profileError
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
