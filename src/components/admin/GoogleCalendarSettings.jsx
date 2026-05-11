import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Unlink,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

// IMPORTANT: This must be the same redirect URI registered in Google Cloud Console
function getRedirectUri() {
  return `${window.location.origin}/admin/google-callback`
}

// Optional: read from env var, otherwise empty (admin must paste it)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function GoogleCalendarSettings() {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState({ connected: false })
  const [calendars, setCalendars] = useState([])
  const [selectedCalendar, setSelectedCalendar] = useState('')

  async function fetchStatus() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'status' },
      })
      if (error) throw error
      setStatus(data || { connected: false })
      setSelectedCalendar(data?.calendar_id || 'primary')
      if (data?.connected) loadCalendars()
    } catch (e) {
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  async function loadCalendars() {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'list-calendars' },
      })
      if (error) throw error
      setCalendars(data?.calendars || [])
    } catch (_) {
      setCalendars([])
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  function startOAuthFlow() {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Falta configurar VITE_GOOGLE_CLIENT_ID en Vercel')
      return
    }
    setConnecting(true)
    const redirectUri = getRedirectUri()
    const scope = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'openid',
      'email',
    ].join(' ')
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', scope)
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    window.location.href = url.toString()
  }

  async function handleDisconnect() {
    if (!window.confirm('¿Desconectar Google Calendar? Las llamadas futuras no se sincronizarán automáticamente.')) return
    try {
      await supabase.functions.invoke('google-calendar', { body: { action: 'disconnect' } })
      toast.success('Desconectado')
      setStatus({ connected: false })
      setCalendars([])
    } catch (e) {
      toast.error('Error al desconectar')
    }
  }

  async function handleSetCalendar(calendarId) {
    try {
      await supabase.functions.invoke('google-calendar', {
        body: { action: 'set-calendar', calendar_id: calendarId },
      })
      setSelectedCalendar(calendarId)
      toast.success('Calendario actualizado')
    } catch (e) {
      toast.error('Error al cambiar calendario')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#39A1C9]" size={20} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                status.connected ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Calendar size={22} className={status.connected ? 'text-green-600' : 'text-gray-400'} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                Google Calendar
                {status.connected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Desconectado
                  </span>
                )}
              </h3>
              {status.connected ? (
                <p className="text-sm text-[#6B7280] mt-1">
                  Cuenta: <strong>{status.email || '—'}</strong>
                </p>
              ) : (
                <p className="text-sm text-[#6B7280] mt-1">
                  Conecta el calendario central de MAAT para sincronizar automáticamente las llamadas de descubrimiento con Google Meet
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.connected ? (
              <>
                <Button variant="outline" size="sm" onClick={fetchStatus}>
                  <RefreshCw size={14} /> Refrescar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Unlink size={14} /> Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={startOAuthFlow} loading={connecting}>
                <Calendar size={16} /> Conectar Google Calendar
              </Button>
            )}
          </div>
        </div>

        {/* Calendar picker */}
        {status.connected && calendars.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
              Calendario activo para llamadas
            </label>
            <select
              value={selectedCalendar}
              onChange={(e) => handleSetCalendar(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none bg-white"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.primary ? '(principal)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#6B7280] mt-1.5">
              Las llamadas se crearán en este calendario con un Google Meet auto-generado y los asesores como invitados.
            </p>
          </div>
        )}
      </div>

      {/* Setup instructions */}
      {!status.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="text-sm font-bold text-[#1A1A2E] mb-2 flex items-center gap-2">
            <AlertCircle size={14} /> Antes de conectar
          </h4>
          <ol className="text-xs text-[#6B7280] space-y-2 list-decimal list-inside">
            <li>
              Crea credenciales OAuth en{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#39A1C9] hover:underline inline-flex items-center gap-0.5"
              >
                Google Cloud Console <ExternalLink size={10} />
              </a>
            </li>
            <li>
              Habilita la <strong>Google Calendar API</strong> en tu proyecto
            </li>
            <li>
              Configura la <strong>URI de redirección autorizada</strong>:
              <code className="block bg-white border border-blue-200 rounded px-2 py-1 mt-1 text-[10px] font-mono break-all">
                {getRedirectUri()}
              </code>
            </li>
            <li>
              Añade <code className="bg-white px-1 rounded text-[10px]">VITE_GOOGLE_CLIENT_ID</code> en Vercel y los secretos del Edge Function en Supabase:
              <code className="block bg-white border border-blue-200 rounded px-2 py-1 mt-1 text-[10px] font-mono">
                supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
              </code>
            </li>
            <li>
              Refresca esta página y haz clic en <strong>"Conectar Google Calendar"</strong>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
