/**
 * EthicFlow — SSO Callback Page (brand refresh)
 * Handles the redirect from the backend after SSO login (Google/Microsoft).
 * Exchanges a short-lived one-time code for JWT, then redirects to dashboard.
 *
 * Route: /sso-callback (public — no ProtectedRoute wrapper, no sidebar)
 * Query params:
 *   ?code=<one-time-code> — on success
 *   ?error=<code>          — on failure
 *
 * Visual: centered card + brand gradient accent strip (mirrors ForgotPasswordPage).
 * A11y: role="status" + aria-live="polite" during loading,
 *       role="alert" + aria-live="assertive" on error (with "חזרה לכניסה" CTA).
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { Spinner } from '../../components/ui'
import levLogo from '../../assets/LOGO.jpg'

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
 * Keeps the original behaviour (exchange code → JWT → /dashboard; on error → /login).
 * Adds a brief, accessible visual while the exchange is in-flight and a
 * fallback error UI with a manual "חזרה לכניסה" button in case the
 * navigate-back fails.
 * @returns {JSX.Element}
 */
export default function SsoCallbackPage() {
  const { t, i18n }        = useTranslation()
  const navigate           = useNavigate()
  const [searchParams]     = useSearchParams()
  const { loginWithToken } = useAuth()
  const isRtl              = i18n.dir() === 'rtl'
  const BackIcon           = isRtl ? ArrowRight : ArrowLeft

  useEffect(() => {
    const code  = searchParams.get('code')
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

    navigate('/login', { replace: true })
  }, [loginWithToken, navigate, searchParams, t])

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--surface-base)' }}
      >
        <main
          id="main-content"
          tabIndex="-1"
          className="w-full max-w-md bg-white p-8 relative overflow-hidden text-center"
          style={{
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            className="absolute top-0 inset-x-0"
            aria-hidden="true"
            style={{ height: 4, background: 'var(--gradient-brand-flat)' }}
          />

          <div className="flex items-center justify-center gap-3 mb-8 mt-2">
            <img src={levLogo} alt={t('common.institution')} className="h-9 w-auto" />
            <div className="text-start">
              <p className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                {t('common.appName')}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('common.institution')}
              </p>
            </div>
          </div>

          <div
            className="flex flex-col items-center gap-3 py-4"
            role="status"
            aria-live="polite"
          >
            <Spinner size={28} label={t('auth.ssoLoading')} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.ssoLoading')}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-center">
            <Link
              to="/login"
              className="text-sm font-semibold hover:underline inline-flex items-center gap-1.5"
              style={{ color: 'var(--lev-teal-text)' }}
            >
              <BackIcon size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>

        </main>
      </div>
    </>
  )
}
