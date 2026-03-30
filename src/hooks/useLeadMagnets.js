import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLeadMagnets() {
  const [responses, setResponses] = useState([])
  const [magnets, setMagnets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ total: 0, withContact: 0, converted: 0, avgScore: 0 })

  const fetchMagnets = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('lead_magnets')
      .select('*')
      .order('created_at', { ascending: false })

    if (!err) setMagnets(data || [])
  }, [])

  const fetchResponses = useCallback(async (filters = {}) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('lead_magnet_responses')
        .select('*, lead_magnets(name, slug)')
        .order('created_at', { ascending: false })

      if (filters.leadMagnetId) {
        query = query.eq('lead_magnet_id', filters.leadMagnetId)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.hasContact) {
        query = query.not('email', 'is', null)
      }

      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        )
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const rows = data || []
      setResponses(rows)

      // Calculate stats
      const total = rows.length
      const withContact = rows.filter(r => r.email).length
      const converted = rows.filter(r => r.status === 'converted').length
      const avgScore = total > 0
        ? Math.round(rows.reduce((sum, r) => sum + (r.total_percentage || 0), 0) / total)
        : 0

      setStats({ total, withContact, converted, avgScore })
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
    fetchMagnets()
    fetchResponses()
  }, [fetchMagnets, fetchResponses])

  async function assignAdvisor(responseId, advisorId) {
    const { data, error } = await supabase
      .from('lead_magnet_responses')
      .update({ advisor_id: advisorId })
      .eq('id', responseId)
      .select()
      .single()

    if (error) throw error
    setResponses(prev => prev.map(r => r.id === responseId ? { ...r, ...data } : r))
    return data
  }

  async function convertToProspect(responseId) {
    const response = responses.find(r => r.id === responseId)
    if (!response) throw new Error('Response not found')
    if (!response.email) throw new Error('No hay email para crear prospecto')

    // Create prospect from lead magnet data
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .insert({
        advisor_id: response.advisor_id,
        client_type: 'b2c',
        full_name: response.full_name || 'Sin nombre',
        email: response.email,
        phone: response.phone || null,
        country: response.country || null,
        pipeline_stage: 'lead_nuevo',
        lead_source: 'Lead Magnet',
        tags: ['lead-magnet', 'test-performance'],
      })
      .select()
      .single()

    if (prospectError) throw prospectError

    // Update the response to mark as converted
    const { error: updateError } = await supabase
      .from('lead_magnet_responses')
      .update({
        status: 'converted',
        prospect_id: prospect.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', responseId)

    if (updateError) throw updateError

    // Create activity on the prospect
    await supabase.from('activities').insert({
      prospect_id: prospect.id,
      advisor_id: response.advisor_id,
      activity_type: 'note',
      title: 'Convertido desde Lead Magnet',
      description: `Test de Performance Emocional — Puntaje: ${Math.round(response.total_percentage)}% (${response.level_name})`,
      metadata: {
        lead_magnet_response_id: responseId,
        dimension_scores: response.dimension_scores,
      },
    })

    setResponses(prev =>
      prev.map(r =>
        r.id === responseId
          ? { ...r, status: 'converted', prospect_id: prospect.id, converted_at: new Date().toISOString() }
          : r
      )
    )

    return prospect
  }

  async function discardResponse(responseId) {
    const { error } = await supabase
      .from('lead_magnet_responses')
      .update({ status: 'discarded' })
      .eq('id', responseId)

    if (error) throw error
    setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: 'discarded' } : r))
  }

  return {
    responses,
    magnets,
    loading,
    error,
    stats,
    fetchResponses,
    fetchMagnets,
    assignAdvisor,
    convertToProspect,
    discardResponse,
  }
}
