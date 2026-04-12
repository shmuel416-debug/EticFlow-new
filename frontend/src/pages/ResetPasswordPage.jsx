/**
 * EthicFlow — Reset Password Page
 * Reads ?token= from URL, lets user set a new password.
 * Calls POST /api/auth/reset-password with { token, newPassword }.
 * IS 5568 / WCAG 2.1 AA compliant.
 */

import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import levLogo from '../assets/LOGO.jpg'

/**
 * Reset password page — POST /api/auth/reset-password.
 * Token is read from ?token= query param sent in the reset email.
 */
export default function ResetPasswordPage() {
  const { t, i18n }        = useTranslation()
  const isRtl              = i18n.language === 'he'
  const navigate           = useNavigate()
  const [searchParams]     = useSearchParams()
  const token              = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')

  /**
   * Validates and submits the new password.
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('auth.resetPassword.errorTooShort'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.resetPassword.errorMismatch'))
      return
    }
    if (!token) {
      setError(t('auth.resetPassword.errorNoToken'))
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      const code = err.response?.data?.code
      setError(t(`errors.${code}`) || t('errors.SERVER_ERROR'))
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
            {t('auth.resetPassword.title')}
          </h1>
          <p className="text-gray-600 text-sm mb-6">{t('auth.resetPassword.subtitle')}</p>

          {/* Missing token warning */}
          {!token && (
            <div role="alert" aria-live="assertive"
              className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {t('auth.resetPassword.errorNoToken')}
            </div>
          )}

          {/* Success state */}
          {done ? (
            <div role="status" aria-live="polite"
              className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-green-800 text-sm mb-6">
              {t('auth.resetPassword.successMessage')}
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" aria-live="assertive"
                  className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate
                aria-label={t('auth.resetPassword.title')}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="reset-password" className="block text-sm font-semibold mb-1.5"
                      style={{ color: 'var(--lev-navy)' }}>
                      {t('auth.resetPassword.passwordLabel')}
                    </label>
                    <input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      aria-required="true"
                      aria-describedby="reset-password-hint"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50
                        focus:outline-none focus:ring-2 focus:ring-offset-1"
                      dir="ltr"
                      disabled={loading || !token}
                    />
                    <p id="reset-password-hint" className="text-xs text-gray-500 mt-1">
                      {t('auth.resetPassword.passwordHint')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reset-confirm" className="block text-sm font-semibold mb-1.5"
                      style={{ color: 'var(--lev-navy)' }}>
                      {t('auth.resetPassword.confirmLabel')}
                    </label>
                    <input
                      id="reset-confirm"
                      type="password"
                      autoComplete="new-password"
                      aria-required="true"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50
                        focus:outline-none focus:ring-2 focus:ring-offset-1"
                      dir="ltr"
                      disabled={loading || !token}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password || !confirm || !token}
                    style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
                    className="w-full text-white rounded-xl py-3 font-semibold text-sm
                      hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {loading ? t('common.loading') : t('auth.resetPassword.submitButton')}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Link to="/login" className="text-sm hover:underline flex items-center gap-1"
              style={{ color: 'var(--lev-teal-text)' }}>
              <span aria-hidden="true">{isRtl ? '←' : '→'}</span>
              {t('auth.resetPassword.backToLogin')}
            </Link>
            <LanguageSwitcher />
          </div>
        </main>
      </div>
    </>
  )
}
