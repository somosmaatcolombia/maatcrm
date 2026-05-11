import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('exchanging') // exchanging | success | error
  const [message, setMessage] = useState('Conectando con Google Calendar...')

  useEffect(() => {
    async function exchange() {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setStatus('error')
        setMessage(`Autorización cancelada: ${errorParam}`)
        return
      }

      if (!code) {
        setStatus('error')
        setMessage('No se recibió código de autorización.')
        return
      }

      try {
        const redirectUri = `${window.location.origin}/admin/google-callback`
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: { action: 'oauth-exchange', code, redirect_uri: redirectUri },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)

        setStatus('success')
        setMessage(`Conectado a ${data?.email || 'Google Calendar'} ✓`)
        setTimeout(() => navigate('/admin?tab=google-calendar'), 1500)
      } catch (e) {
        setStatus('error')
        setMessage(e.message || 'Error al conectar')
      }
    }
    exchange()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'exchanging' && (
          <>
            <Loader2 size={48} className="mx-auto text-[#39A1C9] animate-spin mb-3" />
            <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Conectando...</h2>
            <p className="text-sm text-[#6B7280]">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
            <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">¡Conectado!</h2>
            <p className="text-sm text-[#6B7280]">{message}</p>
            <p className="text-xs text-gray-400 mt-3">Redirigiendo...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
            <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Error</h2>
            <p className="text-sm text-[#6B7280] mb-4">{message}</p>
            <button
              onClick={() => navigate('/admin')}
              className="bg-[#39A1C9] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#2E8AB0] transition-colors"
            >
              Volver a Administración
            </button>
          </>
        )}
      </div>
    </div>
  )
}
