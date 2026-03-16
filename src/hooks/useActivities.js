import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'

export function useActivities(prospectId) {
  const { profile } = useAuthContext()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchActivities = useCallback(async () => {
    if (!prospectId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*, profiles:advisor_id(full_name)')
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setActivities(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [prospectId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  async function createActivity(activityData) {
    const { data, error } = await supabase
      .from('activities')
      .insert([{
        ...activityData,
        prospect_id: prospectId,
        advisor_id: profile.id,
      }])
      .select('*, profiles:advisor_id(full_name)')
      .single()

    if (error) throw error
    setActivities((prev) => [data, ...prev])
    return data
  }

  return {
    activities,
    loading,
    error,
    fetchActivities,
    createActivity,
  }
}
