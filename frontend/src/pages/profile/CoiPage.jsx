/**
 * EthicFlow — Conflict of Interest Declarations Page (brand refresh)
 * Lets users create and manage their own COI declarations.
 *
 * Visual: PageHeader + Card shells, monochrome lucide icons, brand tokens.
 * Behaviour unchanged — same endpoints, same fields, same validation.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Plus,
  Trash2,
  ShieldAlert,
} from 'lucide-react'
import api from '../../services/api'
import {
  Button,
  IconButton,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  FormField,
  Input,
  Textarea,
  Select,
  Spinner,
  EmptyState,
  AccessibleIcon,
} from '../../components/ui'

const SCOPES = ['SUBMISSION', 'USER', 'DEPARTMENT', 'GLOBAL']

/**
 * Maps a COI scope key to a Badge tone.
 * @param {string} scope
 * @returns {'info'|'navy'|'purple'|'neutral'}
 */
function scopeTone(scope) {
  if (scope === 'SUBMISSION') return 'info'
  if (scope === 'USER')       return 'navy'
  if (scope === 'DEPARTMENT') return 'purple'
  return 'neutral'
}

/**
 * COI declarations management page.
 * @returns {JSX.Element}
 */
export default function CoiPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    scope: 'SUBMISSION',
    targetSubmissionId: '',
    targetUserId: '',
    targetDepartment: '',
    reason: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/coi')
      setItems(data.data ?? [])
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      await api.post('/coi', form)
      setForm({
        scope: form.scope,
        targetSubmissionId: '',
        targetUserId: '',
        targetDepartment: '',
        reason: '',
      })
      await load()
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/coi/${id}`)
      await load()
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    }
  }

  const showSubmission = form.scope === 'SUBMISSION'
  const showUser       = form.scope === 'USER'
  const showDepartment = form.scope === 'DEPARTMENT'

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('coi.page.title')}
        subtitle={t('coi.page.subtitle')}
      />

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 flex items-start gap-2 text-sm font-medium"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          <AccessibleIcon icon={AlertTriangle} size={18} decorative />
          <span>{error}</span>
        </div>
      )}

      {/* ── Declare form ─────────────────────────── */}
      <Card className="mb-5">
        <CardHeader title={t('coi.declare')} />
        <CardBody>
          <div className="space-y-3">
            <FormField
              label={t('coi.scopeLabel')}
              render={({ inputId, describedBy }) => (
                <Select
                  id={inputId}
                  aria-describedby={describedBy}
                  value={form.scope}
                  onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))}
                >
                  {SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {t(`coi.scope.${scope.toLowerCase()}`)}
                    </option>
                  ))}
                </Select>
              )}
            />

            {showSubmission && (
              <FormField
                label={t('coi.fields.submissionId')}
                render={({ inputId, describedBy }) => (
                  <Input
                    id={inputId}
                    aria-describedby={describedBy}
                    value={form.targetSubmissionId}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetSubmissionId: event.target.value }))}
                    placeholder={t('coi.fields.submissionId')}
                  />
                )}
              />
            )}
            {showUser && (
              <FormField
                label={t('coi.fields.userId')}
                render={({ inputId, describedBy }) => (
                  <Input
                    id={inputId}
                    aria-describedby={describedBy}
                    value={form.targetUserId}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetUserId: event.target.value }))}
                    placeholder={t('coi.fields.userId')}
                  />
                )}
              />
            )}
            {showDepartment && (
              <FormField
                label={t('coi.fields.department')}
                render={({ inputId, describedBy }) => (
                  <Input
                    id={inputId}
                    aria-describedby={describedBy}
                    value={form.targetDepartment}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetDepartment: event.target.value }))}
                    placeholder={t('coi.fields.department')}
                  />
                )}
              />
            )}

            <FormField
              label={t('coi.reason')}
              required
              render={({ inputId, describedBy, required, invalid }) => (
                <Textarea
                  id={inputId}
                  aria-describedby={describedBy}
                  aria-required={required || undefined}
                  invalid={invalid}
                  value={form.reason}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                  placeholder={t('coi.reason')}
                  rows={3}
                />
              )}
            />

            <div>
              <Button
                variant="gold"
                onClick={handleCreate}
                disabled={saving || !form.reason.trim()}
                loading={saving}
                leftIcon={<AccessibleIcon icon={Plus} size={16} decorative />}
              >
                {t('coi.declare')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Active declarations ──────────────────── */}
      <Card>
        <CardHeader title={t('coi.page.list')} />
        <CardBody>
          {loading && (
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <Spinner size={18} label={t('common.loading')} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('common.loading')}
              </span>
            </div>
          )}

          {!loading && items.length === 0 && (
            <EmptyState
              icon={ShieldAlert}
              title={t('coi.page.empty')}
            />
          )}

          {!loading && items.length > 0 && (
            <ul className="space-y-2" aria-label={t('coi.page.list')}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 p-3"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-raised)',
                  }}
                >
                  <div className="min-w-0">
                    <Badge tone={scopeTone(item.scope)} size="sm">
                      {t(`coi.scope.${item.scope.toLowerCase()}`)}
                    </Badge>
                    <p className="text-sm mt-1.5" style={{ color: 'var(--text-primary)' }}>
                      {item.reason}
                    </p>
                  </div>
                  <IconButton
                    icon={Trash2}
                    label={`${t('common.delete')} ${t(`coi.scope.${item.scope.toLowerCase()}`)}`}
                    onClick={() => handleDelete(item.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
