/**
 * EthicFlow — Institution Settings Page
 * ADMIN only. Grouped form with inline-edit + per-section Save.
 * Groups: Institution Info / SLA Thresholds / File Upload / Email
 * Pattern follows UsersPage layout — Lev palette header band.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

/**
 * Setting groups — controls display order and grouping.
 * Each entry: { key, type, hint? }
 */
const GROUPS = [
  {
    groupKey: 'institutionInfo',
    icon: '🏛️',
    fields: [
      { key: 'institution_name_he',  type: 'text' },
      { key: 'institution_name_en',  type: 'text' },
      { key: 'institution_logo_url', type: 'url',   hint: 'https://...' },
      { key: 'primary_color',        type: 'color'  },
    ],
  },
  {
    groupKey: 'slaThresholds',
    icon: '⏱️',
    fields: [
      { key: 'sla_triage_days',   type: 'number', hint: '1–30' },
      { key: 'sla_review_days',   type: 'number', hint: '1–90' },
      { key: 'sla_decision_days', type: 'number', hint: '1–30' },
    ],
  },
  {
    groupKey: 'fileUpload',
    icon: '📁',
    fields: [
      { key: 'max_file_size_mb',   type: 'number', hint: 'MB' },
      { key: 'allowed_file_types', type: 'text',   hint: '.pdf,.docx,.jpg' },
    ],
  },
  {
    groupKey: 'emailSettings',
    icon: '✉️',
    fields: [
      { key: 'email_sender_name',    type: 'text'  },
      { key: 'email_sender_address', type: 'email' },
    ],
  },
]

/**
 * Renders a single settings group card with its fields.
 * @param {{
 *   group: object,
 *   values: Record<string,string>,
 *   onSave: (groupKey: string, patch: Record<string,string>) => Promise<void>
 * }} props
 */
function SettingsGroup({ group, values, onSave }) {
  const { t } = useTranslation()

  // Local draft state — initialised from current values
  const [draft,   setDraft]   = useState({})
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)  // { type: 'ok'|'err', msg: string }

  // Sync draft when parent values change (e.g. after load)
  useEffect(() => {
    const initial = {}
    group.fields.forEach(f => { initial[f.key] = values[f.key] ?? '' })
    setDraft(initial)
  }, [values, group.fields])

  /** Returns true if any draft value differs from the saved value. */
  const isDirty = group.fields.some(f => (draft[f.key] ?? '') !== (values[f.key] ?? ''))

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      await onSave(group.groupKey, draft)
      setToast({ type: 'ok', msg: t('settings.saveSuccess') })
    } catch {
      setToast({ type: 'err', msg: t('settings.saveError') })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  function handleChange(key, val) {
    setDraft(prev => ({ ...prev, [key]: val }))
  }

  return (
    <section
      className="bg-white rounded-xl border shadow-sm overflow-hidden"
      aria-labelledby={`group-${group.groupKey}`}
    >
      {/* Group header */}
      <div className="px-5 py-4 border-b flex items-center gap-3">
        <span aria-hidden="true" className="text-xl">{group.icon}</span>
        <h2
          id={`group-${group.groupKey}`}
          className="text-sm font-bold"
          style={{ color: 'var(--lev-navy)' }}
        >
          {t(`settings.${group.groupKey}`)}
        </h2>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-5">
        {group.fields.map(field => {
          const inputId = `setting-${field.key}`
          return (
            <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 md:items-center">
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-gray-700"
              >
                {t(`settings.${field.key}`)}
              </label>

              <div className="md:col-span-2 flex items-center gap-3">
                {field.type === 'color' ? (
                  /* Colour picker + hex text input side by side */
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      id={inputId}
                      type="color"
                      value={draft[field.key] || '#1E2A72'}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="h-10 w-10 rounded border border-gray-200 cursor-pointer p-0.5"
                      aria-label={t(`settings.${field.key}`)}
                    />
                    <input
                      type="text"
                      value={draft[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder="#1E2A72"
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 font-mono"
                      style={{ minHeight: '40px', '--tw-ring-color': 'var(--lev-navy)' }}
                      aria-label={`${t(`settings.${field.key}`)} (hex)`}
                    />
                  </div>
                ) : (
                  <input
                    id={inputId}
                    type={field.type}
                    value={draft[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.hint ?? ''}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
                    style={{ minHeight: '40px', '--tw-ring-color': 'var(--lev-navy)' }}
                    min={field.type === 'number' ? 1 : undefined}
                    aria-label={t(`settings.${field.key}`)}
                  />
                )}

                {field.hint && field.type !== 'color' && (
                  <span className="text-xs text-gray-400 shrink-0">{field.hint}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: toast + save button */}
      <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between gap-3">
        <div aria-live="polite" aria-atomic="true">
          {toast && (
            <p className={`text-xs font-semibold ${toast.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {toast.type === 'ok' ? '✓ ' : '✗ '}{toast.msg}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="text-sm font-bold text-white px-5 py-2 rounded-lg disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--lev-navy)', minHeight: '40px' }}
          aria-label={t('settings.save')}
        >
          {saving ? '…' : t('settings.save')}
        </button>
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const [values,  setValues]  = useState({})   // keyed map: { key → value }
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Non-admin users see an access-denied placeholder
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl mb-4" aria-hidden="true">🔒</p>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
          {t('settings.title')}
        </h1>
        <p className="text-sm text-gray-600">{t('errors.FORBIDDEN')}</p>
      </div>
    )
  }

  // ── Fetch all settings ───────────────────────

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/settings')
        const map = {}
        res.data.data.forEach(s => { map[s.key] = s.value })
        setValues(map)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // ── Save a group — PUT each changed key ──────

  /**
   * Saves all fields in a group that have changed vs the current saved values.
   * @param {string} _groupKey - unused, kept for symmetry
   * @param {Record<string,string>} draft - all field values for the group
   */
  async function handleGroupSave(_groupKey, draft) {
    const updates = Object.entries(draft).filter(
      ([k, v]) => v !== (values[k] ?? '')
    )
    await Promise.all(
      updates.map(([key, value]) => api.put(`/settings/${key}`, { value }))
    )
    // Merge saved values into local state
    setValues(prev => ({ ...prev, ...Object.fromEntries(updates) }))
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header band — Lev navy ── */}
      <div
        className="px-4 md:px-6 py-5"
        style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, #2d4db5 100%)' }}
      >
        <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
        {loading && (
          <div className="flex justify-center py-20 text-gray-400 text-sm" role="status" aria-live="polite">
            {t('common.loading')}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="max-w-3xl mx-auto space-y-4">
            {GROUPS.map(group => (
              <SettingsGroup
                key={group.groupKey}
                group={group}
                values={values}
                onSave={handleGroupSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
