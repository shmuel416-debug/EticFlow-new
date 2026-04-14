/**
 * EthicFlow — API Service
 * Centralized Axios instance with JWT injection and error normalization.
 * All requests go through /api (proxied to :5000 by Vite in dev).
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

/**
 * Request interceptor — attaches JWT from memory (AuthContext) if present.
 * Token is stored in the module-level variable set by setToken().
 */
let _token = null

/**
 * Sets the in-memory JWT token used by all subsequent requests.
 * @param {string|null} token
 */
export function setToken(token) {
  _token = token
}

/**
 * Returns the current in-memory JWT token.
 * Used by AuthContext to save the original token before impersonation.
 * @returns {string|null}
 */
export function getToken() {
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
