import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'

export function useDiscoveryCalls(filters = {}) {
  const { profile } = useAuthContext()
  const [calls, setCalls] = useState([])
  const [qualifications, setQualifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    conversionRate: 0,
    pendingQualifications: 0,
    qualifiedNotBooked: 0,
  })

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let q = supabase
        .from('discovery_calls')
        .select('*, prospect:prospect_id(id, full_name, email, phone, pipeline_stage, client_type), advisor:advisor_id(id, full_name, email), qualification:qualification_id(*)')
        .order('scheduled_at', { ascending: false })

      if (filters.status) q = q.eq('status', filters.status)
      if (filters.advisorId) q = q.eq('advisor_id', filters.advisorId)
      if (filters.from) q = q.gte('scheduled_at', filters.from)
      if (filters.to) q = q.lte('scheduled_at', filters.to)

      const { data, error: err } = await q
      if (err) throw err

      const list = data || []
      setCalls(list)

      const now = new Date()
      const upcoming = list.filter((c) => c.status === 'scheduled' && new Date(c.scheduled_at) >= now).length
      const completed = list.filter((c) => c.status === 'completed').length
      const cancelled = list.filter((c) => c.status === 'cancelled').length
      const noShow = list.filter((c) => c.status === 'no_show').length
      const wonCount = list.filter((c) => c.outcome === 'won').length
      const conversionRate = completed > 0 ? Math.round((wonCount / completed) * 100) : 0

      setStats((prev) => ({
        ...prev,
        upcoming,
        completed,
        cancelled,
        noShow,
        conversionRate,
      }))
    } catch (e) {
      const msg = e?.message || String(e)
      if (!msg.includes('Failed to fetch') && !msg.includes('fetch failed')) setError(msg)
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.advisorId, filters.from, filters.to])

  const fetchQualifications = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('call_qualifications')
        .select('*, config:config_id(slug, name, min_qualification_score), prospect:prospect_id(id, full_name)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (err) throw err

      const list = data || []
      setQualifications(list)

      const pending = list.filter((q) => q.status === 'pending' || q.status === 'qualified' || q.status === 'borderline').length
      const qualifiedNotBooked = list.filter((q) => q.status === 'qualified').length
      setStats((prev) => ({ ...prev, pendingQualifications: pending, qualifiedNotBooked }))
    } catch (e) {
      const msg = e?.message || String(e)
      if (!msg.includes('Failed to fetch')) console.error('Error fetching qualifications:', msg)
    }
  }, [])

  useEffect(() => {
    if (profile) {
      fetchCalls()
      fetchQualifications()
    }
  }, [profile, fetchCalls, fetchQualifications])

  async function createCall(payload) {
    const { data, error: err } = await supabase
      .from('discovery_calls')
      .insert(payload)
      .select('*, prospect:prospect_id(id, full_name, email, phone, pipeline_stage, client_type), advisor:advisor_id(id, full_name, email), qualification:qualification_id(*)')
      .single()
    if (err) throw err

    // If linked to a qualification, mark it as booked
    if (payload.qualification_id) {
      await supabase
        .from('call_qualifications')
        .update({ status: 'booked' })
        .eq('id', payload.qualification_id)
    }

    // Try to create Google Calendar event (silent fail if not connected)
    let synced = data
    try {
      const { data: gcal, error: gerr } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'create-event', call_id: data.id },
      })
      if (!gerr && gcal?.event_id) {
        // Re-fetch to get the updated row with google_event_id + meeting_link
        const { data: refreshed } = await supabase
          .from('discovery_calls')
          .select('*, prospect:prospect_id(id, full_name, email, phone, pipeline_stage, client_type), advisor:advisor_id(id, full_name, email), qualification:qualification_id(*)')
          .eq('id', data.id)
          .single()
        if (refreshed) synced = refreshed
      }
    } catch (_) {
      // Calendar not connected — that's OK
    }

    setCalls((prev) => [synced, ...prev])
    return synced
  }

  async function updateCall(id, updates) {
    const completedFields = updates.status === 'completed' && !updates.completed_at
      ? { ...updates, completed_at: new Date().toISOString() }
      : updates
    const cancelledFields = updates.status === 'cancelled' && !updates.cancelled_at
      ? { ...completedFields, cancelled_at: new Date().toISOString() }
      : completedFields

    const { data, error: err } = await supabase
      .from('discovery_calls')
      .update(cancelledFields)
      .eq('id', id)
      .select('*, prospect:prospect_id(id, full_name, email, phone, pipeline_stage, client_type), advisor:advisor_id(id, full_name, email), qualification:qualification_id(*)')
      .single()
    if (err) throw err

    // Sync to Google Calendar (best-effort)
    try {
      if (updates.status === 'cancelled' && data.google_event_id) {
        await supabase.functions.invoke('google-calendar', {
          body: { action: 'cancel-event', call_id: id },
        })
      } else if (data.google_event_id && (updates.scheduled_at || updates.duration_min || updates.call_notes || updates.advisor_id)) {
        await supabase.functions.invoke('google-calendar', {
          body: { action: 'update-event', call_id: id },
        })
      }
    } catch (_) {
      // ignore — calendar not connected
    }

    setCalls((prev) => prev.map((c) => (c.id === id ? data : c)))
    return data
  }

  async function deleteCall(id) {
    // First try to cancel the Google event
    try {
      await supabase.functions.invoke('google-calendar', {
        body: { action: 'cancel-event', call_id: id },
      })
    } catch (_) {}

    const { error: err } = await supabase.from('discovery_calls').delete().eq('id', id)
    if (err) throw err
    setCalls((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    calls,
    qualifications,
    loading,
    error,
    stats,
    fetchCalls,
    fetchQualifications,
    createCall,
    updateCall,
    deleteCall,
  }
}
