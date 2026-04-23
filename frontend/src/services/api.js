/**
 * EthicFlow — API Service
 * Centralized Axios instance with JWT injection and error normalization.
 * baseURL: supports environment variable (VITE_API_URL) for production flexibility.
 * Dev: uses '/api' (proxied to :5000 by Vite). Prod: set VITE_API_URL env var.
 */

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
})

/**
 * Returns the configured API base URL without a trailing slash.
 * @returns {string}
 */
export function getApiBaseUrl() {
  const base = api.defaults.baseURL || '/api'
  return String(base).replace(/\/$/, '')
}

/**
 * Builds an absolute/relative API URL from a path segment.
 * Works for both relative "/api" and absolute "https://host/api" base URLs.
 * @param {string} path
 * @returns {string}
 */
export function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

/**
 * Request interceptor — attaches JWT from memory (AuthContext) if present.
 * Token is stored in the module-level variable set by setToken().
 */
const SESSION_KEY = 'ef_session'
const ACTIVE_ROLE_KEY = 'ef_active_role'
let _token = null
let _activeRole = null

/**
 * Sets the JWT token in memory AND sessionStorage.
 * sessionStorage survives React Router navigation and page refresh within the same tab,
 * but clears automatically when the browser tab is closed (more secure than localStorage).
 * @param {string|null} token
 */
export function setToken(token) {
  _token = token
  if (token) {
    sessionStorage.setItem(SESSION_KEY, token)
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

/**
 * Returns the current JWT token — from memory first, then sessionStorage fallback.
 * The sessionStorage fallback handles page refresh and direct URL navigation.
 * @returns {string|null}
 */
export function getToken() {
  if (!_token) {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) _token = stored
  }
  return _token
}

/**
 * Sets active role in memory and sessionStorage.
 * @param {string|null} role
 */
export function setActiveRole(role) {
  _activeRole = role || null
  if (_activeRole) {
    sessionStorage.setItem(ACTIVE_ROLE_KEY, _activeRole)
  } else {
    sessionStorage.removeItem(ACTIVE_ROLE_KEY)
  }
}

/**
 * Returns active role from memory/sessionStorage.
 * @returns {string|null}
 */
export function getActiveRole() {
  if (!_activeRole) {
    const stored = sessionStorage.getItem(ACTIVE_ROLE_KEY)
    if (stored) _activeRole = stored
  }
  return _activeRole
}

api.interceptors.request.use((config) => {
  const token = getToken()
  const activeRole = getActiveRole()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (activeRole) {
    config.headers['X-Active-Role'] = activeRole
  }
  return config
})

function handleSessionExpired() {
  setToken(null)
  setActiveRole(null)
  window.dispatchEvent(new CustomEvent('ef:session-expired'))
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?error=session_expired')
  }
}

/**
 * Response interceptor — normalizes error shape to { message, code }.
 * Backend returns: { error: string, code: string, details?: object }
 */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status || 0
    const originalRequest = err.config || {}
    const requestUrl = String(originalRequest.url || '')
    const isAuthRefresh = requestUrl.includes('/auth/refresh')
    const isAuthLogin = requestUrl.includes('/auth/login')

    if (status === 401 && !originalRequest._retry && !isAuthRefresh && !isAuthLogin) {
      originalRequest._retry = true
      try {
        const refresh = await axios.post(
          buildApiUrl('/auth/refresh'),
          {},
          { withCredentials: true }
        )
        const refreshedToken = refresh.data?.token
        if (refreshedToken) {
          setToken(refreshedToken)
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
          return api(originalRequest)
        }
      } catch {
        handleSessionExpired()
      }
    } else if (status === 401 && isAuthRefresh) {
      handleSessionExpired()
    }

    const data = err.response?.data
    const normalized = {
      message: data?.error || 'SERVER_ERROR',
      code:    data?.code  || 'SERVER_ERROR',
      status,
    }
    return Promise.reject(normalized)
  }
)

export default api
