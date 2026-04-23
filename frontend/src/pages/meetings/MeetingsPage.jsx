/**
 * EthicFlow — Meetings List Page
 * Shows all committee meetings with filter tabs (upcoming/past/all).
 * Secretary/Admin can create meetings and invite attendees.
 * Displays calendar sync status (Microsoft / Google).
 * Rebuilt on the EthicFlow design system (PageHeader, Card, Badge, Tabs,
 * Button, Modal, FormField, Input) with the Lev palette and lucide-react icons.
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays, CalendarCheck2, MapPin, Link2, ClipboardList, Users,
  Plus, CalendarClock,
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  Button, Badge, Tabs, Modal, FormField, Input, EmptyState, Spinner,
  PageHeader, AccessibleIcon,
} from '../../components/ui'

/**
 * Resolves the primary role name for a user object.
 * @param {object} user
 * @returns {string}
 */
function getPrimaryRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : ['RESEARCHER'])
  return ['ADMIN', 'CHAIRMAN', 'SECRETARY', 'REVIEWER', 'RESEARCHER'].find((role) => roles.includes(role)) || 'RESEARCHER'
}

/**
 * Formats a date string for display.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Meeting status → Badge tone.
 * @param {string} status
 * @returns {'info'|'success'|'danger'|'neutral'}
 */
function meetingStatusTone(status) {
  switch (status) {
    case 'SCHEDULED': return 'info'
    case 'COMPLETED': return 'success'
    case 'CANCELLED': return 'danger'
    default:          return 'neutral'
  }
}

/**
 * Personal sync status → Badge tone.
 * @param {string} status
 * @returns {'success'|'warning'|'danger'|'neutral'}
 */
function personalSyncTone(status) {
  switch (status) {
    case 'SYNCED':    return 'success'
    case 'PENDING':   return 'warning'
    case 'FAILED':    return 'danger'
    case 'CANCELLED': return 'neutral'
    default:          return 'neutral'
  }
}

/**
 * Meeting status badge.
 * @param {{ status: string, t: Function }} props
 */
function MeetingStatusBadge({ status, t }) {
  if (!status) return null
  const label = t(`meetings.status${status.charAt(0) + status.slice(1).toLowerCase()}`, status)
  return <Badge tone={meetingStatusTone(status)} size="sm">{label}</Badge>
}

/**
 * Calendar sync indicator — shows which external calendar this meeting is synced to.
 * @param {{ externalCalendarId: string|null, t: Function }} props
 */
function CalendarSyncBadge({ externalCalendarId, t }) {
  if (!externalCalendarId) return null
  return (
    <Badge tone="success" size="sm" aria-label={t('meetings.calendarSynced')}>
      <AccessibleIcon icon={CalendarCheck2} size={12} decorative />
      {t('meetings.calendarSynced')}
    </Badge>
  )
}

/**
 * Personal calendar sync status badge for the current user.
 * @param {{ sync: { status?: string }|null, t: Function }} props
 */
function PersonalSyncBadge({ sync, t }) {
  const status = sync?.status
  if (!status) return null
  const label = t(`meetings.personalSync${status.charAt(0) + status.slice(1).toLowerCase()}`, status)
  return <Badge tone={personalSyncTone(status)} size="sm">{label}</Badge>
}

/**
 * Multi-select attendee picker — scrollable checkbox list of committee users.
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
      <p className="text-xs py-2" style={{ color: 'var(--status-danger)' }} role="alert">
        {t('meetings.usersLoadError')}
      </p>
    )
  }

  if (users.length === 0) {
    return <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>{t('meetings.noUsersToInvite')}</p>
  }

  return (
    <div
      className="overflow-y-auto"
      style={{
        maxHeight: 180,
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
      }}
      role="group"
      aria-label={t('meetings.inviteAttendees')}
    >
      {users.map(u => (
        <label
          key={u.id}
          className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <input
            type="checkbox"
            checked={selected.includes(u.id)}
            onChange={() => toggleUser(u.id)}
            className="w-4 h-4"
            style={{ accentColor: 'var(--lev-navy)' }}
          />
          <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{u.fullName}</span>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {t(`roles.${getPrimaryRole(u).toLowerCase()}`, getPrimaryRole(u))}
          </span>
        </label>
      ))}
    </div>
  )
}

/**
 * Create meeting modal — title, date, location, link, duration, attendees.
 * @param {{ open: boolean, onClose: Function, onCreated: Function, t: Function }} props
 */
