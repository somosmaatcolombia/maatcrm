import { useAuthContext } from '../context/AuthContext'
import { ROLES } from '../lib/constants'

/**
 * Hook wrapper for AuthContext.
 * Provides auth state + convenience helpers.
 */
export function useAuth() {
  const context = useAuthContext()

  return {
    ...context,
    hasRole: (role) => context.profile?.role === role,
    canManageProspect: (prospect) =>
      context.isAdmin || prospect?.advisor_id === context.user?.id,
    isAuthenticated: !!context.user && !!context.profile,
    ROLES,
  }
}
