/**
 * EthicFlow — Audit Log Page
 * Paginated, filterable audit-event list using Table primitive with
 * responsive mobile card fallback. Role: ADMIN only.
 */

import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Activity, Search, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../../services/api'
import {
  Button, Card, PageHeader, Input, Select, FormField, Table, Badge,
} from '../../components/ui'

/** Action badge tone keyed by action verb prefix */
const ACTION_TONES = {
  APPROVED:  'success',
  CREATED:   'info',
  UPDATED:   'navy',
  SUBMITTED: 'warning',
  REJECTED:  'danger',
  DELETED:   'danger',
  PUBLISHED: 'purple',
  LOGIN:     'neutral',
}

/** Returns badge tone for an action string. */
function actionBadgeTone(action = '') {
  const prefix = action.split('_').pop()
  return ACTION_TONES[prefix] ?? 'neutral'
}

/**
 * Formats ISO timestamp as dd/MM/yyyy HH:mm.
 * @param {string} iso
 * @returns {string}
 */
function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

const PAGE_SIZE = 20

const ENTITY_TYPES = ['SUBMISSION', 'USER', 'FORM', 'MEETING', 'PROTOCOL', 'DOCUMENT', 'AUTH']

export default function AuditLogPage() {
  const { t, i18n } = useTranslation()
  const location    = useLocation()
  const isRtl       = i18n.dir() === 'rtl'

  const [logs,      setLogs]      = useState([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const [actionFilter,     setActionFilter]     = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [dateFromFilter,   setDateFromFilter]   = useState('')
  const [dateToFilter,     setDateToFilter]     = useState('')
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/reports'

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (actionFilter)     params.action     = actionFilter
      if (entityTypeFilter) params.entityType = entityTypeFilter
      if (dateFromFilter)   params.from = `${dateFromFilter}T00:00:00.000Z`
      if (dateToFilter)     params.to   = `${dateToFilter}T23:59:59.999Z`
      const res = await api.get('/audit-logs', { params })
      setLogs(res.data.data)
      setTotal(res.data.pagination.total)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, entityTypeFilter, dateFromFilter, dateToFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  const hasAnyFilter = actionFilter || entityTypeFilter || dateFromFilter || dateToFilter

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft  : ChevronRight

  const columns = [
    {
      key: 'createdAt',
      header: t('auditLog.time'),
      render: (log) => (
        <span className="text-xs whitespace-nowrap tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {fmtDateTime(log.createdAt)}
        </span>
      ),
    },
    {
      key: 'user',
      header: t('auditLog.user'),
      render: (log) => (
        log.user
          ? <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{log.user.fullName}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      ),
    },
    {
      key: 'action',
      header: t('auditLog.action'),
      render: (log) => (
        <Badge tone={actionBadgeTone(log.action)} size="sm">
          {log.action}
        </Badge>
      ),
    },
    {
      key: 'entityType',
      header: t('auditLog.entityType'),
      render: (log) => (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {log.entityType ?? '—'}
        </span>
      ),
    },
    {
      key: 'entityId',
      header: t('auditLog.entityId'),
      hideOnMobile: true,
      render: (log) => (
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {log.entityId?.slice(0, 8) ?? '—'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: t('auditLog.ip'),
      hideOnMobile: true,
      render: (log) => (
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {log.ipAddress ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Activity size={22} strokeWidth={1.75} aria-hidden="true" focusable="false" style={{ color: 'var(--lev-navy)' }} />
            {t('auditLog.title')}
          </span>
        }
        subtitle={t('auditLog.system')}
        backTo={backTo}
      />

      {/* Filter toolbar */}
      <Card className="mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <FormField
              label={t('auditLog.filterAction')}
              render={({ inputId }) => (
                <Input
                  id={inputId}
                  icon={Search}
                  type="text"
                  placeholder={t('auditLog.filterAction')}
                  value={actionFilter}
                  onChange={handleFilterChange(setActionFilter)}
                />
              )}
            />
          </div>

          <div className="min-w-[180px]">
            <FormField
              label={t('auditLog.filterEntity')}
              render={({ inputId }) => (
                <Select
                  id={inputId}
                  value={entityTypeFilter}
                  onChange={handleFilterChange(setEntityTypeFilter)}
                >
                  <option value="">— {t('auditLog.filterEntity')} —</option>
                  {ENTITY_TYPES.map(et => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </Select>
              )}
            />
          </div>

          <div className="min-w-[150px]">
            <FormField
              label={t('auditLog.dateFrom')}
              render={({ inputId }) => (
                <Input
                  id={inputId}
                  type="date"
                  value={dateFromFilter}
                  onChange={handleFilterChange(setDateFromFilter)}
                />
              )}
            />
          </div>

          <div className="min-w-[150px]">
            <FormField
              label={t('auditLog.dateTo')}
              render={({ inputId }) => (
                <Input
                  id={inputId}
                  type="date"
                  value={dateToFilter}
                  onChange={handleFilterChange(setDateToFilter)}
                />
              )}
            />
          </div>

          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Filter size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              onClick={() => {
                setActionFilter(''); setEntityTypeFilter('')
                setDateFromFilter(''); setDateToFilter(''); setPage(1)
              }}
            >
              {t('auditLog.clearFilter')}
            </Button>
          )}
        </div>
      </Card>

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

      <Card>
        <Table
          columns={columns}
          rows={logs}
          rowKey={(log) => log.id}
          loading={loading}
          caption={t('auditLog.title')}
          emptyTitle={t('auditLog.noLogs')}
        />
      </Card>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div
          className="mt-4 p-3 flex items-center justify-between bg-white"
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {t('common.showing')} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {t('common.of')} {total}
          </span>
          <div className="flex gap-1.5 items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              leftIcon={<PrevIcon size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              aria-label={t('common.prevPage')}
            >
              {t('common.prev')}
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              const isActive = pg === page
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPage(pg)}
                  aria-current={isActive ? 'page' : undefined}
                  className="text-xs font-semibold transition"
                  style={{
                    minWidth: 36,
                    minHeight: 36,
                    padding: '0 10px',
                    borderRadius: 'var(--radius-lg)',
                    background: isActive ? 'var(--lev-navy)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--lev-navy)' : '1px solid var(--border-default)',
                  }}
                >
                  {pg}
                </button>
              )
            })}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              rightIcon={<NextIcon size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              aria-label={t('common.nextPage')}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
