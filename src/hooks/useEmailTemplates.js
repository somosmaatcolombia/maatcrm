import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEmailTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setTemplates(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  async function createTemplate(templateData) {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([templateData])
      .select()
      .single()

    if (error) throw error
    setTemplates((prev) => [data, ...prev])
    return data
  }

  async function updateTemplate(id, templateData) {
    const { data, error } = await supabase
      .from('email_templates')
      .update(templateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  async function deleteTemplate(id) {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  async function toggleTemplateActive(id, active) {
    return updateTemplate(id, { active })
  }

  function getTemplatesByCategory(category) {
    return templates.filter(
      (t) => t.active && (t.category === category || t.category === 'general')
    )
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,
    getTemplatesByCategory,
  }
}
