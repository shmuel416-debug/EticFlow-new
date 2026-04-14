/**
 * EthicFlow — Meetings List Page
 * Shows all committee meetings with filter tabs (upcoming/past/all).
 * Secretary/Admin can create meetings. All authenticated users can view.
 * IS 5568 / WCAG 2.2 AA: 44px targets, aria, responsive cards.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

/** Format a date string for display */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Meeting status badge */
function StatusBadge({ status, t }) {
  const map = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {t(`meetings.status${status.charAt(0) + status.slice(1).toLowerCase()}`)}
    </span>
  )
}

/** Create meeting modal */
function CreateMeetingModal({ onClose, onCreated, t }) {
  const [form, setForm]   = useState({ title: '', scheduledAt: '', location: '', meetingLink: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  /**
   * Submits the create meeting form.
   */
  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title:       form.title,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : '',
        ...(form.location    && { location:    form.location }),
        ...(form.meetingLink && { meetingLink: form.meetingLink }),
      }
      await api.post('/meetings', payload)
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         role="dialog" aria-modal="true" aria-label={t('meetings.create')}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--lev-navy)' }}>{t('meetings.create')}</h2>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <div className="space-y-3">
          {[
            { key: 'title',       label: t('common.title'),                    type: 'text',     required: true },
            { key: 'scheduledAt', label: t('meetings.date'),                     type: 'datetime-local', required: true },
            { key: 'location',    label: t('meetings.location'),                 type: 'text' },
            { key: 'meetingLink', label: t('meetings.meetingLink'),              type: 'url' },
          ].map(({ key, label, type, required }) => (
            <div key={key}>
              <label htmlFor={`cm-${key}`} className="block text-xs font-semibold text-gray-600 mb-1">
                {label}{required && <span className="text-red-500 ms-0.5" aria-hidden="true">*</span>}
              </label>
              <input
                id={`cm-${key}`}
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                aria-required={required}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-h-[44px] hover:bg-gray-50">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px] disabled:opacity-60"
            style={{ background: 'var(--lev-navy)' }}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Meetings list page — shows committee meetings with filter tabs.
 * @returns {JSX.Element}
 */
export default function MeetingsPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const [meetings, setMeetings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filter, setFilter]         = useState('upcoming')
  const [showCreate, setShowCreate] = useState(false)

  const canManage = user?.role === 'SECRETARY' || user?.role === 'ADMIN'

  /**
   * Fetches meetings list.
   */
  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/meetings?filter=${filter}&limit=50`)
      setMeetings(data.data)
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [filter, t])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  const tabs = [
    { key: 'upcoming', label: t('meetings.upcoming') },
    { key: 'past',     label: t('meetings.past') },
    { key: 'all',      label: t('meetings.all') },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>{t('meetings.title')}</h1>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px]"
            style={{ background: 'var(--lev-navy)' }}
            aria-label={t('meetings.create')}
          >
            <span aria-hidden="true">+</span>
            {t('meetings.create')}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit" role="tablist" aria-label={t('meetings.title')}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[36px]
              ${filter === tab.key ? 'bg-white shadow-sm text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4 mb-4 text-sm">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div role="status" aria-label={t('common.loading')}
               className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && meetings.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <span aria-hidden="true" className="text-4xl block mb-3">📅</span>
          <p>{t('meetings.noMeetings')}</p>
        </div>
      )}

      {/* Meetings list */}
      {!loading && meetings.length > 0 && (
        <div className="space-y-3">
          {meetings.map(meeting => (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md
                         transition-shadow focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`${meeting.title} — ${formatDate(meeting.scheduledAt)}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold text-gray-900 truncate">{meeting.title}</h2>
                    <StatusBadge status={meeting.status} t={t} />
                  </div>
                  <p className="text-sm text-gray-500">
                    <span aria-hidden="true">📅</span> {formatDate(meeting.scheduledAt)}
                  </p>
                  {meeting.location && (
                    <p className="text-sm text-gray-500">
                      <span aria-hidden="true">📍</span> {meeting.location}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500 flex gap-4 flex-shrink-0">
                  <span title={t('meetings.agendaItems')}>
                    <span aria-hidden="true">📋</span> {meeting._count?.agendaItems ?? 0}
                  </span>
                  <span title={t('meetings.attendees')}>
                    <span aria-hidden="true">👥</span> {meeting.attendees?.length ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateMeetingModal
          t={t}
          onClose={() => setShowCreate(false)}
          onCreated={fetchMeetings}
        />
      )}
    </div>
  )
}
