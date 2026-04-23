/**
 * EthicFlow — Meeting Detail Page (brand refresh)
 * Shows full meeting details: agenda items, attendees tab (invite/remove), attendance.
 * Secretary/Admin can manage agenda, invite new attendees, and record attendance.
 * Shows external calendar sync status (Microsoft / Google).
 *
 * Visual: PageHeader (with backTo + actions), Card shells, Tabs (underline),
 *         monochrome lucide icons, brand CSS tokens. No behaviour change.
 * IS 5568 / WCAG 2.2 AA: 44px targets, aria, keyboard navigation.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  CalendarCheck2,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  UserPlus,
  Save,
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import CoiBadge from '../../components/meetings/CoiBadge'
import {
  Button,
  IconButton,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Tabs,
  Input,
  Select,
  FormField,
  Spinner,
  EmptyState,
  AccessibleIcon,
} from '../../components/ui'

/**
 * Picks the first canonical role from a user record.
 * @param {object} user
 * @returns {string}
 */
function getPrimaryRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : ['RESEARCHER'])
  return ['ADMIN', 'CHAIRMAN', 'SECRETARY', 'REVIEWER', 'RESEARCHER'].find((role) => roles.includes(role)) || 'RESEARCHER'
}

/**
 * Formats an ISO datetime as he-IL "dd/MM/yyyy HH:mm".
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
 * Maps a meeting status to a Badge tone.
 * @param {string} status
 * @returns {'info'|'success'|'danger'|'neutral'}
 */
function statusTone(status) {
  if (status === 'SCHEDULED') return 'info'
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  return 'neutral'
}

/**
 * Maps a personal-sync status to a Badge tone.
 * @param {string} status
 * @returns {'success'|'warning'|'danger'|'neutral'}
 */
function personalSyncTone(status) {
  if (status === 'SYNCED')   return 'success'
  if (status === 'PENDING')  return 'warning'
  if (status === 'FAILED')   return 'danger'
  return 'neutral'
}

/**
 * External calendar sync info strip (events in Microsoft/Google cal).
 * @param {{ externalCalendarId: string|null, t: Function }} props
 * @returns {JSX.Element|null}
 */
function CalendarSyncStrip({ externalCalendarId, t }) {
  if (!externalCalendarId) return null
  return (
    <div
      className="inline-flex items-center gap-2 text-xs mt-2"
      style={{
        background: 'var(--status-success-50)',
        color: 'var(--status-success)',
        border: '1px solid var(--status-success)',
        borderRadius: 'var(--radius-lg)',
        padding: '6px 10px',
      }}
    >
      <AccessibleIcon icon={CalendarCheck2} size={14} decorative />
      <span>{t('meetings.calendarSyncedDetail')}</span>
      <code
        className="font-mono opacity-70 text-[11px] hidden md:inline"
        title={t('meetings.calendarEventId')}
      >
        {externalCalendarId.slice(0, 20)}…
      </code>
    </div>
  )
}

/**
 * Personal calendar sync indicator for current user.
 * @param {{ sync: { status?: string, lastSyncAt?: string|null }|null, t: Function }} props
 * @returns {JSX.Element|null}
 */
