import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn, KeyRound } from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { showError, showSuccess } from '../components/ui/Toast'

export default function LoginPage() {
  const { user, loading, signIn, resetPassword } = useAuthContext()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [resettingSent, setResettingSent] = useState(false)

  if (loading) {
    return <LoadingSkeleton />
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (error) {
      showError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    try {
      await resetPassword(email)
      setResettingSent(true)
      showSuccess('Se envió un enlace de recuperación a tu correo.')
    } catch (error) {
      showError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background layers — paper cut effect */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#39A1C9]/5 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-[#EBA055]/5 rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-[#39A1C9]/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main card — elevated paper layer */}
        <div className="bg-white rounded-xl shadow-md p-8 transition-shadow duration-200 hover:shadow-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <img src="/maat-logo.png" alt="MAAT" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-[#333333] tracking-tight">
              MAAT <span className="text-[#EBA055]">CRM</span>
            </h1>
            <p className="text-[#6B7280] mt-1.5 text-sm">
              {mode === 'login'
                ? 'Ingresa a tu cuenta para continuar'
                : 'Ingresa tu correo para recuperar tu contraseña'}
            </p>
          </div>

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                required
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#333333]">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#333333] transition-colors duration-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-[#39A1C9] hover:text-[#EBA055] transition-colors duration-200 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                loading={submitting}
                className="w-full"
                size="lg"
              >
                <LogIn size={18} />
                Iniciar sesión
              </Button>
            </form>
          )}

          {/* Forgot password form */}
          {mode === 'forgot' && !resettingSent && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                required
              />

              <Button
                type="submit"
                loading={submitting}
                className="w-full"
                size="lg"
              >
                <KeyRound size={18} />
                Enviar enlace de recuperación
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-[#6B7280] hover:text-[#333333] transition-colors duration-200 text-center"
              >
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {/* Reset email sent confirmation */}
          {mode === 'forgot' && resettingSent && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                <KeyRound size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[#333333] font-medium">¡Correo enviado!</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setResettingSent(false)
                }}
                className="text-sm text-[#39A1C9] hover:text-[#EBA055] transition-colors duration-200 font-medium"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#6B7280] mt-6">
          MAAT · Mentoría de Alto Rendimiento
        </p>
      </div>
    </div>
  )
}
