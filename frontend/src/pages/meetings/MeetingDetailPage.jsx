/**
 * EthicFlow — Meeting Detail Page
 * Shows full meeting details: agenda items, attendees tab (invite/remove), attendance.
 * Secretary/Admin can manage agenda, invite new attendees, and record attendance.
 * Shows external calendar sync status (Microsoft / Google).
 * IS 5568 / WCAG 2.2 AA: 44px targets, aria, keyboard navigation.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import CoiBadge from '../../components/meetings/CoiBadge'

function getPrimaryRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : ['RESEARCHER'])
  return ['ADMIN', 'CHAIRMAN', 'SECRETARY', 'REVIEWER', 'RESEARCHER'].find((role) => roles.includes(role)) || 'RESEARCHER'
}

/** Format a datetime string */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Calendar sync status strip — shown in meeting header if synced.
 * @param {{ externalCalendarId: string|null, t: Function }} props
 */
function CalendarSyncStrip({ externalCalendarId, t }) {
  if (!externalCalendarId) return null
  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-green-700 bg-green-50
                    border border-green-200 rounded-lg px-3 py-2 w-fit">
      <span aria-hidden="true">📆</span>
      <span>{t('meetings.calendarSyncedDetail')}</span>
      <code className="font-mono opacity-60 text-xs hidden md:inline"
            title={t('meetings.calendarEventId')}>
        {externalCalendarId.slice(0, 20)}…
      </code>
    </div>
  )
}

/**
 * Personal sync status strip for current user.
 * @param {{ sync: { status?: string, lastSyncAt?: string|null }|null, t: Function }} props
 */