function PersonalCalendarSyncStrip({ sync, t }) {
  const status = sync?.status
  if (!status) return null
  const tone = personalSyncTone(status)
  const i18nKey = `meetings.personalSync${status.charAt(0) + status.slice(1).toLowerCase()}`
  return (
    <div className="inline-flex items-center gap-2 text-xs mt-2">
      <Badge tone={tone} size="sm">
        <AccessibleIcon icon={User} size={12} decorative />
        <span>{t(i18nKey, status)}</span>
      </Badge>
      {sync?.lastSyncAt && (
        <span style={{ color: 'var(--text-muted)' }}>
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
  const [allUsers, setAllUsers]             = useState([])
  const [usersLoadError, setUsersLoadError] = useState(false)
  const [selectedUser, setSelectedUser]     = useState('')
  const [addingUser, setAddingUser]         = useState(false)
  const [addUserError, setAddUserError]     = useState(null)
  const [removingId, setRemovingId]         = useState(null)

  // ── Attendance ───────────────────────────────
  const [attendance, setAttendance]             = useState({})
  const [savingAttendance, setSavingAttendance] = useState(false)

  const canManage = user?.role === 'SECRETARY' || user?.role === 'ADMIN'
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/meetings'

  /**
   * Fetches full meeting details and seeds attendance state.
   */
  const fetchMeeting = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/meetings/${id}`)
      const m = data.data
      setMeeting(m)
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

  useEffect(() => {
    if (!canManage) return
    api.get('/submissions?limit=100')
      .then(({ data }) => setSubmissions(data.data ?? []))
      .catch(() => {})
  }, [canManage])

  useEffect(() => {
    if (!canManage) return
    api.get('/users/admin/users?limit=200')
      .then(({ data }) => {
        setAllUsers((data.data ?? []).filter(u => getPrimaryRole(u) !== 'RESEARCHER' && u.isActive))
      })
      .catch(() => setUsersLoadError(true))
  }, [canManage])

  // ── Agenda handlers ──────────────────────────

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

  async function handleRemoveAgendaItem(itemId) {
    try {
      await api.delete(`/meetings/${id}/agenda/${itemId}`)
      fetchMeeting()
    } catch (err) {
      alert(err.message)
    }
  }

  // ── Attendee handlers ────────────────────────

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
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <Spinner size={28} label={t('common.loading')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title={t('meetings.title')}
          backTo={backTo}
          backLabel={t('meetings.backToMeetings')}
        />
        <Card>
          <CardBody>
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-3 text-sm"
              style={{
                background: 'var(--status-danger-50)',
                color: 'var(--status-danger)',
                border: '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
              }}
            >
              <AccessibleIcon icon={AlertTriangle} size={18} decorative />
              <span className="font-medium">{error}</span>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!meeting) return null

  const attendeeUserIds = new Set(meeting.attendees?.map(a => a.userId) ?? [])
  const uninvitedUsers  = allUsers.filter(u => !attendeeUserIds.has(u.id))

  const tabs = [
    { key: 'agenda',     label: t('meetings.agenda') },
    { key: 'attendees',  label: t('meetings.attendees'), count: meeting.attendees?.length ?? 0 },
    { key: 'attendance', label: t('meetings.attendance') },
  ]

  const headerActions = canManage && meeting.status !== 'CANCELLED'
    ? (
      <Button
        variant="danger"
        size="md"
        leftIcon={<AccessibleIcon icon={Trash2} size={16} decorative />}
        onClick={handleCancel}
      >
        {t('meetings.cancel')}
      </Button>
    )
    : null

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={meeting.title}
        subtitle={formatDate(meeting.scheduledAt)}
        backTo={backTo}
        backLabel={t('meetings.backToMeetings')}
        actions={headerActions}
      />

      {/* ── Meeting summary card ─────────────────── */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge tone={statusTone(meeting.status)} size="md">
              {t(
                `meetings.status${meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase()}`,
                meeting.status
              )}
            </Badge>
          </div>

          <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p className="inline-flex items-center gap-1.5">
              <AccessibleIcon icon={Calendar} size={16} decorative />
              <span>{formatDate(meeting.scheduledAt)}</span>
            </p>
            {meeting.location && (
              <p className="inline-flex items-center gap-1.5">
                <AccessibleIcon icon={MapPin} size={16} decorative />
                <span>{meeting.location}</span>
              </p>
            )}
            {meeting.meetingLink && (
              <p>
                <a
                  href={meeting.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                  style={{ color: 'var(--lev-teal-text)' }}
                >
                  <AccessibleIcon icon={LinkIcon} size={16} decorative />
                  <span>{t('meetings.joinOnline')}</span>
                </a>
              </p>
            )}
          </div>

          <CalendarSyncStrip externalCalendarId={meeting.externalCalendarId} t={t} />
          <PersonalCalendarSyncStrip sync={meeting.userCalendarSync} t={t} />
        </CardBody>
      </Card>

      {/* ── Tabs ─────────────────────────────────── */}
      <div className="mb-4">
        <Tabs
          items={tabs}
          value={activeTab}
          onChange={setActiveTab}
          variant="underline"
          ariaLabel={t('meetings.title')}
        />
      </div>

      {/* ── AGENDA TAB ───────────────────────────── */}
      {activeTab === 'agenda' && (
        <Card
          role="tabpanel"
          id="tabpanel-agenda"
          aria-labelledby="tab-agenda"
        >
          <CardHeader title={t('meetings.agenda')} />
          <CardBody>
            {canManage && meeting.status !== 'CANCELLED' && (
              <div
                className="mb-4 p-4 space-y-3"
                style={{
                  background: 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {t('meetings.addSubmission')}
                </p>
                {addError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="text-xs font-medium"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    {addError}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[180px]">
                    <FormField
                      label={t('meetings.selectSubmission')}
                      render={({ inputId, describedBy }) => (
                        <Select
                          id={inputId}
                          aria-describedby={describedBy}
                          value={selectedSub}
                          onChange={e => setSelectedSub(e.target.value)}
                        >
                          <option value="">{t('meetings.selectSubmission')}</option>
                          {submissions.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.applicationId} — {s.title}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                  </div>
                  <div className="w-32">
                    <FormField
                      label={t('meetings.duration')}
                      render={({ inputId, describedBy }) => (
                        <Input
                          id={inputId}
                          aria-describedby={describedBy}
                          type="number"
                          min="1"
                          max="480"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          placeholder={t('meetings.duration')}
                          dir="ltr"
                        />
                      )}
                    />
                  </div>
                  <Button
                    variant="gold"
                    onClick={handleAddAgendaItem}
                    disabled={!selectedSub || addingItem}
                    loading={addingItem}
                    leftIcon={<AccessibleIcon icon={Plus} size={16} decorative />}
                  >
                    {t('meetings.addToAgenda')}
                  </Button>
                </div>
              </div>
            )}

            {meeting.agendaItems?.length === 0 && (
              <EmptyState
                icon={Calendar}
                title={t('meetings.noAgendaItems')}
              />
            )}

            <ol className="space-y-2" aria-label={t('meetings.agendaItems')}>
              {meeting.agendaItems?.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-raised)',
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--lev-navy-50)',
                      color: 'var(--lev-navy)',
                    }}
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.submission?.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.submission?.applicationId}
                    </p>
                    <CoiBadge
                      names={(item.recusedAttendees || []).map((entry) => {
                        const attendee = meeting.attendees?.find((row) => row.userId === entry.userId)
                        return attendee?.user?.fullName || entry.userId
                      })}
                    />
                  </div>
                  {item.duration && (
                    <Badge tone="neutral" size="sm">{item.duration}′</Badge>
                  )}
                  {canManage && (
                    <IconButton
                      icon={Trash2}
                      label={`${t('meetings.removeFromAgenda')} — ${item.submission?.title ?? ''}`}
                      onClick={() => handleRemoveAgendaItem(item.id)}
                    />
                  )}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {/* ── ATTENDEES TAB ────────────────────────── */}
      {activeTab === 'attendees' && (
        <Card
          role="tabpanel"
          id="tabpanel-attendees"
          aria-labelledby="tab-attendees"
        >
          <CardHeader title={t('meetings.inviteAttendees')} />
          <CardBody>
            {canManage && meeting.status !== 'CANCELLED' && (
              <div
                className="mb-4 p-4 space-y-3"
                style={{
                  background: 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {t('meetings.addAttendee')}
                </p>
                {addUserError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="text-xs font-medium"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    {addUserError}
                  </div>
                )}
                {usersLoadError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="text-xs font-medium"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    {t('meetings.usersLoadError')}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[200px]">
                    <FormField
                      label={t('meetings.selectUser')}
                      render={({ inputId, describedBy }) => (
                        <Select
                          id={inputId}
                          aria-describedby={describedBy}
                          value={selectedUser}
                          onChange={e => setSelectedUser(e.target.value)}
                          disabled={usersLoadError}
                        >
                          <option value="">{t('meetings.selectUser')}</option>
                          {uninvitedUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} — {t(`roles.${getPrimaryRole(u).toLowerCase()}`, getPrimaryRole(u))}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                  </div>
                  <Button
                    variant="gold"
                    onClick={handleAddAttendee}
                    disabled={!selectedUser || addingUser}
                    loading={addingUser}
                    leftIcon={<AccessibleIcon icon={UserPlus} size={16} decorative />}
                  >
                    {t('meetings.invite')}
                  </Button>
                </div>
              </div>
            )}

            {meeting.attendees?.length === 0 && (
              <EmptyState
                icon={User}
                title={t('meetings.noAttendees')}
              />
            )}

            <ul className="space-y-2" aria-label={t('meetings.attendees')}>
              {meeting.attendees?.map(attendee => (
                <li
                  key={attendee.userId}
                  className="flex items-center gap-3 p-3"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-raised)',
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 text-sm font-bold uppercase"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--lev-navy-50)',
                      color: 'var(--lev-navy)',
                    }}
                    aria-hidden="true"
                  >
                    {attendee.user?.fullName?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {attendee.user?.fullName}
                    </p>
                    <p className="text-xs inline-flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      <span className="truncate">{attendee.user?.email}</span>
                      <Badge tone="navy" size="sm">
                        {t(`roles.${getPrimaryRole(attendee.user).toLowerCase()}`, getPrimaryRole(attendee.user))}
                      </Badge>
                    </p>
                  </div>
                  {meeting.externalCalendarId && (
                    <span
                      className="inline-flex items-center"
                      title={t('meetings.calendarInviteSent')}
                      aria-label={t('meetings.calendarInviteSent')}
                      style={{ color: 'var(--status-success)' }}
                    >
                      <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
                    </span>
                  )}
                  {canManage && meeting.status !== 'CANCELLED' && (
                    <IconButton
                      icon={Trash2}
                      label={`${t('meetings.removeAttendee')} — ${attendee.user?.fullName ?? ''}`}
                      onClick={() => handleRemoveAttendee(attendee.userId)}
                      disabled={removingId === attendee.userId}
                    />
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* ── ATTENDANCE TAB ───────────────────────── */}
      {activeTab === 'attendance' && (
        <Card
          role="tabpanel"
          id="tabpanel-attendance"
          aria-labelledby="tab-attendance"
        >
          <CardHeader title={t('meetings.attendance')} />
          <CardBody>
            {meeting.attendees?.length === 0 && (
              <EmptyState
                icon={User}
                title={t('meetings.noAttendeesForAttendance')}
              />
            )}

            <div className="space-y-2 mb-4">
              {meeting.attendees?.map(attendee => (
                <div
                  key={attendee.userId}
                  className="flex items-center gap-3 p-3"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-raised)',
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 text-sm font-bold uppercase"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--lev-navy-50)',
                      color: 'var(--lev-navy)',
                    }}
                    aria-hidden="true"
                  >
                    {attendee.user?.fullName?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {attendee.user?.fullName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {attendee.user?.email}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-3"
                    role="group"
                    aria-label={attendee.user?.fullName}
                  >
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name={`att-${attendee.userId}`}
                        checked={attendance[attendee.userId] === true}
                        onChange={() => setAttendance(a => ({ ...a, [attendee.userId]: true }))}
                        disabled={!canManage}
                        style={{ accentColor: 'var(--status-success)' }}
                        aria-label={t('meetings.attended')}
                      />
                      <span className="inline-flex items-center gap-1" style={{ color: 'var(--status-success)' }}>
                        <AccessibleIcon icon={CheckCircle2} size={14} decorative />
                        {t('meetings.attended')}
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name={`att-${attendee.userId}`}
                        checked={attendance[attendee.userId] === false}
                        onChange={() => setAttendance(a => ({ ...a, [attendee.userId]: false }))}
                        disabled={!canManage}
                        style={{ accentColor: 'var(--status-danger)' }}
                        aria-label={t('meetings.absent')}
                      />
                      <span className="inline-flex items-center gap-1" style={{ color: 'var(--status-danger)' }}>
                        <AccessibleIcon icon={XCircle} size={14} decorative />
                        {t('meetings.absent')}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {canManage && meeting.attendees?.length > 0 && (
              <Button
                variant="gold"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                loading={savingAttendance}
                leftIcon={<AccessibleIcon icon={Save} size={16} decorative />}
              >
                {t('meetings.recordAttendance')}
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
