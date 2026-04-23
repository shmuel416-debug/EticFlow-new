/**
 * EthicFlow — Privacy Center
 * User self-service for consent capture and data-subject rights requests.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'

/**
 * Privacy self-service center.
 * @returns {JSX.Element}
 */
export default function PrivacyCenterPage() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

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
    } catch {
      setMessage(t('errors.SERVER_ERROR'))
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
      const url = URL.createObjectURL(blob)
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
    } catch {
      setMessage(t('errors.SERVER_ERROR'))
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
    } catch {
      setMessage(t('errors.SERVER_ERROR'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main-content" className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>{t('privacy.title')}</h1>
      <p className="text-sm text-gray-600">{t('privacy.subtitle')}</p>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">{t('privacy.consentTitle')}</h2>
        <button
          type="button"
          onClick={handleConsent}
          disabled={busy}
          className="text-sm font-semibold border border-gray-300 rounded-lg px-4 py-2 min-h-[44px] disabled:opacity-50"
        >
          {t('privacy.acceptPolicy')}
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">{t('privacy.rightsTitle')}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="text-sm font-semibold border border-gray-300 rounded-lg px-4 py-2 min-h-[44px] disabled:opacity-50"
          >
            {t('privacy.exportButton')}
          </button>
        </div>
        <textarea
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t('privacy.erasurePlaceholder')}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
        />
        <button
          type="button"
          onClick={handleErasureRequest}
          disabled={busy}
          className="text-sm font-semibold border border-red-300 text-red-700 rounded-lg px-4 py-2 min-h-[44px] disabled:opacity-50"
        >
          {t('privacy.erasureButton')}
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">{t('privacy.requestsTitle')}</h2>
        {loading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
        {!loading && requests.length === 0 && <p className="text-sm text-gray-500">{t('privacy.noRequests')}</p>}
        {!loading && requests.length > 0 && (
          <ul className="space-y-2">
            {requests.map((request) => (
              <li key={request.id} className="text-sm border border-gray-100 rounded-md px-3 py-2">
                <span className="font-semibold">{request.type}</span> - {request.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      {message && <p className="text-sm text-blue-700" role="status">{message}</p>}
    </main>
  )
}
