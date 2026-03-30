import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import Button from '../ui/Button'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, sessionChecked, profileError, signOut } = useAuthContext()
  const location = useLocation()

  // Show skeleton while checking session
  if (loading || !sessionChecked) {
    return <LoadingSkeleton />
  }

  // No session -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Session exists but profile failed to load — show error instead of redirect loop
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#333333] mb-2">
            Error al cargar perfil
          </h2>
          <p className="text-sm text-[#6B7280] mb-1">
            No se pudo cargar tu perfil de usuario.
          </p>
          {profileError && (
            <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded-lg">
              {profileError}
            </p>
          )}
          <p className="text-xs text-[#6B7280] mb-6">
            Verifica tu conexion a internet o contacta al administrador.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
            <Button
              onClick={async () => {
                await signOut()
                window.location.href = '/login'
              }}
            >
              Cerrar sesion
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Inactive user safety net
  if (!profile.active) {
    return <Navigate to="/login" replace />
  }

  // Role-based guard
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}
