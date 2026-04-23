/**
 * EthicFlow — Reset Password Page (brand refresh)
 * Reads ?token= from URL, lets user set a new password.
 * Calls POST /api/auth/reset-password with { token, newPassword }.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import { Button, Input, FormField, LanguageSwitcher } from '../components/ui'
import levLogo from '../assets/LOGO.jpg'

/**
 * Reset password page — POST /api/auth/reset-password.
 * Token is read from ?token= query param sent in the reset email.
 * @returns {JSX.Element}
 */
export default function ResetPasswordPage() {
  const { t, i18n }  = useTranslation()
  const isRtl        = i18n.dir() === 'rtl'
  const BackIcon     = isRtl ? ArrowLeft : ArrowRight
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

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

      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--surface-base)' }}
      >
        <main
          id="main-content"
          tabIndex="-1"
          className="w-full max-w-md bg-white p-8 relative overflow-hidden"
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

          <div className="flex items-center gap-3 mb-8 mt-2">
            <img src={levLogo} alt={t('common.institution')} className="h-9 w-auto" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>EthicFlow</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('common.institution')}
              </p>
            </div>
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('auth.resetPassword.title')}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.resetPassword.subtitle')}
          </p>

          {!token && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 text-sm font-medium"
              style={{
                background: 'var(--status-danger-50)',
                color: 'var(--status-danger)',
                border: '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 14px',
              }}
            >
              {t('auth.resetPassword.errorNoToken')}
            </div>
          )}

          {done ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-3 text-sm mb-6"
              style={{
                background: 'var(--status-success-50)',
                color: 'var(--status-success)',
                border: '1px solid var(--status-success)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
              }}
            >
              <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" focusable="false" className="flex-shrink-0 mt-0.5" />
              <span>{t('auth.resetPassword.successMessage')}</span>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 text-sm font-medium"
                  style={{
                    background: 'var(--status-danger-50)',
                    color: 'var(--status-danger)',
                    border: '1px solid var(--status-danger)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate aria-label={t('auth.resetPassword.title')}>
                <div className="space-y-4">
                  <FormField
                    label={t('auth.resetPassword.passwordLabel')}
                    required
                    hint={t('auth.resetPassword.passwordHint')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Input
                        id={inputId}
                        icon={Lock}
                        type="password"
                        autoComplete="new-password"
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        dir="ltr"
                        disabled={loading || !token}
                      />
                    )}
                  />

                  <FormField
                    label={t('auth.resetPassword.confirmLabel')}
                    required
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Input
                        id={inputId}
                        icon={Lock}
                        type="password"
                        autoComplete="new-password"
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        dir="ltr"
                        disabled={loading || !token}
                      />
                    )}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={!password || !confirm || !token}
                  >
                    {loading ? t('common.loading') : t('auth.resetPassword.submitButton')}
                  </Button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold hover:underline inline-flex items-center gap-1.5"
              style={{ color: 'var(--lev-teal-text)' }}
            >
              <BackIcon size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('auth.resetPassword.backToLogin')}
            </Link>
            <LanguageSwitcher />
          </div>
        </main>
      </div>
    </>
  )
}
