/**
 * EthicFlow — Forgot Password Page
 * Always returns success message (no user enumeration — mirrors backend behavior).
 * IS 5568 / WCAG 2.1 AA compliant.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import levLogo from '../assets/LOGO.jpg'

/**
 * Forgot password page — POST /api/auth/forgot-password.
 */
export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const isRtl       = i18n.language === 'he'
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  /**
   * Submits the forgot-password request.
   * Always shows success to avoid user enumeration.
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      // Only show error on network-level failure
      if (err.status === 0) {
        setError(t('errors.SERVER_ERROR'))
      } else {
        // Still show success to avoid enumeration
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <main
          id="main-content"
          tabIndex="-1"
          className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
        >
          {/* Logo + institution */}
          <div className="flex items-center gap-3 mb-8">
            <img src={levLogo} alt={t('common.institution')} className="h-9 w-auto" />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--lev-navy)' }}>EthicFlow</p>
              <p className="text-xs text-gray-600">{t('common.institution')}</p>
            </div>
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('auth.forgotPassword.title')}
          </h1>
          <p className="text-gray-600 text-sm mb-6">{t('auth.forgotPassword.subtitle')}</p>

          {/* Success state */}
          {sent ? (
            <div role="status" aria-live="polite"
              className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-green-800 text-sm mb-6">
              {t('auth.forgotPassword.successMessage')}
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" aria-live="assertive"
                  className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate aria-label={t('auth.forgotPassword.title')}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-semibold mb-1.5"
                      style={{ color: 'var(--lev-navy)' }}>
                      {t('auth.forgotPassword.emailLabel')}
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      aria-required="true"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@lev.ac.il"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50
                        focus:outline-none focus:ring-2 focus:ring-offset-1"
                      dir="ltr"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
                    className="w-full text-white rounded-xl py-3 font-semibold text-sm
                      hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {loading ? t('common.loading') : t('auth.forgotPassword.submitButton')}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Link to="/login" className="text-sm hover:underline flex items-center gap-1"
              style={{ color: 'var(--lev-teal-text)' }}>
              <span aria-hidden="true">{isRtl ? '←' : '→'}</span>
              {t('auth.forgotPassword.backToLogin')}
            </Link>
            <LanguageSwitcher />
          </div>
        </main>
      </div>
    </>
  )
}
