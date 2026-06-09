/**
 * Ethic-Net — Protected Route
 * Redirects to /login if not authenticated.
 * Optionally restricts to specific roles — auto-elevates active role when possible.
 */

import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Dispatches a global role-switch event for toast feedback.
 * @param {string} role
 * @param {boolean} auto
 */
function notifyRoleSwitch(role, auto) {
  window.dispatchEvent(new CustomEvent('ef:role-switched', { detail: { role, auto } }))
}

/**
 * @param {{ roles?: string[] }} props — optional role whitelist
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading, setActiveRole } = useAuth()
  const location = useLocation()
  const autoSwitchRef = useRef(false)

  useEffect(() => {
    autoSwitchRef.current = false
  }, [location.pathname])

  useEffect(() => {
    if (!roles?.length || !user || autoSwitchRef.current) return
    const activeRole = user.activeRole || user.role
    if (roles.includes(activeRole)) return

    const elevated = roles.find((role) => user.roles?.includes(role))
    if (!elevated) return

    autoSwitchRef.current = true
    void setActiveRole(elevated)
    notifyRoleSwitch(elevated, true)
  }, [roles, user, setActiveRole, location.pathname])

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (roles?.length) {
    const activeRole = user.activeRole || user.role
    if (!roles.includes(activeRole)) {
      const canElevate = roles.some((role) => user.roles?.includes(role))
      if (canElevate) return null
      return (
        <Navigate
          to="/dashboard"
          replace
          state={{ roleDenied: true, requiredRoles: roles }}
        />
      )
    }
  }

  return <Outlet />
}
