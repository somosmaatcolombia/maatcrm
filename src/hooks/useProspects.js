import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'

export function useProspects(filters = {}) {
  const { profile, isAdmin } = useAuthContext()
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('prospects')
        .select('*, profiles:advisor_id(full_name, email)')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.clientType) {
        query = query.eq('client_type', filters.clientType)
      }
      if (filters.pipelineStage) {
        query = query.eq('pipeline_stage', filters.pipelineStage)
      }
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
        )
      }
      if (filters.advisorId) {
        query = query.eq('advisor_id', filters.advisorId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setProspects(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, isAdmin, filters.clientType, filters.pipelineStage, filters.search, filters.advisorId])

  useEffect(() => {
    if (profile) {
      fetchProspects()
    }
  }, [fetchProspects, profile])

  async function createProspect(prospectData) {
    const { data, error } = await supabase
      .from('prospects')
      .insert([{ ...prospectData, advisor_id: prospectData.advisor_id || profile.id }])
      .select()
      .single()

    if (error) throw error
    setProspects((prev) => [data, ...prev])
    return data
  }

  async function updateProspect(id, updates) {
    const { data, error } = await supabase
      .from('prospects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setProspects((prev) => prev.map((p) => (p.id === id ? data : p)))
    return data
  }

  async function deleteProspect(id) {
    const { error } = await supabase.from('prospects').delete().eq('id', id)
    if (error) throw error
    setProspects((prev) => prev.filter((p) => p.id !== id))
  }

  return {
    prospects,
    loading,
    error,
    fetchProspects,
    createProspect,
    updateProspect,
    deleteProspect,
  }
}
