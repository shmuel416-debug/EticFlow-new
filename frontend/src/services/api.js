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
})

/**
 * Request interceptor — attaches JWT from memory (AuthContext) if present.
 * Token is stored in the module-level variable set by setToken().
 */
const SESSION_KEY = 'ef_session'
let _token = null

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

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`
  }
  return config
})

/**
 * Response interceptor — normalizes error shape to { message, code }.
 * Backend returns: { error: string, code: string, details?: object }
 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data
    const normalized = {
      message: data?.error || 'SERVER_ERROR',
      code:    data?.code  || 'SERVER_ERROR',
      status:  err.response?.status || 0,
    }
    return Promise.reject(normalized)
  }
)

export default api