function CreateMeetingModal({ open, onClose, onCreated, t }) {
  const [form, setForm] = useState({
    title: '', scheduledAt: '', location: '', meetingLink: '', durationMinutes: '60',
  })
  const [attendeeIds,    setAttendeeIds]    = useState([])
  const [users,          setUsers]          = useState([])
  const [usersLoadError, setUsersLoadError] = useState(false)
  const [error,          setError]          = useState(null)
  const [saving,         setSaving]         = useState(false)

  useEffect(() => {
    if (!open) return
    api.get('/users/admin/users?limit=200&role=SECRETARY,REVIEWER,CHAIRMAN,ADMIN')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => {
        api.get('/users/admin/users?limit=200')
          .then(({ data }) => setUsers(
            (data.data ?? []).filter(u => getPrimaryRole(u) !== 'RESEARCHER' && u.isActive)
          ))
          .catch(() => setUsersLoadError(true))
      })
  }, [open])

  async function handleSubmit() {
    if (!form.title.trim()) return setError(t('meetings.errorTitleRequired'))
    if (!form.scheduledAt)  return setError(t('meetings.errorDateRequired'))

    setSaving(true)
    setError(null)
    try {
      await api.post('/meetings', {
        title:       form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        ...(form.location    && { location:    form.location }),
        ...(form.meetingLink && { meetingLink: form.meetingLink }),
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
    <Modal
      open={open}
      onClose={onClose}
      title={t('meetings.create')}
      size="md"
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            data-testid="meeting-create-cancel"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || !form.scheduledAt}
            loading={saving}
            data-testid="meeting-create-submit"
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 text-sm"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 12px',
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        <FormField
          label={t('common.title')}
          required
          render={({ inputId, describedBy, required, invalid }) => (
            <Input
              id={inputId}
              type="text"
              data-testid="meeting-create-title"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              aria-required={required || undefined}
              aria-describedby={describedBy}
              invalid={invalid}
              autoFocus
            />
          )}
        />

        <FormField
          label={t('meetings.date')}
          required
          render={({ inputId, describedBy, required, invalid }) => (
            <Input
              id={inputId}
              type="datetime-local"
              data-testid="meeting-create-datetime"
              value={form.scheduledAt}
              onChange={(e) => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              aria-required={required || undefined}
              aria-describedby={describedBy}
              invalid={invalid}
              dir="ltr"
            />
          )}
        />

        <FormField
          label={t('meetings.durationMinutes')}
          render={({ inputId, describedBy }) => (
            <Input
              id={inputId}
              type="number"
              min="15"
              max="480"
              step="15"
              data-testid="meeting-create-duration"
              value={form.durationMinutes}
              onChange={(e) => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              aria-describedby={describedBy}
              dir="ltr"
            />
          )}
        />

        <FormField
          label={t('meetings.location')}
          render={({ inputId, describedBy }) => (
            <Input
              id={inputId}
              type="text"
              data-testid="meeting-create-location"
              value={form.location}
              onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              aria-describedby={describedBy}
            />
          )}
        />

        <FormField
          label={t('meetings.meetingLink')}
          render={({ inputId, describedBy }) => (
            <Input
              id={inputId}
              type="url"
              data-testid="meeting-create-link"
              placeholder="https://..."
              value={form.meetingLink}
              onChange={(e) => setForm(f => ({ ...f, meetingLink: e.target.value }))}
              aria-describedby={describedBy}
              dir="ltr"
            />
          )}
        />

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>
              {t('meetings.inviteAttendees')}
            </span>
            {attendeeIds.length > 0 && (
              <Badge tone="navy" size="sm">{attendeeIds.length}</Badge>
            )}
          </div>
          <AttendeePicker
            users={users}
            selected={attendeeIds}
            onChange={setAttendeeIds}
            loadError={usersLoadError}
            t={t}
          />
        </div>
      </div>
    </Modal>
  )
}

/**
 * Meetings list page — shows committee meetings with filter tabs.
 * @returns {JSX.Element}
 */
export default function MeetingsPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const location = useLocation()

  const [meetings, setMeetings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filter, setFilter]         = useState('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const returnPath = `${location.pathname}${location.search}`

  const canManage = user?.role === 'SECRETARY' || user?.role === 'ADMIN'

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/meetings?filter=${filter}&limit=50`)
      setMeetings(Array.isArray(data.data) ? data.data : [])
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }, [filter, t])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  const tabItems = [
    { key: 'upcoming', label: t('meetings.upcoming') },
    { key: 'past',     label: t('meetings.past') },
    { key: 'all',      label: t('meetings.all') },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader
        title={t('meetings.title')}
        actions={
          <>
            <Link
              to="/meetings/calendar"
              state={{ from: returnPath }}
              data-testid="meetings-open-calendar"
              className="inline-flex items-center gap-2 font-semibold transition"
              style={{
                minHeight: 44,
                padding: '0 16px',
                fontSize: 14,
                color: 'var(--lev-navy)',
                background: '#fff',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span>{t('meetings.openCalendar')}</span>
            </Link>
            {canManage && (
              <Button
                variant="gold"
                data-testid="meetings-open-create-modal"
                onClick={() => setShowCreate(true)}
                leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                aria-label={t('meetings.create')}
              >
                {t('meetings.create')}
              </Button>
            )}
          </>
        }
      />

      <Tabs
        items={tabItems}
        value={filter}
        onChange={setFilter}
        variant="pills"
        ariaLabel={t('meetings.title')}
      />

      {error && (
        <div
          role="alert"
          className="text-sm font-medium"
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

      {loading && (
        <div className="flex justify-center py-12" role="status" aria-live="polite">
          <Spinner size={32} label={t('common.loading')} />
        </div>
      )}

      {!loading && !error && meetings.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title={t('meetings.noMeetings')}
          action={
            canManage ? (
              <Button
                variant="gold"
                leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                onClick={() => setShowCreate(true)}
              >
                {t('meetings.create')}
              </Button>
            ) : null
          }
        />
      )}

      {!loading && meetings.length > 0 && (
        <ul className="space-y-3" role="list">
          {meetings.map(meeting => (
            <li key={meeting.id} role="listitem">
              <Link
                to={`/meetings/${meeting.id}`}
                state={{ from: returnPath }}
                data-testid={`meetings-row-${meeting.id}`}
                className="block p-4 bg-white transition hover:shadow-md"
                style={{
                  borderRadius: 'var(--radius-2xl)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-sm)',
                }}
                aria-label={`${meeting.title} — ${formatDate(meeting.scheduledAt)}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2
                        className="font-semibold truncate"
                        style={{ color: 'var(--lev-navy)' }}
                      >
                        {meeting.title}
                      </h2>
                      <MeetingStatusBadge status={meeting.status} t={t} />
                      <CalendarSyncBadge externalCalendarId={meeting.externalCalendarId} t={t} />
                      <PersonalSyncBadge sync={meeting.userCalendarSync} t={t} />
                    </div>

                    <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <AccessibleIcon icon={CalendarDays} size={14} decorative />
                      <span>{formatDate(meeting.scheduledAt)}</span>
                    </p>

                    {meeting.location && (
                      <p className="text-sm flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        <AccessibleIcon icon={MapPin} size={14} decorative />
                        <span>{meeting.location}</span>
                      </p>
                    )}

                    {meeting.meetingLink && (
                      <span
                        className="inline-flex items-center gap-1 text-xs mt-1"
                        style={{ color: 'var(--lev-teal-text)' }}
                      >
                        <AccessibleIcon icon={Link2} size={12} decorative />
                        <span>{t('meetings.onlineMeeting')}</span>
                      </span>
                    )}
                  </div>

                  <div
                    className="text-sm flex gap-4 flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span
                      className="inline-flex items-center gap-1"
                      title={t('meetings.agendaItems')}
                      aria-label={t('meetings.agendaItems')}
                    >
                      <AccessibleIcon icon={ClipboardList} size={14} decorative />
                      <span className="tabular-nums">{meeting._count?.agendaItems ?? 0}</span>
                    </span>
                    <span
                      className="inline-flex items-center gap-1"
                      title={t('meetings.attendees')}
                      aria-label={t('meetings.attendees')}
                    >
                      <AccessibleIcon icon={Users} size={14} decorative />
                      <span className="tabular-nums">{meeting.attendees?.length ?? 0}</span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateMeetingModal
        t={t}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchMeetings}
      />
    </div>
  )
}
