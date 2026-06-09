/**
 * Ethic-Net — Profile Page
 * Self-service page for users to update their Hebrew display name.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  Button, Card, CardBody, FormField, Input, PageHeader,
} from '../../components/ui'
import useDocumentTitle from '../../hooks/useDocumentTitle'

/**
 * Profile page — edit Hebrew name for locale-aware display.
 * @returns {JSX.Element}
 */
export default function ProfilePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('profile.title'))
  const { user, refreshSession } = useAuth()

  const [fullNameHe, setFullNameHe] = useState(user?.fullNameHe ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  /**
   * Saves the Hebrew display name via PATCH /auth/profile.
   * @param {React.FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const trimmed = fullNameHe.trim()
      await api.patch('/auth/profile', { fullNameHe: trimmed || null })
      await refreshSession()
      setSuccess(true)
    } catch (err) {
      const code = err?.code
      setError(code ? t(`errors.${code}`, { defaultValue: err.message }) : t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="text-sm font-medium p-3 rounded-xl"
                style={{ background: 'var(--status-danger-50)', color: 'var(--status-danger)' }}>
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="text-sm font-medium p-3 rounded-xl"
                style={{ background: 'var(--status-success-50)', color: 'var(--status-success)' }}>
                {t('profile.saveSuccess')}
              </div>
            )}

            <FormField
              label={t('profile.email')}
              render={({ inputId }) => (
                <Input id={inputId} type="email" value={user?.email ?? ''} disabled dir="ltr" />
              )}
            />

            <FormField
              label={t('profile.fullNameEn')}
              hint={t('profile.readOnlyHint')}
              render={({ inputId, describedBy }) => (
                <Input
                  id={inputId}
                  type="text"
                  value={user?.fullName ?? ''}
                  disabled
                  aria-describedby={describedBy}
                />
              )}
            />

            <FormField
              label={t('profile.fullNameHe')}
              hint={t('profile.fullNameHeHint')}
              render={({ inputId, describedBy }) => (
                <Input
                  id={inputId}
                  type="text"
                  value={fullNameHe}
                  onChange={(e) => setFullNameHe(e.target.value)}
                  aria-describedby={describedBy}
                  maxLength={200}
                />
              )}
            />

            <Button type="submit" loading={saving} className="w-full md:w-auto">
              {t('common.save')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
