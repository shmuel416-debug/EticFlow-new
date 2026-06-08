/**
 * Ethic-Net — Protected Route
 * Redirects to /login if not authenticated.
 * Optionally restricts to specific roles — redirects to /dashboard if unauthorized.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {{ roles?: string[] }} props — optional role whitelist
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (roles && !roles.includes(user.activeRole || user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
