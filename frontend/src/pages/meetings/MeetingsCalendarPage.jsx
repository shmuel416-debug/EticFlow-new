/**
 * EthicFlow — Meetings Calendar Page
 * Monthly calendar view for committee meetings with day drill-down.
 * Page shell now uses the design system; calendar grid logic untouched.
 * IS 5568 / WCAG 2.2 AA. Lev color palette only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation }                            from 'react-i18next'
import { Link, useLocation }                         from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays }   from 'lucide-react'
import api from '../../services/api'
import {
  Badge, Card, CardBody, CardHeader, FormField,
  IconButton, PageHeader, Select,
} from '../../components/ui'

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
  const end   = monthEnd(date)
  const first = new Date(start)
  first.setDate(start.getDate() - start.getDay())
  const last  = new Date(end)
  last.setDate(end.getDate() + (6 - end.getDay()))
  const days  = []
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
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Formats date key as localized date label.
 * @param {string} key
 * @returns {string}
 */
function formatDateKeyLabel(key) {
  return new Date(`${key}T00:00:00`).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/**
 * Density tone keyed by meeting count.
 * @param {number} count
 * @returns {'warning'|'info'|'neutral'}
 */
function densityTone(count) {
  if (count >= 3) return 'warning'
  if (count > 0)  return 'info'
  return 'neutral'
}

/**
 * Meetings calendar page with month navigation and day details.
 * @returns {JSX.Element}
 */
export default function MeetingsCalendarPage() {
  const { t, i18n } = useTranslation()
  const location    = useLocation()
  const isRtl       = i18n.dir() === 'rtl'
  const PrevMonthIcon = isRtl ? ChevronRight : ChevronLeft
  const NextMonthIcon = isRtl ? ChevronLeft  : ChevronRight

  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [meetings, setMeetings]           = useState([])
  const [visibleMonth, setVisibleMonth]   = useState(() => monthStart(new Date()))
  const [selectedDay, setSelectedDay]     = useState(() => dateKey(new Date()))
  const [statusFilter, setStatusFilter]   = useState('all')
  const [rangeFilter, setRangeFilter]     = useState('all')
  const returnPath    = `${location.pathname}${location.search}`
  const backToMeetings = typeof location.state?.from === 'string' ? location.state.from : '/meetings'

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
    const rangeEnd   = new Date(now)
    if (rangeFilter === 'next30') rangeEnd.setDate(rangeEnd.getDate() + 30)
    if (rangeFilter === 'past30') rangeStart.setDate(rangeStart.getDate() - 30)

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

  const gridDays         = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth])
  const selectedMeetings = useMemo(() => byDay.get(selectedDay) || [], [byDay, selectedDay])
  const crowdedDays      = useMemo(() => {
    return [...byDay.entries()]
      .map(([key, rows]) => ({ key, count: rows.length }))
      .filter((item) => item.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [byDay])

  const filterOptions = [
    { key: 'all',       label: t('meetings.filterAllStatuses') },
    { key: 'SCHEDULED', label: t('meetings.statusScheduled')   },
    { key: 'COMPLETED', label: t('meetings.statusCompleted')   },
    { key: 'CANCELLED', label: t('meetings.statusCancelled')   },
  ]

  const rangeOptions = [
    { key: 'all',    label: t('meetings.rangeAll')    },
    { key: 'next30', label: t('meetings.rangeNext30') },
    { key: 'past30', label: t('meetings.rangePast30') },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={t('meetings.calendarTitle')}
        subtitle={visibleMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
        backTo={backToMeetings}
      />

      <Card className="mb-4">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <CalendarDays
                size={18} strokeWidth={1.75}
                aria-hidden="true" focusable="false"
                style={{ color: 'var(--lev-navy)' }}
              />
              <span>{visibleMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-1.5">
              <IconButton
                icon={PrevMonthIcon}
                label={t('meetings.prevMonth')}
                data-testid="calendar-prev-month"
                onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              />
              <IconButton
                icon={NextMonthIcon}
                label={t('meetings.nextMonth')}
                data-testid="calendar-next-month"
                onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              />
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <FormField
              label={t('meetings.filterByStatus')}
              render={({ inputId }) => (
                <Select
                  id={inputId}
                  data-testid="calendar-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {filterOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </Select>
              )}
            />
            <FormField
              label={t('meetings.filterByRange')}
              render={({ inputId }) => (
                <Select
                  id={inputId}
                  data-testid="calendar-range-filter"
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                >
                  {rangeOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </Select>
              )}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mb-3 text-sm"
              style={{
                background: 'var(--status-danger-50)',
                color:      'var(--status-danger)',
                border:     '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-lg)',
                padding: '10px 12px',
              }}
            >
              {error}
            </div>
          )}
          {loading && (
            <p className="text-sm py-4" role="status" aria-live="polite" style={{ color: 'var(--text-muted)' }}>
              {t('common.loading')}
            </p>
          )}

          {!loading && (
            <>
              <div
                className="grid grid-cols-7 gap-2 text-xs font-semibold mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
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
                  const key         = dateKey(day)
                  const dayMeetings = byDay.get(key) || []
                  const inMonth     = day.getMonth() === visibleMonth.getMonth()
                  const isSelected  = key === selectedDay
                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid={`calendar-day-${key}`}
                      onClick={() => setSelectedDay(key)}
                      aria-pressed={isSelected}
                      className="p-2 text-start transition"
                      style={{
                        minHeight:    64,
                        borderRadius: 'var(--radius-lg)',
                        border:       isSelected
                          ? '2px solid var(--lev-navy)'
                          : `1px solid ${inMonth ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                        background:   isSelected
                          ? 'var(--lev-navy-50, rgba(11,26,64,0.06))'
                          : inMonth
                            ? 'var(--surface-base)'
                            : 'var(--surface-sunken)',
                        color:        inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      <div className="text-sm font-semibold">{day.getDate()}</div>
                      {dayMeetings.length > 0 && (
                        <div className="mt-1">
                          <Badge tone={densityTone(dayMeetings.length)} size="sm">
                            {t('meetings.meetingsCount', { count: dayMeetings.length })}
                          </Badge>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`${t('meetings.dayMeetings')} (${formatDateKeyLabel(selectedDay)})`}
          actions={
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('meetings.selectedDayCount', { count: selectedMeetings.length })}
            </span>
          }
        />
        <CardBody>
          {crowdedDays.length > 0 && (
            <div className="mb-4">
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {t('meetings.crowdedDays')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {crowdedDays.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    data-testid={`calendar-crowded-day-${item.key}`}
                    onClick={() => setSelectedDay(item.key)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 transition"
                    style={{
                      minHeight:    32,
                      borderRadius: '9999px',
                      background:   'var(--status-warning-50, rgba(251,191,36,0.15))',
                      color:        'var(--status-warning)',
                      border:       '1px solid var(--status-warning)',
                    }}
                  >
                    <span>{formatDateKeyLabel(item.key)}</span>
                    <span aria-hidden="true">·</span>
                    <strong>{item.count}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>
            {t('meetings.dayMeetingsList')}
          </h3>

          {selectedMeetings.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('meetings.noMeetingsForDay')}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  to={`/meetings/${meeting.id}`}
                  state={{ from: returnPath }}
                  data-testid={`calendar-day-meeting-${meeting.id}`}
                  className="block p-3 transition hover:opacity-90"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border:       '1px solid var(--border-default)',
                    background:   'var(--surface-base)',
                  }}
                >
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{meeting.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(meeting.scheduledAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
