/**
 * EthicFlow — SSO Callback Page
 * Handles the redirect from the backend after a successful Microsoft SSO login.
 * Reads the JWT from the URL query param, stores it via AuthContext, and redirects to dashboard.
 *
 * Route: /sso-callback (public — no ProtectedRoute wrapper)
 * Query params:
 *   ?token=<jwt>   — on success
 *   ?error=<code>  — on failure
 */

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

/**
 * Maps backend error codes to i18n translation keys.
 * @param {string} code - Error code from backend redirect
 * @returns {string} i18n key
 */
function errorToKey(code) {
  const map = {
    sso_email_conflict: 'auth.ssoEmailConflict',
    sso_cancelled:      'auth.ssoCancelled',
    sso_failed:         'auth.ssoFailed',
    sso_no_email:       'auth.ssoFailed',
    sso_state_mismatch: 'auth.ssoFailed',
    account_inactive:   'auth.accountInactive',
  }
  return map[code] ?? 'auth.ssoFailed'
}

/**
 * SsoCallbackPage — handles post-SSO redirect.
 * @returns {JSX.Element}
 */
export default function SsoCallbackPage() {
  const { t }                     = useTranslation()
  const navigate                  = useNavigate()
  const [searchParams]            = useSearchParams()
  const { loginWithToken }        = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (token) {
      // Store token + decode user, then redirect to dashboard
      loginWithToken(token)
      navigate('/dashboard', { replace: true })
      return
    }

    if (error) {
      const key = errorToKey(error)
      navigate(`/login?ssoError=${encodeURIComponent(t(key))}`, { replace: true })
      return
    }

    // Unknown state — fallback
    navigate('/login', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      role="status"
      aria-live="polite"
      aria-label={t('auth.ssoLoading')}
    >
      <div className="text-center">
        {/* Spinner */}
        <div
          className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"
          aria-hidden="true"
        />
        <p className="text-gray-600 text-sm">{t('auth.ssoLoading')}</p>
      </div>
    </div>
  )
}
