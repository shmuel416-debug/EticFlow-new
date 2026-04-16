/**
 * EthicFlow — Statistics & Reports Page
 * Design: Option B (Bold & Structured) + Lev Academic Center palette.
 * Header band: Lev navy gradient with KPI cards inside.
 * Body: white background with bar chart, track breakdown, monthly trend.
 * Roles: SECRETARY, CHAIRMAN, ADMIN
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

/** Submission status colours for the bar chart */
const STATUS_BARS = [
  { key: 'SUBMITTED',        labelKey: 'submission.status.SUBMITTED',        color: '#f59e0b' },
  { key: 'IN_TRIAGE',        labelKey: 'submission.status.IN_TRIAGE',        color: '#93c5fd' },
  { key: 'IN_REVIEW',        labelKey: 'submission.status.IN_REVIEW',        color: '#3b82f6' },
  { key: 'APPROVED',         labelKey: 'submission.status.APPROVED',         color: '#10b981' },
  { key: 'REJECTED',         labelKey: 'submission.status.REJECTED',         color: '#f87171' },
  { key: 'PENDING_REVISION', labelKey: 'submission.status.PENDING_REVISION', color: '#fb923c' },
]

/** Track colours */
const TRACK_COLORS = {
  FULL:      '#3b82f6',
  EXPEDITED: '#10b981',
  EXEMPT:    '#f59e0b',
}

/** Track i18n keys */
const TRACK_LABEL_KEYS = {
  FULL:      'submission.tracks.FULL',
  EXPEDITED: 'submission.tracks.EXPEDITED',
  EXEMPT:    'submission.tracks.EXEMPT',
}

/**
 * Renders a single KPI card inside the header band.
 * @param {{ label: string, value: string|number, accent?: boolean }} props
 */
function KpiCard({ label, value, accent }) {
  return (
    <div className="rounded-xl p-4 text-center border border-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
      <div
        className="text-3xl font-bold"
        style={{ color: accent ? '#6ee7b7' : 'white' }}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</div>
    </div>
  )
}

/**
 * Bar chart rendered with CSS — proportional to tallest bar.
 * @param {{ byStatus: object }} props
 */
