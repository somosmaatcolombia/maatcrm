import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEmailHistory(prospectId = null) {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('sent_emails')
        .select('*, email_templates:template_id(name), profiles:advisor_id(full_name), prospects:prospect_id(full_name, email)')
        .order('sent_at', { ascending: false })

      if (prospectId) {
        query = query.eq('prospect_id', prospectId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setEmails(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [prospectId])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  return {
    emails,
    loading,
    error,
    fetchEmails,
  }
}
