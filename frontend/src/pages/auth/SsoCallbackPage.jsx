/**
 * EthicFlow — SSO Callback Page
 * Handles the redirect from the backend after SSO login (Google/Microsoft).
 * Exchanges a short-lived one-time code for JWT, then redirects to dashboard.
 *
 * Route: /sso-callback (public — no ProtectedRoute wrapper)
 * Query params:
 *   ?code=<one-time-code> — on success
 *   ?error=<code>  — on failure
 */

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

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
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (code) {
      /**
       * Exchanges one-time SSO code for JWT.
       * Keeps tokens out of redirect URLs and browser history.
       * @returns {Promise<void>}
       */
      const runExchange = async () => {
        try {
          const { data } = await api.post('/auth/exchange-code', { code })
          loginWithToken(data.token)
          navigate('/dashboard', { replace: true })
        } catch {
          navigate(`/login?ssoError=${encodeURIComponent(t('auth.ssoFailed'))}`, { replace: true })
        }
      }

      runExchange()
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
