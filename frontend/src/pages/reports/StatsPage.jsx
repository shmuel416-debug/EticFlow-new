/**
 * EthicFlow — Statistics & Reports Page
 * Uses design-system StatCard KPIs + Card-wrapped charts.
 * Brand palette only via CSS vars. Roles: SECRETARY, CHAIRMAN, ADMIN.
 */

import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3, CheckCircle2, Clock, FileText, Activity, Download,
} from 'lucide-react'
import api from '../../services/api'
import {
  Button, Card, CardHeader, CardBody, PageHeader, StatCard, Badge,
} from '../../components/ui'

/** Submission status colours for the bar chart — CSS-var driven */
const STATUS_BARS = [
  { key: 'SUBMITTED',        labelKey: 'submission.status.SUBMITTED',        color: 'var(--status-warning)' },
  { key: 'IN_TRIAGE',        labelKey: 'submission.status.IN_TRIAGE',        color: 'var(--status-info)' },
  { key: 'IN_REVIEW',        labelKey: 'submission.status.IN_REVIEW',        color: 'var(--lev-navy)' },
  { key: 'APPROVED',         labelKey: 'submission.status.APPROVED',         color: 'var(--status-success)' },
  { key: 'REJECTED',         labelKey: 'submission.status.REJECTED',         color: 'var(--status-danger)' },
  { key: 'PENDING_REVISION', labelKey: 'submission.status.PENDING_REVISION', color: 'var(--lev-gold-600)' },
]

/** Track colours */
const TRACK_COLORS = {
  FULL:      'var(--lev-navy)',
  EXPEDITED: 'var(--status-success)',
  EXEMPT:    'var(--status-warning)',
}

/** Track i18n keys */
const TRACK_LABEL_KEYS = {
  FULL:      'submission.tracks.FULL',
  EXPEDITED: 'submission.tracks.EXPEDITED',
  EXEMPT:    'submission.tracks.EXEMPT',
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
              className="w-full transition-all duration-500"
              style={{
                height: `${Math.max(heightPct * 1.2, count > 0 ? 4 : 0)}px`,
                background: color,
                maxHeight: '120px',
                borderTopLeftRadius: 'var(--radius-md)',
                borderTopRightRadius: 'var(--radius-md)',
              }}
              role="presentation"
            />
            <span
              className="text-xs text-center leading-tight"
              style={{ color: 'var(--text-muted)', fontSize: 11 }}
            >
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
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t(labelKey)}</span>
              <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
            </div>
            <div
              className="w-full h-2.5"
              role="progressbar"
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={t(labelKey)}
              style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-full)' }}
            >
              <div
                className="h-2.5 transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: TRACK_COLORS[key],
                  borderRadius: 'var(--radius-full)',
                }}
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
  const span   = Math.max(monthly.length - 1, 1)

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
            <stop offset="0%"   stopColor="var(--lev-navy)" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="var(--lev-navy)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={pad} y1={pad + f * (H - 2 * pad)} x2={W - pad} y2={pad + f * (H - 2 * pad)}
            stroke="var(--border-subtle)" strokeWidth="1"/>
        ))}
        <polygon points={areaPoints} fill="url(#trendGrad)"/>
        <polyline points={points} fill="none" stroke="var(--lev-navy)" strokeWidth="2.5" strokeLinejoin="round"/>
        {monthly.map((m, i) => {
          const x = pad + (i / span) * (W - 2 * pad)
          const y = H - pad - ((m.count / max) * (H - 2 * pad))
          return i === monthly.length - 1
            ? <circle key={i} cx={x} cy={y} r="4" fill="var(--lev-navy)" aria-label={`${m.month}: ${m.count}`}/>
            : null
        })}
      </svg>
      <div className="flex justify-between mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
        {monthly.map((m, i) => (
          <span key={i} className="text-center" style={{ fontSize: 10 }}>
            {m.month.slice(5)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [exporting, setExporting] = useState(false)
  const returnPath = `${location.pathname}${location.search}`

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

  async function handleExport(lang) {
    setExporting(true)
    try {
      const res = await api.get('/reports/export/submissions', {
        params: { lang },
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href     = url
      link.download = `submissions-export-${lang}-${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      /* silently fail — toast optional */
    } finally {
      setExporting(false)
    }
  }

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

  const dateSubtitle = new Date().toLocaleDateString(
    i18n.language === 'en' ? 'en-GB' : 'he-IL',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  )

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={t('stats.title')}
        subtitle={dateSubtitle}
        backTo="/dashboard"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/reports/audit-log', { state: { from: returnPath } })}
              leftIcon={<Activity size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            >
              {t('auditLog.title')}
            </Button>
            <Button
              variant="gold"
              onClick={() => handleExport('he')}
              disabled={exporting}
              leftIcon={<Download size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              aria-label={exporting ? t('stats.exportLoading') : t('stats.exportXlsx')}
            >
              {exporting ? t('stats.exportLoading') : t('stats.exportXlsx')}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleExport('en')}
              disabled={exporting}
              leftIcon={<Download size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              aria-label={exporting ? t('stats.exportLoading') : t('stats.exportXlsxEn')}
            >
              {exporting ? t('stats.exportLoading') : t('stats.exportXlsxEn')}
            </Button>
          </div>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label={t('stats.submissions')}
          value={loading ? '…' : total}
          tone="navy"
          icon={FileText}
        />
        <StatCard
          label={t('stats.approvalRate')}
          value={loading ? '…' : approvalRate}
          tone="success"
          icon={CheckCircle2}
        />
        <StatCard
          label={t('stats.avgProcessingDays')}
          value={loading ? '…' : `${avgDays}`}
          hint={t('stats.days')}
          tone="purple"
          icon={Clock}
        />
        <StatCard
          label={t('stats.totalApproved')}
          value={loading ? '…' : totalApproved}
          tone="gold"
          icon={BarChart3}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 text-sm"
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

      {!loading && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader
                title={t('stats.byStatus')}
                actions={
                  <Badge tone="navy" size="sm">
                    {total} {t('stats.submissions')}
                  </Badge>
                }
              />
              <CardBody>
                <StatusBarChart byStatus={byStatus} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t('stats.byTrack')} />
              <CardBody>
                {total > 0
                  ? <TrackBreakdown byTrack={byTrack} total={total} />
                  : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('stats.noData')}</p>}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title={t('stats.monthlyTrend')}
              actions={
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('stats.last12Months')}
                </span>
              }
            />
            <CardBody>
              {monthly.length > 0
                ? <MonthlyTrendChart monthly={monthly} />
                : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('stats.noData')}</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex justify-center py-20 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('common.loading')}
        </div>
      )}
    </div>
  )
}
