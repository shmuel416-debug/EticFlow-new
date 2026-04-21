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
 * Formats date key as localized date label.
 * @param {string} key
 * @returns {string}
 */
function formatDateKeyLabel(key) {
  return new Date(`${key}T00:00:00`).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Determines day density class by meetings count.
 * @param {number} count
 * @returns {string}
 */
function getDensityClass(count) {
  if (count >= 3) return 'bg-amber-100 text-amber-800'
  if (count > 0) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-600'
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [rangeFilter, setRangeFilter] = useState('all')

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
    const now = new Date()
    const rangeStart = new Date(now)
    const rangeEnd = new Date(now)
    if (rangeFilter === 'next30') {
      rangeEnd.setDate(rangeEnd.getDate() + 30)
    }
    if (rangeFilter === 'past30') {
      rangeStart.setDate(rangeStart.getDate() - 30)
    }

    for (const meeting of meetings) {
      if (statusFilter !== 'all' && meeting.status !== statusFilter) continue
      const meetingDate = new Date(meeting.scheduledAt)
      if (rangeFilter === 'next30' && (meetingDate < now || meetingDate > rangeEnd)) continue
      if (rangeFilter === 'past30' && (meetingDate > now || meetingDate < rangeStart)) continue
      const key = dateKey(meeting.scheduledAt)
      const arr = map.get(key) || []
      arr.push(meeting)
      map.set(key, arr)
    }
    for (const [key, rows] of map.entries()) {
      map.set(key, rows.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)))
    }
    return map
  }, [meetings, statusFilter, rangeFilter])

  const gridDays = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth])
  const selectedMeetings = useMemo(() => byDay.get(selectedDay) || [], [byDay, selectedDay])
  const crowdedDays = useMemo(() => {
    return [...byDay.entries()]
      .map(([key, rows]) => ({ key, count: rows.length }))
      .filter((item) => item.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [byDay])

  const filterOptions = [
    { key: 'all', label: t('meetings.filterAllStatuses') },
    { key: 'SCHEDULED', label: t('meetings.statusScheduled') },
    { key: 'COMPLETED', label: t('meetings.statusCompleted') },
    { key: 'CANCELLED', label: t('meetings.statusCancelled') },
  ]

  const rangeOptions = [
    { key: 'all', label: t('meetings.rangeAll') },
    { key: 'next30', label: t('meetings.rangeNext30') },
    { key: 'past30', label: t('meetings.rangePast30') },
  ]

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <label className="text-sm">
            <span className="text-xs text-gray-600 block mb-1">{t('meetings.filterByStatus')}</span>
            <select
              value={statusFilter}
              data-testid="calendar-status-filter"
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px]"
            >
              {filterOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="text-xs text-gray-600 block mb-1">{t('meetings.filterByRange')}</span>
            <select
              value={rangeFilter}
              data-testid="calendar-range-filter"
              onChange={(e) => setRangeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px]"
            >
              {rangeOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            data-testid="calendar-prev-month"
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
            data-testid="calendar-next-month"
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
                const densityClass = getDensityClass(dayMeetings.length)
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`calendar-day-${key}`}
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
                      <div className={`text-[11px] mt-1 inline-flex px-1.5 py-0.5 rounded-full ${densityClass}`}>
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
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <h3 className="font-semibold" style={{ color: 'var(--lev-navy)' }}>
            {t('meetings.dayMeetings')} ({formatDateKeyLabel(selectedDay)})
          </h3>
          <span className="text-xs text-gray-500">
            {t('meetings.selectedDayCount', { count: selectedMeetings.length })}
          </span>
        </div>

        {crowdedDays.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-1">{t('meetings.crowdedDays')}</p>
            <div className="flex flex-wrap gap-1.5">
              {crowdedDays.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  data-testid={`calendar-crowded-day-${item.key}`}
                  onClick={() => setSelectedDay(item.key)}
                  className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800"
                >
                  {formatDateKeyLabel(item.key)} · {item.count}
                </button>
              ))}
            </div>
          </div>
        )}

        <h3 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>
          {t('meetings.dayMeetingsList')}
        </h3>
        {selectedMeetings.length === 0 && (
          <p className="text-sm text-gray-500">{t('meetings.noMeetingsForDay')}</p>
        )}
        <div className="space-y-2">
          {selectedMeetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              data-testid={`calendar-day-meeting-${meeting.id}`}
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
