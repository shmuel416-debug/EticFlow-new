/* eslint-disable react-refresh/only-export-components */
/**
 * EthicFlow — Auth Context
 * Stores JWT in memory (never localStorage). Provides login/logout/user state.
 * Also manages i18n language + HTML dir/lang attribute on language change.
 * Sprint 5: adds impersonation state + startImpersonation/stopImpersonation actions.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api, { setToken, getToken, setActiveRole as persistActiveRole } from '../services/api'

const ROLE_PRIORITY = ['ADMIN', 'CHAIRMAN', 'SECRETARY', 'REVIEWER', 'RESEARCHER']
const ACTIVE_ROLE_STORAGE_KEY = 'ef_active_role_ui'

/**
 * Decodes JWT payload without verifying signature.
 * @param {string} token
 * @returns {object|null}
 */
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/** @type {React.Context} */
const AuthContext = createContext(null)

/**
 * Restores user payload from in-memory/session token storage if valid.
 * @returns {{ id: string, email: string, roles: string[], activeRole: string }|null}
 */
function getInitialUserFromToken() {
  const stored = getToken()
  if (!stored) return null

  const payload = decodeJwt(stored)
  const isExpired = payload && payload.exp && payload.exp * 1000 < Date.now()
  if (!payload || isExpired) {
    setToken(null)
    return null
  }

  const roles = Array.isArray(payload.roles) && payload.roles.length > 0
    ? payload.roles
    : [payload.role || 'RESEARCHER']
  const preferredRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY)
  const activeRole = roles.includes(preferredRole)
    ? preferredRole
    : (ROLE_PRIORITY.find((role) => roles.includes(role)) || 'RESEARCHER')
  return { id: payload.id, email: payload.email, roles, activeRole, role: activeRole }
}

/**
 * Provides authentication state and actions to the component tree.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const { i18n } = useTranslation()
  const [user, setUser]               = useState(() => getInitialUserFromToken())
  const [loading]                     = useState(false)
  /**
   * Sets active role in state and API client.
   * @param {string} role
   */
  const setActiveRole = useCallback((role) => {
    setUser((prev) => {
      if (!prev || !prev.roles.includes(role)) return prev
      return { ...prev, activeRole: role, role }
    })
    localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role)
    persistActiveRole(role)
  }, [])

  const [impersonation, setImpersonation] = useState(null) // { originalUser, originalToken }

  /** Holds the original token during impersonation so we can restore it. */
  const originalTokenRef = useRef(null)

  /** Apply direction + lang to <html> element */
  const applyDirection = useCallback((lang) => {
    document.documentElement.lang = lang
    document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'
  }, [])

  /** Switch UI language and persist to localStorage */
  const changeLanguage = useCallback((lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
    applyDirection(lang)
  }, [i18n, applyDirection])

  /** On mount — apply stored language direction */
  useEffect(() => {
    const lang = localStorage.getItem('lang') || 'he'
    applyDirection(lang)
  }, [applyDirection])

  /** Global session-expired hook triggered by API interceptor. */
  useEffect(() => {
    function onSessionExpired() {
      setToken(null)
      setUser(null)
      setImpersonation(null)
      originalTokenRef.current = null
    }
    window.addEventListener('ef:session-expired', onSessionExpired)
    return () => window.removeEventListener('ef:session-expired', onSessionExpired)
  }, [])

  useEffect(() => {
    persistActiveRole(user?.activeRole || null)
  }, [user?.activeRole])

  /**
   * Authenticates user and stores JWT in memory.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    const roles = Array.isArray(data.user.roles) ? data.user.roles : [data.user.role || 'RESEARCHER']
    const preferredRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY)
    const activeRole = roles.includes(preferredRole)
      ? preferredRole
      : (ROLE_PRIORITY.find((role) => roles.includes(role)) || 'RESEARCHER')
    persistActiveRole(activeRole)
    setUser({ ...data.user, roles, activeRole, role: activeRole })
  }

  /**
   * Decodes the payload section of a JWT without verifying the signature.
   * Safe because the server already validated and issued this token.
   * @param {string} token - Signed JWT
   * @returns {{ id: string, email: string, roles?: string[], role?: string }}
   */
  function decodePayload(token) {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  }

  /**
   * Stores a pre-issued JWT (e.g. from SSO callback) and decodes the user payload.
   * Used by SsoCallbackPage after the backend redirects with a token query param.
   * @param {string} token - Signed JWT from backend
   * @returns {void}
   */
  function loginWithToken(token) {
    setToken(token)
    const payload = decodePayload(token)
    const roles = Array.isArray(payload.roles) && payload.roles.length > 0
      ? payload.roles
      : [payload.role || 'RESEARCHER']
    const preferredRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY)
    const activeRole = roles.includes(preferredRole)
      ? preferredRole
      : (ROLE_PRIORITY.find((role) => roles.includes(role)) || 'RESEARCHER')
    persistActiveRole(activeRole)
    setUser({ id: payload.id, email: payload.email, roles, activeRole, role: activeRole })
  }

  /**
   * Clears auth state and removes JWT from memory.
   */
  function logout() {
    setToken(null)
    persistActiveRole(null)
    setUser(null)
    setImpersonation(null)
    originalTokenRef.current = null
  }

  /**
   * Starts impersonating a target user.
   * Saves the current admin token + user, then swaps to the impersonation token.
   * @param {string} userId - Target user ID to impersonate
   * @returns {Promise<void>}
   */
  async function startImpersonation(userId) {
    // Capture original state before any async work
    const savedToken = getToken()
    const savedUser  = user

    const { data } = await api.post(`/users/admin/impersonate/${userId}`)

    // Save original state for restoration
    originalTokenRef.current = savedToken
    setImpersonation({ originalUser: savedUser, originalToken: savedToken })

    // Swap to impersonation token + user
    setToken(data.token)
    const roles = Array.isArray(data.user.roles) ? data.user.roles : [data.user.role || 'RESEARCHER']
    const activeRole = data.user.activeRole || ROLE_PRIORITY.find((role) => roles.includes(role)) || 'RESEARCHER'
    persistActiveRole(activeRole)
    setUser({ ...data.user, roles, activeRole, role: activeRole })
  }

  /**
   * Stops impersonation and restores the original admin session.
   * @returns {void}
   */
  function stopImpersonation() {
    if (!impersonation) return

    // Restore original token + user
    setToken(originalTokenRef.current)
    persistActiveRole(impersonation.originalUser?.activeRole || impersonation.originalUser?.role || null)
    setUser(impersonation.originalUser)
    setImpersonation(null)
    originalTokenRef.current = null
  }

  /** True when currently impersonating another user. */
  const isImpersonating = !!impersonation

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithToken,
      logout,
      changeLanguage,
      setActiveRole,
      impersonation,
      isImpersonating,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 * @returns {{ user: object|null, loading: boolean, login: Function, loginWithToken: Function,
 *   logout: Function, changeLanguage: Function, impersonation: object|null,
 *   isImpersonating: boolean, startImpersonation: Function, stopImpersonation: Function, setActiveRole: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
