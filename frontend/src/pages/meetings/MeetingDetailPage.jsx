/**
 * EthicFlow — Meeting Detail Page
 * Shows full meeting details: agenda items, attendees, attendance recording.
 * Secretary/Admin can manage agenda + record attendance.
 * IS 5568 / WCAG 2.2 AA: 44px targets, aria, keyboard navigation.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

/** Format a datetime string */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Meeting Detail Page — agenda, attendees, attendance.
 * @returns {JSX.Element}
 */
export default function MeetingDetailPage() {
  const { t }     = useTranslation()
  const { id }    = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [meeting, setMeeting]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [activeTab, setActiveTab]       = useState('agenda')

  // Add agenda item
  const [submissions, setSubmissions]   = useState([])
  const [selectedSub, setSelectedSub]   = useState('')
  const [duration, setDuration]         = useState('')
  const [addingItem, setAddingItem]     = useState(false)
  const [addError, setAddError]         = useState(null)

  // Attendance
  const [attendance, setAttendance]     = useState({}) // { userId: boolean }
  const [savingAttendance, setSavingAttendance] = useState(false)

  const canManage = user?.role === 'SECRETARY' || user?.role === 'ADMIN'

  /**
   * Fetches meeting details.
   */
  const fetchMeeting = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/meetings/${id}`)
      setMeeting(data.data)
      // Initialize attendance state from existing attendee records
      const att = {}
      data.data.attendees?.forEach(a => { att[a.userId] = a.attended })
      setAttendance(att)
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { fetchMeeting() }, [fetchMeeting])

  /** Fetch available submissions for agenda adding */
  useEffect(() => {
    if (!canManage) return
    api.get('/submissions?limit=100').then(({ data }) => {
      setSubmissions(data.data ?? [])
    }).catch(() => {})
  }, [canManage])

  /**
   * Adds a submission to the agenda.
   */
  async function handleAddAgendaItem() {
    if (!selectedSub) return
    setAddingItem(true)
    setAddError(null)
    try {
      await api.post(`/meetings/${id}/agenda`, {
        submissionId: selectedSub,
        ...(duration && { duration: parseInt(duration) }),
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

  /**
   * Saves attendance records.
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

  /**
   * Cancels the meeting.
   */
  async function handleCancel() {
    if (!window.confirm(t('meetings.confirmCancel'))) return
    try {
      await api.delete(`/meetings/${id}`)
      navigate('/meetings')
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div role="status" aria-label={t('common.loading')}
             className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
  }

  if (!meeting) return null

  const tabs = [
    { key: 'agenda',     label: t('meetings.agenda') },
    { key: 'attendance', label: t('meetings.attendance') },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link to="/meetings" className="text-sm text-blue-600 hover:underline mb-4 inline-flex items-center gap-1">
        <span aria-hidden="true">→</span> {t('meetings.title')}
      </Link>

      {/* Meeting header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mt-3 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>{meeting.title}</h1>
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
                 className="text-sm text-blue-600 hover:underline">
                <span aria-hidden="true">🔗</span> {t('meetings.meetingLink')}
              </a>
            )}
          </div>
          {canManage && meeting.status !== 'CANCELLED' && (
            <button
              onClick={handleCancel}
              className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 min-h-[44px]
                         focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {t('meetings.cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit" role="tablist" aria-label={t('meetings.title')}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[36px]
              ${activeTab === tab.key ? 'bg-white shadow-sm text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Agenda tab */}
      {activeTab === 'agenda' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>{t('meetings.agenda')}</h2>

          {/* Add to agenda (secretary/admin) */}
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
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Agenda items */}
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
                </div>
                {item.duration && (
                  <span className="text-xs text-gray-500 flex-shrink-0">{item.duration} {t('meetings.duration').split(' ')[0]}'</span>
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

      {/* Attendance tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>{t('meetings.attendance')}</h2>

          {meeting.attendees?.length === 0 && (
            <p className="text-center py-8 text-gray-500 text-sm">{t('meetings.attendees')} — 0</p>
          )}

          <div className="space-y-2 mb-4">
            {meeting.attendees?.map(attendee => (
              <div key={attendee.userId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
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
                    {t('meetings.attended')}
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
                    {t('meetings.absent')}
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
