/**
 * EthicFlow — Protected Route
 * Redirects to /login if not authenticated.
 * Optionally restricts to specific roles — redirects to /dashboard if unauthorized.
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {{ roles?: string[] }} props — optional role whitelist
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.activeRole || user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
