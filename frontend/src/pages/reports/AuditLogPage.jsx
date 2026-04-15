/**
 * EthicFlow — Audit Log Page
 * Paginated, filterable table of system audit events.
 * Desktop: full table. Mobile: card layout.
 * Role: ADMIN only.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

/** Action badge colours keyed by action verb prefix */
const ACTION_COLORS = {
  APPROVED:  'bg-green-50  text-green-700',
  CREATED:   'bg-blue-50   text-blue-700',
  UPDATED:   'bg-indigo-50 text-indigo-700',
  SUBMITTED: 'bg-yellow-50 text-yellow-700',
  REJECTED:  'bg-red-50    text-red-700',
  DELETED:   'bg-red-50    text-red-700',
  PUBLISHED: 'bg-purple-50 text-purple-700',
  LOGIN:     'bg-gray-100  text-gray-600',
}

/** Returns a badge colour class for an action string. */
function actionBadgeClass(action = '') {
  const prefix = action.split('_').pop() // e.g. "SUBMISSION_APPROVED" → "APPROVED"
  return ACTION_COLORS[prefix] ?? 'bg-gray-100 text-gray-600'
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
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [logs,      setLogs]      = useState([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Filters ──────────────────────────────────────
  const [actionFilter,     setActionFilter]     = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [dateFromFilter,   setDateFromFilter]   = useState('')
  const [dateToFilter,     setDateToFilter]     = useState('')

  // ── Fetch ────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (actionFilter)     params.action     = actionFilter
      if (entityTypeFilter) params.entityType = entityTypeFilter
      if (dateFromFilter)   params.dateFrom   = dateFromFilter
      if (dateToFilter)     params.dateTo     = dateToFilter
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

  // ── Pagination ───────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  // ── Common input style ───────────────────────────

  const inputClass = 'text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 bg-white'
  const inputStyle = { minHeight: '40px', '--tw-ring-color': 'var(--lev-navy)' }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div
        className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, #2d4db5 100%)' }}
      >
        <div>
          <h1 className="text-xl font-bold text-white">{t('auditLog.title')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('auditLog.system')}
          </p>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors self-start md:self-auto"
          style={{ minHeight: '44px' }}
          aria-label={t('stats.title')}
        >
          ← {t('stats.title')}
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">{t('auditLog.filterAction')}</label>
          <input
            type="text"
            placeholder={t('auditLog.filterAction')}
            value={actionFilter}
            onChange={handleFilterChange(setActionFilter)}
            className={inputClass}
            style={inputStyle}
            aria-label={t('auditLog.filterAction')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">{t('auditLog.filterEntity')}</label>
          <select
            value={entityTypeFilter}
            onChange={handleFilterChange(setEntityTypeFilter)}
            className={inputClass}
            style={inputStyle}
            aria-label={t('auditLog.filterEntity')}
          >
            <option value="">— {t('auditLog.filterEntity')} —</option>
            {ENTITY_TYPES.map(et => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">מתאריך</label>
          <input
            type="date"
            value={dateFromFilter}
            onChange={handleFilterChange(setDateFromFilter)}
            className={inputClass}
            style={inputStyle}
            aria-label="מתאריך"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">עד תאריך</label>
          <input
            type="date"
            value={dateToFilter}
            onChange={handleFilterChange(setDateToFilter)}
            className={inputClass}
            style={inputStyle}
            aria-label="עד תאריך"
          />
        </div>

        {(actionFilter || entityTypeFilter || dateFromFilter || dateToFilter) && (
          <button
            onClick={() => { setActionFilter(''); setEntityTypeFilter(''); setDateFromFilter(''); setDateToFilter(''); setPage(1) }}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors self-end pb-2"
          >
            נקה סינון
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm m-4" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16 text-gray-400 text-sm" role="status" aria-live="polite">
            {t('auditLog.loading')}
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center" aria-live="polite">
            <p className="text-3xl mb-3" aria-hidden="true">🔍</p>
            <p className="text-gray-500 text-sm">{t('auditLog.noLogs')}</p>
          </div>
        )}

        {/* Desktop table */}
        {!loading && logs.length > 0 && (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-white border-b sticky top-0">
                  <tr>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">{t('auditLog.time')}</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">{t('auditLog.user')}</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">{t('auditLog.action')}</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">{t('auditLog.entityType')}</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">{t('auditLog.entityId')}</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs">{t('auditLog.ip')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-white transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">
                        {log.user ? log.user.fullName : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${actionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{log.entityType ?? '—'}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono">{log.entityId?.slice(0, 8) ?? '—'}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <ul className="md:hidden p-4 space-y-3" role="list">
              {logs.map(log => (
                <li key={log.id} className="bg-white rounded-xl border p-4 shadow-sm" role="listitem">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${actionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(log.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {log.user ? log.user.fullName : <span className="text-gray-400">—</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.entityType ?? '—'}
                    {log.ipAddress && ` • ${log.ipAddress}`}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && total > PAGE_SIZE && (
        <div className="bg-white border-t px-4 md:px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {t('common.showing')} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {t('common.of')} {total}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs px-3 py-1.5 rounded-lg border text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              style={{ minHeight: '36px' }}
              aria-label="עמוד קודם"
            >
              הקודם
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    pg === page
                      ? 'text-white font-bold'
                      : 'border text-gray-600 hover:bg-gray-50'
                  }`}
                  style={{ minHeight: '36px', background: pg === page ? 'var(--lev-navy)' : undefined }}
                  aria-current={pg === page ? 'page' : undefined}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs px-3 py-1.5 rounded-lg border text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              style={{ minHeight: '36px' }}
              aria-label="עמוד הבא"
            >
              הבא
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
