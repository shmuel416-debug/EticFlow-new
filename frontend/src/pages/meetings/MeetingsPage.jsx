/**
 * EthicFlow — Meetings List Page
 * Shows all committee meetings with filter tabs (upcoming/past/all).
 * Secretary/Admin can create meetings and invite attendees.
 * Displays calendar sync status (Microsoft / Google).
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

/**
 * Meeting status badge.
 * @param {{ status: string, t: Function }} props
 */
function StatusBadge({ status, t }) {
  if (!status) return null
  const map = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  const label = t(`meetings.status${status.charAt(0) + status.slice(1).toLowerCase()}`, status)
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  )
}

/**
 * Calendar sync indicator — shows which external calendar this meeting is synced to.
 * @param {{ externalCalendarId: string|null, calendarProvider: string, t: Function }} props
 */
function CalendarSyncBadge({ externalCalendarId, t }) {
  if (!externalCalendarId) return null
  return (
    <span
      title={t('meetings.calendarSynced')}
      className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200"
      aria-label={t('meetings.calendarSynced')}
    >
      <span aria-hidden="true">📆</span>
      {t('meetings.calendarSynced')}
    </span>
  )
}

/**
 * Multi-select attendee picker — shows a scrollable checkbox list of committee users.
 * @param {{ users: Array, selected: string[], onChange: Function, loadError: boolean, t: Function }} props
 */
function AttendeePicker({ users, selected, onChange, loadError, t }) {
  /**
   * Toggles a user in/out of the selected list.
   * @param {string} userId
   */
  function toggleUser(userId) {
    onChange(
      selected.includes(userId)
        ? selected.filter(id => id !== userId)
        : [...selected, userId]
    )
  }

  if (loadError) {
    return (
      <p className="text-xs text-red-500 py-2" role="alert">
        {t('meetings.usersLoadError')}
      </p>
    )
  }

  if (users.length === 0) {
    return <p className="text-xs text-gray-500 py-2">{t('meetings.noUsersToInvite')}</p>
  }

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-y-auto"
      style={{ maxHeight: '180px' }}
      role="group"
      aria-label={t('meetings.inviteAttendees')}
    >
      {users.map(u => (
        <label
          key={u.id}
          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
        >
          <input
            type="checkbox"
            checked={selected.includes(u.id)}
            onChange={() => toggleUser(u.id)}
            className="accent-blue-600 w-4 h-4"
          />
          <span className="flex-1 truncate">{u.fullName}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{t(`roles.${u.role.toLowerCase()}`, u.role)}</span>
        </label>
      ))}
    </div>
  )
}

/**
 * Create meeting modal — title, date, location, link, duration, attendees.
 * @param {{ onClose: Function, onCreated: Function, t: Function }} props
 */
function CreateMeetingModal({ onClose, onCreated, t }) {
  const [form, setForm]         = useState({
    title: '', scheduledAt: '', location: '', meetingLink: '', durationMinutes: '60',
  })
  const [attendeeIds, setAttendeeIds]     = useState([])
  const [users, setUsers]                 = useState([])
  const [usersLoadError, setUsersLoadError] = useState(false)
  const [error, setError]                 = useState(null)
  const [saving, setSaving]               = useState(false)

  /** Close on Escape key */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  /** Fetch committee users (everyone except RESEARCHER) */
  useEffect(() => {
    api.get('/users/admin/users?limit=200&role=SECRETARY,REVIEWER,CHAIRMAN,ADMIN')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => {
        // Fallback: fetch all and filter client-side
        api.get('/users/admin/users?limit=200')
          .then(({ data }) => setUsers(
            (data.data ?? []).filter(u => u.role !== 'RESEARCHER' && u.isActive)
          ))
          .catch(() => setUsersLoadError(true))
      })
  }, [])

  /**
   * Validates the form and submits it to POST /api/meetings.
   */
  async function handleSubmit() {
    if (!form.title.trim()) return setError(t('meetings.errorTitleRequired'))
    if (!form.scheduledAt)  return setError(t('meetings.errorDateRequired'))

    setSaving(true)
    setError(null)
    try {
      await api.post('/meetings', {
        title:           form.title.trim(),
        scheduledAt:     new Date(form.scheduledAt).toISOString(),
        ...(form.location    && { location:        form.location }),
        ...(form.meetingLink && { meetingLink:      form.meetingLink }),
        ...(form.durationMinutes && { durationMinutes: parseInt(form.durationMinutes, 10) }),
        ...(attendeeIds.length > 0 && { attendeeIds }),
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="create-meeting-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 id="create-meeting-title" className="text-lg font-bold mb-4" style={{ color: 'var(--lev-navy)' }}>
          {t('meetings.create')}
        </h2>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label htmlFor="cm-title" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('common.title')} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input id="cm-title" type="text" value={form.title} aria-required="true"
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Date & time */}
          <div>
            <label htmlFor="cm-date" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('meetings.date')} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input id="cm-date" type="datetime-local" value={form.scheduledAt} aria-required="true"
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="cm-duration" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('meetings.durationMinutes')}
            </label>
            <input id="cm-duration" type="number" min="15" max="480" step="15"
              value={form.durationMinutes}
              onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="cm-location" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('meetings.location')}
            </label>
            <input id="cm-location" type="text" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Meeting link */}
          <div>
            <label htmlFor="cm-link" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('meetings.meetingLink')}
            </label>
            <input id="cm-link" type="url" value={form.meetingLink} dir="ltr"
              placeholder="https://..."
              onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('meetings.inviteAttendees')}
              {attendeeIds.length > 0 && (
                <span className="ms-1.5 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                  {attendeeIds.length}
                </span>
              )}
            </label>
            <AttendeePicker users={users} selected={attendeeIds} onChange={setAttendeeIds} loadError={usersLoadError} t={t} />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-h-[44px] hover:bg-gray-50">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.scheduledAt}
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
   * Fetches meetings list from API.
   */
  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/meetings?filter=${filter}&limit=50`)
      // Defensive guard: ensure we always have an array
      setMeetings(Array.isArray(data.data) ? data.data : [])
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
      setMeetings([])
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
        <div className="flex items-center gap-2">
          <Link
            to="/meetings/calendar"
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold min-h-[44px] inline-flex items-center"
          >
            {t('meetings.openCalendar')}
          </Link>
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
      {error && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

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
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px]"
              style={{ background: 'var(--lev-navy)' }}
            >
              {t('meetings.create')}
            </button>
          )}
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
                  {/* Title + status badges */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold text-gray-900 truncate">{meeting.title}</h2>
                    <StatusBadge status={meeting.status} t={t} />
                    <CalendarSyncBadge externalCalendarId={meeting.externalCalendarId} t={t} />
                  </div>
                  {/* Date */}
                  <p className="text-sm text-gray-500">
                    <span aria-hidden="true">📅</span> {formatDate(meeting.scheduledAt)}
                  </p>
                  {/* Location */}
                  {meeting.location && (
                    <p className="text-sm text-gray-500">
                      <span aria-hidden="true">📍</span> {meeting.location}
                    </p>
                  )}
                  {/* Online meeting link */}
                  {meeting.meetingLink && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                      <span aria-hidden="true">🔗</span> {t('meetings.onlineMeeting')}
                    </span>
                  )}
                </div>
                {/* Stats */}
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
