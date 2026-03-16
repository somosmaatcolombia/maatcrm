import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import LoadingSkeleton from '../ui/LoadingSkeleton'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, sessionChecked } = useAuthContext()
  const location = useLocation()

  // Show skeleton while checking session
  if (loading || !sessionChecked) {
    return <LoadingSkeleton />
  }

  // No session → redirect to login, preserving intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Session exists but profile failed to load — redirect to login
  if (!profile) {
    return <Navigate to="/login" replace />
  }

  // Inactive user was already handled in AuthContext (signed out automatically).
  // This is a safety net:
  if (!profile.active) {
    return <Navigate to="/login" replace />
  }

  // Role-based guard
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}