function PersonalCalendarSyncStrip({ sync, t }) {
  const status = sync?.status
  if (!status) return null
  const toneMap = {
    SYNCED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    PENDING: 'text-amber-700 bg-amber-50 border-amber-200',
    FAILED: 'text-red-700 bg-red-50 border-red-200',
    CANCELLED: 'text-gray-700 bg-gray-50 border-gray-200',
  }
  return (
    <div className={`flex items-center gap-2 mt-2 text-xs border rounded-lg px-3 py-2 w-fit ${toneMap[status] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>
      <span aria-hidden="true">👤</span>
      <span>{t(`meetings.personalSync${status.charAt(0) + status.slice(1).toLowerCase()}`, status)}</span>
      {sync?.lastSyncAt && (
        <span className="opacity-70">
          · {new Date(sync.lastSyncAt).toLocaleString('he-IL')}
        </span>
      )}
    </div>
  )
}

/**
 * Meeting Detail Page — agenda, attendees (invite/remove), attendance.
 * @returns {JSX.Element}
 */
export default function MeetingDetailPage() {
  const { t }     = useTranslation()
  const { id }    = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [meeting, setMeeting]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [activeTab, setActiveTab]       = useState('agenda')

  // ── Agenda ──────────────────────────────────
  const [submissions, setSubmissions]   = useState([])
  const [selectedSub, setSelectedSub]   = useState('')
  const [duration, setDuration]         = useState('')
  const [addingItem, setAddingItem]     = useState(false)
  const [addError, setAddError]         = useState(null)

  // ── Attendees management ─────────────────────
  const [allUsers, setAllUsers]           = useState([])
  const [usersLoadError, setUsersLoadError] = useState(false)
  const [selectedUser, setSelectedUser]   = useState('')
  const [addingUser, setAddingUser]       = useState(false)
  const [addUserError, setAddUserError]   = useState(null)
  const [removingId, setRemovingId]       = useState(null)

  // ── Attendance ───────────────────────────────
  const [attendance, setAttendance]       = useState({})
  const [savingAttendance, setSavingAttendance] = useState(false)

  const canManage = user?.role === 'SECRETARY' || user?.role === 'ADMIN'
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/meetings'

  /**
   * Fetches full meeting details.
   */
  const fetchMeeting = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/meetings/${id}`)
      const m = data.data
      setMeeting(m)
      // Seed attendance state from existing records
      const att = {}
      m.attendees?.forEach(a => { att[a.userId] = a.attended })
      setAttendance(att)
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { fetchMeeting() }, [fetchMeeting])

  /** Fetch submissions for agenda selector */
  useEffect(() => {
    if (!canManage) return
    api.get('/submissions?limit=100')
      .then(({ data }) => setSubmissions(data.data ?? []))
      .catch(() => {})
  }, [canManage])

  /** Fetch all committee users for attendee invite */
  useEffect(() => {
    if (!canManage) return
    api.get('/users/admin/users?limit=200')
      .then(({ data }) => {
        setAllUsers((data.data ?? []).filter(u => getPrimaryRole(u) !== 'RESEARCHER' && u.isActive))
      })
      .catch(() => setUsersLoadError(true))
  }, [canManage])

  // ── Agenda handlers ──────────────────────────

  /**
   * Adds a submission to the meeting agenda.
   */
  async function handleAddAgendaItem() {
    if (!selectedSub) return
    setAddingItem(true)
    setAddError(null)
    try {
      await api.post(`/meetings/${id}/agenda`, {
        submissionId: selectedSub,
        ...(duration && { duration: parseInt(duration, 10) }),
      })
      setSelectedSub('')
      setDuration('')
      fetchMeeting()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddingItem(false)
    }
  }

  /**
   * Removes an agenda item.
   * @param {string} itemId
   */
  async function handleRemoveAgendaItem(itemId) {
    try {
      await api.delete(`/meetings/${id}/agenda/${itemId}`)
      fetchMeeting()
    } catch (err) {
      alert(err.message)
    }
  }

  // ── Attendee handlers ────────────────────────

  /**
   * Invites a new user to the meeting.
   */
  async function handleAddAttendee() {
    if (!selectedUser) return
    setAddingUser(true)
    setAddUserError(null)
    try {
      await api.post(`/meetings/${id}/attendees`, { userId: selectedUser })
      setSelectedUser('')
      fetchMeeting()
    } catch (err) {
      setAddUserError(err.message)
    } finally {
      setAddingUser(false)
    }
  }

  /**
   * Removes an attendee from the meeting.
   * @param {string} userId
   */
  async function handleRemoveAttendee(userId) {
    setRemovingId(userId)
    try {
      await api.delete(`/meetings/${id}/attendees/${userId}`)
      fetchMeeting()
    } catch (err) {
      alert(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  // ── Attendance handler ───────────────────────

  /**
   * Saves attendance records for all listed attendees.
   */
  async function handleSaveAttendance() {
    setSavingAttendance(true)
    try {
      const attended = Object.entries(attendance).map(([userId, didAttend]) => ({ userId, attended: didAttend }))
      if (attended.length === 0) return
      await api.patch(`/meetings/${id}/attendance`, { attended })
      fetchMeeting()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingAttendance(false)
    }
  }

  // ── Cancel handler ───────────────────────────

  /**
   * Cancels the entire meeting (soft-delete).
   */
  async function handleCancel() {
    if (!window.confirm(t('meetings.confirmCancel'))) return
    try {
      await api.delete(`/meetings/${id}`)
      navigate(backTo)
    } catch (err) {
      alert(err.message)
    }
  }

  // ── Render guards ────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div role="status" aria-label={t('common.loading')}
             className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
        <Link to={backTo} className="text-sm text-blue-600 hover:underline mt-3 inline-block">
          ← {t('meetings.title')}
        </Link>
      </div>
    )
  }

  if (!meeting) return null

  // IDs of users already attending (to exclude from invite dropdown)
  const attendeeUserIds = new Set(meeting.attendees?.map(a => a.userId) ?? [])
  const uninvitedUsers  = allUsers.filter(u => !attendeeUserIds.has(u.id))

  const tabs = [
    { key: 'agenda',     label: t('meetings.agenda') },
    { key: 'attendees',  label: `${t('meetings.attendees')} (${meeting.attendees?.length ?? 0})` },
    { key: 'attendance', label: t('meetings.attendance') },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link to={backTo} className="text-sm text-blue-600 hover:underline mb-4 inline-flex items-center gap-1">
        <span aria-hidden="true">←</span> {t('meetings.title')}
      </Link>

      {/* Meeting header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mt-3 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>{meeting.title}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                ${meeting.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800'
                : meeting.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'}`}>
                {t(`meetings.status${meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase()}`, meeting.status)}
              </span>
            </div>

            <p className="text-sm text-gray-500">
              <span aria-hidden="true">📅</span> {formatDate(meeting.scheduledAt)}
            </p>
            {meeting.location && (
              <p className="text-sm text-gray-500">
                <span aria-hidden="true">📍</span> {meeting.location}
              </p>
            )}
            {meeting.meetingLink && (
              <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"
                 className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                <span aria-hidden="true">🔗</span> {t('meetings.joinOnline')}
              </a>
            )}

            {/* Calendar sync status */}
            <CalendarSyncStrip externalCalendarId={meeting.externalCalendarId} t={t} />
            <PersonalCalendarSyncStrip sync={meeting.userCalendarSync} t={t} />
          </div>

          {/* Cancel button */}
          {canManage && meeting.status !== 'CANCELLED' && (
            <button
              onClick={handleCancel}
              className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 min-h-[44px]
                         focus-visible:ring-2 focus-visible:ring-red-500 flex-shrink-0"
            >
              {t('meetings.cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit overflow-x-auto"
           role="tablist" aria-label={t('meetings.title')}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[36px] whitespace-nowrap
              ${activeTab === tab.key ? 'bg-white shadow-sm text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── AGENDA TAB ────────────────────────────── */}
      {activeTab === 'agenda' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>{t('meetings.agenda')}</h2>

          {canManage && meeting.status !== 'CANCELLED' && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 mb-2">{t('meetings.addSubmission')}</p>
              {addError && <div role="alert" className="text-red-600 text-xs mb-2">{addError}</div>}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedSub}
                  onChange={e => setSelectedSub(e.target.value)}
                  aria-label={t('meetings.selectSubmission')}
                  className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('meetings.selectSubmission')}</option>
                  {submissions.map(s => (
                    <option key={s.id} value={s.id}>{s.applicationId} — {s.title}</option>
                  ))}
                </select>
                <input
                  type="number" min="1" max="480"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder={t('meetings.duration')}
                  aria-label={t('meetings.duration')}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                             focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr"
                />
                <button
                  onClick={handleAddAgendaItem}
                  disabled={!selectedSub || addingItem}
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px] disabled:opacity-60"
                  style={{ background: 'var(--lev-navy)' }}
                >
                  {t('meetings.addToAgenda')}
                </button>
              </div>
            </div>
          )}

          {meeting.agendaItems?.length === 0 && (
            <p className="text-center py-8 text-gray-500 text-sm">{t('meetings.noAgendaItems')}</p>
          )}
          <ol className="space-y-2" aria-label={t('meetings.agendaItems')}>
            {meeting.agendaItems?.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.submission?.title}</p>
                  <p className="text-xs text-gray-500">{item.submission?.applicationId}</p>
                  <CoiBadge
                    names={(item.recusedAttendees || []).map((entry) => {
                      const attendee = meeting.attendees?.find((row) => row.userId === entry.userId)
                      return attendee?.user?.fullName || entry.userId
                    })}
                  />
                </div>
                {item.duration && (
                  <span className="text-xs text-gray-500 flex-shrink-0">{item.duration}'</span>
                )}
                {canManage && (
                  <button
                    onClick={() => handleRemoveAgendaItem(item.id)}
                    className="text-red-400 hover:text-red-600 text-xs min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label={`${t('meetings.removeFromAgenda')} — ${item.submission?.title}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── ATTENDEES TAB ──────────────────────────── */}
      {activeTab === 'attendees' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>{t('meetings.inviteAttendees')}</h2>

          {/* Add attendee row */}
          {canManage && meeting.status !== 'CANCELLED' && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 mb-2">{t('meetings.addAttendee')}</p>
              {addUserError && <div role="alert" className="text-red-600 text-xs mb-2">{addUserError}</div>}
              {usersLoadError && (
                <p className="text-xs text-red-500 mb-2" role="alert">
                  {t('meetings.usersLoadError')}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  aria-label={t('meetings.selectUser')}
                  disabled={usersLoadError}
                  className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                             focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">{t('meetings.selectUser')}</option>
                  {uninvitedUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {t(`roles.${getPrimaryRole(u).toLowerCase()}`, getPrimaryRole(u))}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAttendee}
                  disabled={!selectedUser || addingUser}
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px] disabled:opacity-60"
                  style={{ background: 'var(--lev-navy)' }}
                >
                  {addingUser ? t('common.loading') : t('meetings.invite')}
                </button>
              </div>
            </div>
          )}

          {/* Attendees list */}
          {meeting.attendees?.length === 0 && (
            <p className="text-center py-8 text-gray-500 text-sm">{t('meetings.noAttendees')}</p>
          )}
          <ul className="space-y-2" aria-label={t('meetings.attendees')}>
            {meeting.attendees?.map(attendee => (
              <li key={attendee.userId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                {/* Avatar initials */}
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 text-sm font-bold
                                flex items-center justify-center flex-shrink-0 uppercase">
                  {attendee.user?.fullName?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{attendee.user?.fullName}</p>
                  <p className="text-xs text-gray-500">
                    {attendee.user?.email}
                    <span className="ms-2 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                      {t(`roles.${getPrimaryRole(attendee.user).toLowerCase()}`, getPrimaryRole(attendee.user))}
                    </span>
                  </p>
                </div>
                {/* Calendar invite indicator */}
                {meeting.externalCalendarId && (
                  <span className="text-xs text-green-600" title={t('meetings.calendarInviteSent')} aria-label={t('meetings.calendarInviteSent')}>
                    <span aria-hidden="true">✅</span>
                  </span>
                )}
                {/* Remove attendee */}
                {canManage && meeting.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleRemoveAttendee(attendee.userId)}
                    disabled={removingId === attendee.userId}
                    className="text-red-400 hover:text-red-600 text-xs min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-40"
                    aria-label={`${t('meetings.removeAttendee')} — ${attendee.user?.fullName}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── ATTENDANCE TAB ────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>{t('meetings.attendance')}</h2>

          {meeting.attendees?.length === 0 && (
            <p className="text-center py-8 text-gray-500 text-sm">
              {t('meetings.noAttendeesForAttendance')}
            </p>
          )}

          <div className="space-y-2 mb-4">
            {meeting.attendees?.map(attendee => (
              <div key={attendee.userId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-bold
                                flex items-center justify-center flex-shrink-0 uppercase">
                  {attendee.user?.fullName?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{attendee.user?.fullName}</p>
                  <p className="text-xs text-gray-500">{attendee.user?.email}</p>
                </div>
                <div className="flex items-center gap-3" role="group" aria-label={attendee.user?.fullName}>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name={`att-${attendee.userId}`}
                      checked={attendance[attendee.userId] === true}
                      onChange={() => setAttendance(a => ({ ...a, [attendee.userId]: true }))}
                      disabled={!canManage}
                      className="accent-green-600"
                      aria-label={t('meetings.attended')}
                    />
                    <span className="text-green-700">{t('meetings.attended')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name={`att-${attendee.userId}`}
                      checked={attendance[attendee.userId] === false}
                      onChange={() => setAttendance(a => ({ ...a, [attendee.userId]: false }))}
                      disabled={!canManage}
                      className="accent-red-600"
                      aria-label={t('meetings.absent')}
                    />
                    <span className="text-red-700">{t('meetings.absent')}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {canManage && meeting.attendees?.length > 0 && (
            <button
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px] disabled:opacity-60"
              style={{ background: 'var(--lev-navy)' }}
            >
              {savingAttendance ? t('common.loading') : t('meetings.recordAttendance')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
