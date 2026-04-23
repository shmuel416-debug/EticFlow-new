/**
 * EthicFlow — Forgot Password Page (brand refresh)
 * Always returns success to avoid user enumeration (mirrors backend behavior).
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import { Button, Input, FormField, LanguageSwitcher } from '../components/ui'
import levLogo from '../assets/LOGO.jpg'

/**
 * Forgot password page — POST /api/auth/forgot-password.
 * @returns {JSX.Element}
 */
export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const isRtl       = i18n.dir() === 'rtl'
  const BackIcon    = isRtl ? ArrowLeft : ArrowRight
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      if (err.status === 0) setError(t('errors.SERVER_ERROR'))
      else setSent(true)
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
            {t('auth.forgotPassword.title')}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.forgotPassword.subtitle')}
          </p>

          {sent ? (
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
              <span>{t('auth.forgotPassword.successMessage')}</span>
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

              <form onSubmit={handleSubmit} noValidate aria-label={t('auth.forgotPassword.title')}>
                <div className="space-y-4">
                  <FormField
                    label={t('auth.forgotPassword.emailLabel')}
                    required
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Input
                        id={inputId}
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@lev.ac.il"
                        dir="ltr"
                        disabled={loading}
                      />
                    )}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={!email}
                  >
                    {loading ? t('common.loading') : t('auth.forgotPassword.submitButton')}
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
              {t('auth.forgotPassword.backToLogin')}
            </Link>
            <LanguageSwitcher />
          </div>
        </main>
      </div>
    </>
  )
}
