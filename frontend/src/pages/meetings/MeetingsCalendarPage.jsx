/**
 * EthicFlow — Meetings Calendar Page
 * Monthly calendar view for committee meetings with day drill-down.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api'

/**
 * Returns YYYY-MM-DD from date-like input.
 * @param {string|Date} value
 * @returns {string}
 */
function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

/**
 * Returns date object at start of month.
 * @param {Date} date
 * @returns {Date}
 */
function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Returns date object at end of month.
 * @param {Date} date
 * @returns {Date}
 */
function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * Builds all visible days in calendar grid (Sun-Sat rows).
 * @param {Date} date
 * @returns {Date[]}
 */
function buildCalendarGrid(date) {
  const start = monthStart(date)
  const end = monthEnd(date)
  const first = new Date(start)
  first.setDate(start.getDate() - start.getDay())
  const last = new Date(end)
  last.setDate(end.getDate() + (6 - end.getDay()))
  const days = []
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

/**
 * Formats date for list label.
 * @param {string|Date} value
 * @returns {string}
 */
function formatDateTime(value) {
  return new Date(value).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Meetings calendar page with month navigation and day details.
 * @returns {JSX.Element}
 */
export default function MeetingsCalendarPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meetings, setMeetings] = useState([])
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))

  /**
   * Loads all meetings for calendar rendering.
   * @returns {Promise<void>}
   */
  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/meetings?filter=all&limit=300')
      setMeetings(Array.isArray(data.data) ? data.data : [])
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const meeting of meetings) {
      const key = dateKey(meeting.scheduledAt)
      const arr = map.get(key) || []
      arr.push(meeting)
      map.set(key, arr)
    }
    return map
  }, [meetings])

  const gridDays = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth])
  const selectedMeetings = useMemo(() => byDay.get(selectedDay) || [], [byDay, selectedDay])

  return (
    <main id="main-content" className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('meetings.calendarTitle')}
        </h1>
        <Link to="/meetings" className="text-sm font-medium hover:underline" style={{ color: 'var(--lev-teal-text)' }}>
          {t('meetings.backToMeetings')}
        </Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="px-3 py-2 rounded-lg border text-sm min-h-[44px]"
          >
            {t('meetings.prevMonth')}
          </button>
          <h2 className="font-semibold text-base md:text-lg">
            {visibleMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            type="button"
            onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="px-3 py-2 rounded-lg border text-sm min-h-[44px]"
          >
            {t('meetings.nextMonth')}
          </button>
        </div>

        {error && <div role="alert" className="mb-3 bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
        {loading && <p className="text-sm text-gray-500 py-4">{t('common.loading')}</p>}

        {!loading && (
          <>
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-500 mb-2">
              {[
                t('meetings.weekdaySun'),
                t('meetings.weekdayMon'),
                t('meetings.weekdayTue'),
                t('meetings.weekdayWed'),
                t('meetings.weekdayThu'),
                t('meetings.weekdayFri'),
                t('meetings.weekdaySat'),
              ].map((label) => (
                <div key={label} className="text-center py-1">{label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {gridDays.map((day) => {
                const key = dateKey(day)
                const dayMeetings = byDay.get(key) || []
                const inMonth = day.getMonth() === visibleMonth.getMonth()
                const isSelected = key === selectedDay
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={`rounded-lg border p-2 text-start min-h-[64px] transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : inMonth
                          ? 'border-gray-200 bg-white hover:bg-gray-50'
                          : 'border-gray-100 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className="text-sm font-semibold">{day.getDate()}</div>
                    {dayMeetings.length > 0 && (
                      <div className="text-[11px] text-blue-700 mt-1">
                        {t('meetings.meetingsCount', { count: dayMeetings.length })}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 mt-4">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>
          {t('meetings.dayMeetings')} ({selectedDay})
        </h3>
        {selectedMeetings.length === 0 && (
          <p className="text-sm text-gray-500">{t('meetings.noMeetingsForDay')}</p>
        )}
        <div className="space-y-2">
          {selectedMeetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <p className="font-medium">{meeting.title}</p>
              <p className="text-xs text-gray-500">{formatDateTime(meeting.scheduledAt)}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
