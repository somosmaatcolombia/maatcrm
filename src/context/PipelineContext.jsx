import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from './AuthContext'

const PipelineContext = createContext(null)

export function PipelineProvider({ children }) {
  const { user, sessionChecked } = useAuthContext()
  const [stages, setStages] = useState({ b2b: [], b2c: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionChecked && user) {
      fetchStages()
    } else if (sessionChecked && !user) {
      setLoading(false)
    }
  }, [sessionChecked, user])

  async function fetchStages() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error

      const b2b = data.filter((s) => s.client_type === 'b2b')
      const b2c = data.filter((s) => s.client_type === 'b2c')

      setStages({ b2b, b2c })
    } catch (error) {
      const msg = error?.message || String(error)
      if (!msg.includes('Failed to fetch') && !msg.includes('fetch failed') && !msg.includes('AbortError') && !msg.includes('Lock broken')) {
        console.error('Error fetching pipeline stages:', msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    stages,
    loading,
    refreshStages: fetchStages,
  }

  return (
    <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>
  )
}

export function usePipelineContext() {
  const context = useContext(PipelineContext)
  if (!context) {
    throw new Error('usePipelineContext must be used within a PipelineProvider')
  }
  return context
}
