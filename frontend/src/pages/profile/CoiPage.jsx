/**
 * EthicFlow — Conflict of Interest Declarations Page
 * Lets users create and manage their own COI declarations.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

const SCOPES = ['SUBMISSION', 'USER', 'DEPARTMENT', 'GLOBAL']

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
  const showUser = form.scope === 'USER'
  const showDepartment = form.scope === 'DEPARTMENT'

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>{t('coi.page.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('coi.page.subtitle')}</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm" role="alert">{error}</div>}

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>{t('coi.declare')}</h2>
        <label htmlFor="coi-scope" className="block text-xs font-semibold text-gray-600">
          {t('coi.scopeLabel')}
        </label>
        <select
          id="coi-scope"
          value={form.scope}
          onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        >
          {SCOPES.map((scope) => (
            <option key={scope} value={scope}>{t(`coi.scope.${scope.toLowerCase()}`)}</option>
          ))}
        </select>

        {showSubmission && (
          <>
            <label htmlFor="coi-submission-id" className="block text-xs font-semibold text-gray-600">
              {t('coi.fields.submissionId')}
            </label>
            <input
              id="coi-submission-id"
              value={form.targetSubmissionId}
              onChange={(event) => setForm((prev) => ({ ...prev, targetSubmissionId: event.target.value }))}
              placeholder={t('coi.fields.submissionId')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </>
        )}
        {showUser && (
          <>
            <label htmlFor="coi-user-id" className="block text-xs font-semibold text-gray-600">
              {t('coi.fields.userId')}
            </label>
            <input
              id="coi-user-id"
              value={form.targetUserId}
              onChange={(event) => setForm((prev) => ({ ...prev, targetUserId: event.target.value }))}
              placeholder={t('coi.fields.userId')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </>
        )}
        {showDepartment && (
          <>
            <label htmlFor="coi-department" className="block text-xs font-semibold text-gray-600">
              {t('coi.fields.department')}
            </label>
            <input
              id="coi-department"
              value={form.targetDepartment}
              onChange={(event) => setForm((prev) => ({ ...prev, targetDepartment: event.target.value }))}
              placeholder={t('coi.fields.department')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </>
        )}

        <label htmlFor="coi-reason" className="block text-xs font-semibold text-gray-600">
          {t('coi.reason')}
        </label>
        <textarea
          id="coi-reason"
          value={form.reason}
          onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
          placeholder={t('coi.reason')}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <button
          onClick={handleCreate}
          disabled={saving || !form.reason.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
        >
          {saving ? t('common.loading') : t('coi.declare')}
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>{t('coi.page.list')}</h2>
        {loading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
        {!loading && items.length === 0 && <p className="text-sm text-gray-500">{t('coi.page.empty')}</p>}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-100 rounded-lg p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">{t(`coi.scope.${item.scope.toLowerCase()}`)}</p>
                <p className="text-sm text-gray-800">{item.reason}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs px-3 py-2 rounded bg-red-50 text-red-700 min-h-[44px]"
                aria-label={`${t('common.delete')} ${t(`coi.scope.${item.scope.toLowerCase()}`)}`}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
