/**
 * Ethic-Net — Forced Password Change Page
 * Used when backend requires password rotation before normal app access.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Button, Input, FormField, LanguageSwitcher } from '../components/ui'
import levLogo from '../assets/LOGO.jpg'
import useDocumentTitle from '../hooks/useDocumentTitle'

/**
 * Renders forced password change form.
 * @returns {JSX.Element}
 */
export default function ChangePasswordPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.changePassword.title'))
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Submits password change request and refreshes auth state.
   * @param {React.FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError(t('auth.changePassword.errorTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.changePassword.errorMismatch'))
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword, newPassword })
      if (data?.token) {
        loginWithToken(data.token)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const code = err.code || 'SERVER_ERROR'
      setError(t(`errors.${code}`, t('errors.SERVER_ERROR')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--surface-base)' }}
    >
      <main
        className="w-full max-w-md bg-white p-8"
        style={{
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <img src={levLogo} alt={t('common.institution')} className="h-9 w-auto" />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
              {t('auth.login.systemTitle')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('common.institution')}
            </p>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>
          {t('auth.changePassword.title')}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.changePassword.subtitle')}
        </p>

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

        <form onSubmit={handleSubmit} noValidate aria-label={t('auth.changePassword.title')}>
          <div className="space-y-4">
            <FormField
              label={t('auth.changePassword.currentPasswordLabel')}
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
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  dir="ltr"
                  disabled={loading}
                />
              )}
            />

            <FormField
              label={t('auth.changePassword.newPasswordLabel')}
              required
              hint={t('auth.changePassword.passwordHint')}
              render={({ inputId, describedBy, required, invalid }) => (
                <Input
                  id={inputId}
                  icon={Lock}
                  type="password"
                  autoComplete="new-password"
                  aria-required={required || undefined}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  dir="ltr"
                  disabled={loading}
                />
              )}
            />

            <FormField
              label={t('auth.changePassword.confirmLabel')}
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
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              {loading ? t('common.loading') : t('auth.changePassword.submitButton')}
            </Button>
          </div>
        </form>

        <div className="mt-6 flex justify-end">
          <LanguageSwitcher />
        </div>
      </main>
    </div>
  )
}