function StatusBarChart({ byStatus }) {
  const { t } = useTranslation()
  const max = Math.max(...STATUS_BARS.map(s => byStatus[s.key] ?? 0), 1)

  return (
    <div className="flex items-end gap-3 h-36 px-2" role="img" aria-label={t('stats.byStatus')}>
      {STATUS_BARS.map(({ key, labelKey, color }) => {
        const count = byStatus[key] ?? 0
        const heightPct = Math.round((count / max) * 100)
        return (
          <div key={key} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs font-bold" style={{ color }}>{count}</span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{ height: `${Math.max(heightPct * 1.2, count > 0 ? 4 : 0)}px`, background: color, maxHeight: '120px' }}
              role="presentation"
            />
            <span className="text-xs text-gray-500 text-center leading-tight" style={{ fontSize: '11px' }}>
              {t(labelKey)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Horizontal progress-bar breakdown by research track.
 * @param {{ byTrack: object, total: number }} props
 */
function TrackBreakdown({ byTrack, total }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      {Object.entries(TRACK_LABEL_KEYS).map(([key, labelKey]) => {
        const count = byTrack[key] ?? 0
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-gray-700">{t(labelKey)}</span>
              <span className="text-gray-500">{count} ({pct}%)</span>
            </div>
            <div
              className="w-full bg-gray-100 rounded-full h-2.5"
              role="progressbar"
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={t(labelKey)}
            >
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: TRACK_COLORS[key] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Simple SVG line chart for monthly submission trend.
 * @param {{ monthly: Array<{month: string, count: number}> }} props
 */
function MonthlyTrendChart({ monthly }) {
  const { t } = useTranslation()
  if (!monthly || monthly.length === 0) return null

  const counts = monthly.map(m => m.count)
  const max    = Math.max(...counts, 1)
  const W      = 400
  const H      = 80
  const pad    = 10
  const span   = Math.max(monthly.length - 1, 1)  // guard against single-point array

  const points = monthly.map((m, i) => {
    const x = pad + (i / span) * (W - 2 * pad)
    const y = H - pad - ((m.count / max) * (H - 2 * pad))
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${pad},${H} ${points} ${W - pad},${H}`

  return (
    <div role="img" aria-label={t('stats.monthlyTrend')}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--lev-navy)" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="var(--lev-navy)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={pad} y1={pad + f * (H - 2 * pad)} x2={W - pad} y2={pad + f * (H - 2 * pad)}
            stroke="#f0f0f0" strokeWidth="1"/>
        ))}
        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#trendGrad)"/>
        {/* Line */}
        <polyline points={points} fill="none" stroke="var(--lev-navy)" strokeWidth="2.5" strokeLinejoin="round"/>
        {/* Endpoint dots */}
        {monthly.map((m, i) => {
          const x = pad + (i / span) * (W - 2 * pad)
          const y = H - pad - ((m.count / max) * (H - 2 * pad))
          return i === monthly.length - 1
            ? <circle key={i} cx={x} cy={y} r="4" fill="var(--lev-navy)" aria-label={`${m.month}: ${m.count}`}/>
            : null
        })}
      </svg>
      {/* Month labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
        {monthly.map((m, i) => (
          <span key={i} className="text-center" style={{ fontSize: '10px' }}>
            {m.month.slice(5)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [exporting, setExporting] = useState(false)

  // ── Fetch stats ──────────────────────────────────

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/reports/stats')
      setStats(res.data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Export XLSX ──────────────────────────────────

  async function handleExport() {
    setExporting(true)
    try {
      const res = await api.get('/reports/export/submissions', { responseType: 'blob' })
      const url  = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href     = url
      link.download = `submissions-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      /* silently fail — toast optional */
    } finally {
      setExporting(false)
    }
  }

  // ── Derived values — convert API arrays to keyed maps ───────────────

  const byStatus = Object.fromEntries(
    (stats?.byStatus ?? []).map(r => [r.status, r.count])
  )
  const byTrack = Object.fromEntries(
    (stats?.byTrack ?? []).map(r => [r.track, r.count])
  )
  const monthly = stats?.monthlyTrend ?? []
  const total   = Object.values(byStatus).reduce((s, v) => s + v, 0)

  const approvalRate = stats
    ? (stats.approvalRate ?? 0).toFixed(0) + '%'
    : '—'
  const avgDays = stats
    ? (stats.avgProcessingDays ?? 0).toFixed(1)
    : '—'
  const totalApproved = byStatus['APPROVED'] ?? '—'

  return (
    <div className="flex flex-col h-full">

      {/* ── Bold header band — Lev navy gradient ── */}
      <div
        className="px-4 md:px-6 py-5"
        style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, #2d4db5 100%)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{t('stats.title')}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/reports/audit-log')}
              className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors"
              style={{ minHeight: '44px' }}
            >
              {t('auditLog.title')}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl shadow disabled:opacity-60 transition-opacity"
              style={{ background: 'white', color: 'var(--lev-navy)', minHeight: '44px' }}
              aria-label={exporting ? t('stats.exportLoading') : t('stats.exportXlsx')}
            >
              <span aria-hidden="true">⬇</span>
              {exporting ? t('stats.exportLoading') : t('stats.exportXlsx')}
            </button>
          </div>
        </div>

        {/* KPI cards row — inside header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label={t('stats.submissions')} value={loading ? '…' : total} />
          <KpiCard label={t('stats.approvalRate')} value={loading ? '…' : approvalRate} accent />
          <KpiCard label={t('stats.avgProcessingDays')} value={loading ? '…' : `${avgDays} ${t('stats.days')}`} />
          <KpiCard label={t('stats.totalApproved')} value={loading ? '…' : totalApproved} accent />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4" role="alert">
            {error}
          </div>
        )}

        {!loading && stats && (
          <div className="max-w-5xl mx-auto space-y-4">

            {/* Row 1: Status bar chart + Track breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Bar chart (spans 2 cols) */}
              <div className="md:col-span-2 bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                    {t('stats.byStatus')}
                  </h2>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                    {total} {t('stats.submissions')}
                  </span>
                </div>
                <StatusBarChart byStatus={byStatus} />
              </div>

              {/* Track breakdown */}
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--lev-navy)' }}>
                  {t('stats.byTrack')}
                </h2>
                {total > 0
                  ? <TrackBreakdown byTrack={byTrack} total={total} />
                  : <p className="text-xs text-gray-500">{t('stats.noData')}</p>}
              </div>
            </div>

            {/* Row 2: Monthly trend full-width */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                  {t('stats.monthlyTrend')}
                </h2>
                <span className="text-xs text-gray-500">{t('stats.last12Months')}</span>
              </div>
              {monthly.length > 0
                ? <MonthlyTrendChart monthly={monthly} />
                : <p className="text-xs text-gray-500">{t('stats.noData')}</p>}
            </div>

          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20 text-gray-500 text-sm" role="status" aria-live="polite">
            {t('common.loading')}
          </div>
        )}
      </div>
    </div>
  )
}
