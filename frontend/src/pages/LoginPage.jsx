/**
 * EthicFlow — Login Page
 * Option A design with Lev Academic Center colors.
 * IS 5568 / WCAG 2.1 AA compliant.
 * Responsive: split-panel on desktop, stacked on mobile.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import levLogo from '../assets/LOGO.jpg'

/**
 * Microsoft logo SVG (brand colors, aria-hidden since button has text label).
 * @returns {JSX.Element}
 */
function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 23 23" fill="none"
      xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00"/>
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF"/>
      <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
}

/**
 * Login page — POST /api/auth/login → JWT stored in AuthContext memory.
 * Supports Microsoft SSO via /api/auth/microsoft redirect.
 */
export default function LoginPage() {
  const { t }            = useTranslation()
  const { login }        = useAuth()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  // Error can come from form submit OR from SSO callback redirect
  const [error, setError] = useState(
    searchParams.get('ssoError') ?? ''
  )

  /**
   * Handles form submission — calls login() and redirects on success.
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const code = err.code || 'SERVER_ERROR'
      setError(t(`errors.${code}`, t('auth.login.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* IS 5568 — skip navigation */}
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div className="min-h-screen flex flex-col md:flex-row">

        {/* ── Branding panel (hidden on mobile) ── */}
        <div
          className="hidden md:flex md:w-5/12 flex-col items-center justify-center p-12 text-white"
          style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, #2B3A8F 50%, var(--lev-purple) 100%)' }}
          aria-hidden="true"
        >
          <div className="mb-8 text-center">
            {/* Logo on white pill so original colors show against the dark gradient */}
            <div className="bg-white rounded-2xl px-6 py-4 inline-flex items-center justify-center mx-auto mb-5 shadow-lg">
              <img src={levLogo} alt="" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-bold leading-tight">{t('auth.login.systemTitle')}</h1>
            <p className="text-sm mt-1 opacity-80">{t('common.institution')}</p>
          </div>
          <div className="space-y-3 w-full max-w-xs">
            {[
              { icon: '📄', text: t('auth.login.feature1') },
              { icon: '⏱', text: t('auth.login.feature2') },
              { icon: '✍️', text: t('auth.login.feature3') },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span className="text-lg">{icon}</span>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs opacity-40 mt-10">© 2026 {t('common.institution')}</p>
        </div>

        {/* ── Form panel ── */}
        <main
          id="main-content"
          tabIndex="-1"
          className="flex-1 bg-white flex flex-col items-center justify-center p-6 md:p-12"
        >
          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center w-full">
            <div className="w-full py-8 px-6 mb-6 rounded-2xl text-white text-center"
              style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, var(--lev-purple) 100%)' }}>
              <div className="bg-white rounded-xl px-4 py-3 inline-flex items-center justify-center mx-auto mb-3 shadow">
                <img src={levLogo} alt={t('common.institution')} className="h-10 w-auto" />
              </div>
              <p className="text-lg font-bold">{t('auth.login.systemTitle')}</p>
              <p className="text-xs opacity-70">{t('common.institution')}</p>
            </div>
          </div>

          <div className="w-full max-w-sm">
            <p className="text-xs text-gray-600 mb-1">{t('auth.login.institutionLabel')}</p>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>
              {t('auth.login.title')}
            </h2>
            <p className="text-gray-600 text-sm mb-8">{t('auth.login.subtitle')}</p>

            {/* Error message — IS 5568: role="alert" + aria-live */}
            {error && (
              <div role="alert" aria-live="assertive"
                className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-label={t('auth.login.title')}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-semibold mb-1.5"
                    style={{ color: 'var(--lev-navy)' }}>
                    {t('auth.login.emailLabel')}
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-required="true"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.login.emailPlaceholder')}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50
                      focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow"
                    style={{ '--tw-ring-color': 'var(--lev-navy)' }}
                    dir="ltr"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-semibold mb-1.5"
                    style={{ color: 'var(--lev-navy)' }}>
                    {t('auth.login.passwordLabel')}
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-required="true"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50
                      focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow"
                    dir="ltr"
                    disabled={loading}
                  />
                </div>

                {/* Submit — IS 5568: min 44px */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
                  className="w-full text-white rounded-xl py-3 font-semibold text-sm
                    hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {loading ? t('common.loading') : t('auth.login.submitButton')}
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <Link to="/forgot-password" className="text-sm hover:underline"
                  style={{ color: 'var(--lev-teal-text)' }}>
                  {t('auth.login.forgotPassword')}
                </Link>
                <LanguageSwitcher />
              </div>

              {/* SSO divider */}
              <div className="flex items-center gap-3 my-6" aria-hidden="true">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t('auth.login.orDivider')}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Microsoft SSO button */}
              <a
                href="/api/auth/microsoft"
                role="button"
                style={{ minHeight: '44px', borderColor: '#D1D5DB' }}
                className="w-full flex items-center justify-center gap-3 border rounded-xl
                  px-4 py-3 text-sm font-medium text-gray-700 bg-white
                  hover:bg-gray-50 transition-colors focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500"
                aria-label={t('auth.loginWithMicrosoft')}
              >
                <MicrosoftLogo />
                <span>{t('auth.loginWithMicrosoft')}</span>
              </a>
            </form>
          </div>
        </main>

      </div>
    </>
  )
}
