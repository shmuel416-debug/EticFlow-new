/**
 * EthicFlow — Privacy Center (brand refresh)
 * User self-service for consent capture and data-subject rights requests.
 *
 * Visual: PageHeader + Card shells, monochrome lucide icons, brand tokens.
 * Behaviour unchanged — same endpoints, same payloads.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Inbox,
} from 'lucide-react'
import api from '../services/api'
import {
  Button,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  FormField,
  Textarea,
  Spinner,
  EmptyState,
  AccessibleIcon,
} from '../components/ui'

/**
 * Picks a Badge tone for a privacy-request type.
 * @param {string} type
 * @returns {'info'|'danger'|'neutral'}
 */
function requestTypeTone(type) {
  if (type === 'ACCESS')   return 'info'
  if (type === 'ERASURE')  return 'danger'
  return 'neutral'
}

/**
 * Privacy self-service center.
 * @returns {JSX.Element}
 */
export default function PrivacyCenterPage() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState(false)
  const [message, setMessage]   = useState('')
  const [messageType, setMessageType] = useState('success') // 'success' | 'error'
  const [details, setDetails]   = useState('')

  async function loadRequests() {
    setLoading(true)
    try {
      const { data } = await api.get('/privacy/request')
      setRequests(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  async function handleConsent() {
    setBusy(true)
    setMessage('')
    try {
      await api.post('/privacy/consent', {
        consentType: 'PRIVACY_POLICY',
        policyVersion: '2026-04',
        accepted: true,
      })
      setMessage(t('privacy.consentSaved'))
      setMessageType('success')
    } catch {
      setMessage(t('errors.SERVER_ERROR'))
      setMessageType('error')
    } finally {
      setBusy(false)
    }
  }

  async function handleExport() {
    setBusy(true)
    setMessage('')
    try {
      const { data } = await api.get('/privacy/export')
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ethicflow-data-export-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      await api.post('/privacy/request', { type: 'ACCESS', details: 'Self-service export download' })
      await loadRequests()
      setMessage(t('privacy.exportReady'))
      setMessageType('success')
    } catch {
      setMessage(t('errors.SERVER_ERROR'))
      setMessageType('error')
    } finally {
      setBusy(false)
    }
  }

  async function handleErasureRequest() {
    setBusy(true)
    setMessage('')
    try {
      await api.post('/privacy/request', { type: 'ERASURE', details: details.trim() || undefined })
      setDetails('')
      await loadRequests()
      setMessage(t('privacy.requestCreated'))
      setMessageType('success')
    } catch {
      setMessage(t('errors.SERVER_ERROR'))
      setMessageType('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('privacy.title')}
        subtitle={t('privacy.subtitle')}
      />

      {message && (
        <div
          role={messageType === 'error' ? 'alert' : 'status'}
          aria-live={messageType === 'error' ? 'assertive' : 'polite'}
          className="mb-4 flex items-start gap-2 text-sm font-medium"
          style={{
            background: messageType === 'error' ? 'var(--status-danger-50)' : 'var(--status-success-50)',
            color:      messageType === 'error' ? 'var(--status-danger)'    : 'var(--status-success)',
            border:     `1px solid ${messageType === 'error' ? 'var(--status-danger)' : 'var(--status-success)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          <AccessibleIcon
            icon={messageType === 'error' ? AlertTriangle : CheckCircle2}
            size={18}
            decorative
          />
          <span>{message}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* ── Consent ──────────────────────────── */}
        <Card>
          <CardHeader
            title={t('privacy.consentTitle')}
          />
          <CardBody>
            <div className="flex items-start gap-3 mb-3">
              <AccessibleIcon icon={ShieldCheck} size={20} decorative />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('privacy.subtitle')}
              </p>
            </div>
            <Button
              variant="gold"
              onClick={handleConsent}
              disabled={busy}
              loading={busy}
              leftIcon={<AccessibleIcon icon={ShieldCheck} size={16} decorative />}
            >
              {t('privacy.acceptPolicy')}
            </Button>
          </CardBody>
        </Card>

        {/* ── Data-subject rights ──────────────── */}
        <Card>
          <CardHeader title={t('privacy.rightsTitle')} />
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="info" size="sm">ACCESS</Badge>
                <Badge tone="danger" size="sm">ERASURE</Badge>
              </div>

              <div>
                <Button
                  variant="secondary"
                  onClick={handleExport}
                  disabled={busy}
                  loading={busy}
                  leftIcon={<AccessibleIcon icon={Download} size={16} decorative />}
                >
                  {t('privacy.exportButton')}
                </Button>
              </div>

              <FormField
                label={t('privacy.erasureButton')}
                hint={t('privacy.erasurePlaceholder')}
                render={({ inputId, describedBy }) => (
                  <Textarea
                    id={inputId}
                    aria-describedby={describedBy}
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={t('privacy.erasurePlaceholder')}
                  />
                )}
              />

              <div>
                <Button
                  variant="danger"
                  onClick={handleErasureRequest}
                  disabled={busy}
                  loading={busy}
                  leftIcon={<AccessibleIcon icon={Trash2} size={16} decorative />}
                >
                  {t('privacy.erasureButton')}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Recent requests ──────────────────── */}
        <Card>
          <CardHeader title={t('privacy.requestsTitle')} />
          <CardBody>
            {loading && (
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <Spinner size={18} label={t('common.loading')} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('common.loading')}
                </span>
              </div>
            )}

            {!loading && requests.length === 0 && (
              <EmptyState
                icon={Inbox}
                title={t('privacy.noRequests')}
              />
            )}

            {!loading && requests.length > 0 && (
              <ul className="space-y-2" aria-label={t('privacy.requestsTitle')}>
                {requests.map((request) => (
                  <li
                    key={request.id}
                    className="flex items-center gap-3 p-3"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-raised)',
                    }}
                  >
                    <AccessibleIcon icon={Shield} size={18} decorative />
                    <Badge tone={requestTypeTone(request.type)} size="sm">
                      {request.type}
                    </Badge>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {request.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
