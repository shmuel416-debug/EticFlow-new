/**
 * EthicFlow — Auth Context
 * Stores JWT in memory (never localStorage). Provides login/logout/user state.
 * Also manages i18n language + HTML dir/lang attribute on language change.
 * Sprint 5: adds impersonation state + startImpersonation/stopImpersonation actions.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api, { setToken, getToken } from '../services/api'

/** @type {React.Context} */
const AuthContext = createContext(null)

/**
 * Provides authentication state and actions to the component tree.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const { i18n } = useTranslation()
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
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

  /**
   * Attempt silent session restore via GET /api/auth/me.
   * Token is stored in memory via setToken() after login.
   * On page refresh the token is gone — user must log in again.
   */
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 0)
    return () => clearTimeout(id)
  }, [])

  /**
   * Authenticates user and stores JWT in memory.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
  }

  /**
   * Clears auth state and removes JWT from memory.
   */
  function logout() {
    setToken(null)
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
    setUser(data.user)
  }

  /**
   * Stops impersonation and restores the original admin session.
   * @returns {void}
   */
  function stopImpersonation() {
    if (!impersonation) return

    // Restore original token + user
    setToken(originalTokenRef.current)
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
      logout,
      changeLanguage,
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
 * @returns {{ user: object|null, loading: boolean, login: Function, logout: Function,
 *   changeLanguage: Function, impersonation: object|null, isImpersonating: boolean,
 *   startImpersonation: Function, stopImpersonation: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
