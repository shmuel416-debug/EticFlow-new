/**
 * EthicFlow — Auth Context
 * Stores JWT in memory (never localStorage). Provides login/logout/user state.
 * Also manages i18n language + HTML dir/lang attribute on language change.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api, { setToken } from '../services/api'

/** @type {React.Context} */
const AuthContext = createContext(null)

/**
 * Provides authentication state and actions to the component tree.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const { i18n } = useTranslation()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

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
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changeLanguage }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 * @returns {{ user: object|null, loading: boolean, login: Function, logout: Function, changeLanguage: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
