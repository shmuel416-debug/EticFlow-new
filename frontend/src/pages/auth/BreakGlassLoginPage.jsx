/**
 * Ethic-Net — Break-glass login page
 * Hidden emergency access page for administrator use when Microsoft SSO is unavailable.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { Button, Input, FormField } from '../../components/ui'
import levLogo from '../../assets/LOGO.jpg'

/**
 * Break-glass local login.
 * @returns {JSX.Element}
 */
export default function BreakGlassLoginPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.breakGlass.title'))
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Submits emergency login credentials.
   * @param {import('react').FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (requestError) {
      const code = requestError?.code || 'INVALID_CREDENTIALS'
      setError(t(`errors.${code}`, t('auth.login.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
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
          <div className="flex items-center justify-center gap-3 mb-8 mt-2">
            <img src={levLogo} alt={t('common.institution')} className="h-9 w-auto" />
            <div className="text-start">
              <p className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                {t('auth.breakGlass.title')}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('auth.breakGlass.subtitle')}
              </p>
            </div>
          </div>

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

          <form onSubmit={handleSubmit} noValidate aria-label={t('auth.breakGlass.title')}>
            <div className="space-y-4">
              <FormField
                label={t('auth.login.emailLabel')}
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
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('auth.login.emailPlaceholder')}
                    dir="ltr"
                    disabled={loading}
                  />
                )}
              />
              <FormField
                label={t('auth.login.passwordLabel')}
                required
                render={({ inputId, describedBy, required, invalid }) => (
                  <Input
                    id={inputId}
                    icon={Lock}
                    type="password"
                    autoComplete="current-password"
                    aria-required={required || undefined}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    dir="ltr"
                    disabled={loading}
                  />
                )}
              />
              <Button type="submit" variant="gold" size="lg" fullWidth loading={loading}>
                {loading ? t('common.loading') : t('auth.breakGlass.submitButton')}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--lev-teal-text)' }}>
              {t('auth.breakGlass.backToSso')}
            </Link>
          </p>
        </main>
      </div>
    </>
  )
}
