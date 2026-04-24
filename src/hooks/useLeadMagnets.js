import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLeadMagnets() {
  const [responses, setResponses] = useState([])
  const [magnets, setMagnets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    withContact: 0,
    converted: 0,
    avgScore: 0,
    conversionRate: 0,
  })

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
      const conversionRate = withContact > 0 ? Math.round((converted / withContact) * 100) : 0

      setStats({ total, withContact, converted, avgScore, conversionRate })
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

  /**
   * Convert a lead magnet response into a prospect.
   * `overrides` may contain any prospect field to override the defaults pulled from the response.
   * Fields supported: advisor_id, client_type, full_name, email, phone, country, city,
   *   company_name, job_title, pipeline_stage, lead_source, tags, notes.
   */
  async function convertToProspect(responseId, overrides = {}) {
    const response = responses.find(r => r.id === responseId)
    if (!response) throw new Error('Response not found')

    const email = overrides.email ?? response.email
    if (!email) throw new Error('No hay email para crear prospecto')

    const magnetName = response.lead_magnets?.name || 'Lead Magnet'
    const magnetSlug = response.lead_magnets?.slug || 'lead-magnet'

    // Build prospect payload
    const prospectPayload = {
      advisor_id: overrides.advisor_id ?? response.advisor_id,
      client_type: overrides.client_type ?? 'b2c',
      full_name: (overrides.full_name ?? response.full_name ?? 'Sin nombre').trim() || 'Sin nombre',
      email,
      phone: overrides.phone ?? response.phone ?? null,
      country: overrides.country ?? response.country ?? null,
      city: overrides.city ?? null,
      company_name: overrides.company_name ?? null,
      job_title: overrides.job_title ?? null,
      pipeline_stage: overrides.pipeline_stage ?? 'lead_nuevo',
      lead_source: overrides.lead_source ?? magnetName,
      tags: overrides.tags ?? ['lead-magnet', magnetSlug],
    }

    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .insert(prospectPayload)
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

    // Create initial activity on the prospect with full context
    const scoreInfo = response.total_percentage != null
      ? `Puntaje: ${Math.round(response.total_percentage)}%${response.level_name ? ` · Nivel ${response.level_number}: ${response.level_name}` : ''}`
      : null

    const lines = [
      `Convertido desde "${magnetName}"`,
      scoreInfo,
      overrides.notes?.trim() ? `\nNotas: ${overrides.notes.trim()}` : null,
    ].filter(Boolean)

    await supabase.from('activities').insert({
      prospect_id: prospect.id,
      advisor_id: prospectPayload.advisor_id,
      activity_type: 'note',
      title: 'Convertido desde Lead Magnet',
      description: lines.join('\n'),
      metadata: {
        lead_magnet_response_id: responseId,
        lead_magnet_slug: magnetSlug,
        dimension_scores: response.dimension_scores,
        total_percentage: response.total_percentage,
        level_name: response.level_name,
        level_number: response.level_number,
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

  async function reopenResponse(responseId) {
    const { error } = await supabase
      .from('lead_magnet_responses')
      .update({ status: 'completed' })
      .eq('id', responseId)

    if (error) throw error
    setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: 'completed' } : r))
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
    reopenResponse,
  }
}
