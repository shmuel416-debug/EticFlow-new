/**
 * EthicFlow — Protocols List Page
 * Displays all meeting protocols with status filter tabs.
 * Roles: SECRETARY, CHAIRMAN, ADMIN
 * Design: Option A — Clean & Minimal (white cards, whitespace, subtle badges)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

/** Status badge styles per status value. */
const STATUS_STYLES = {
  DRAFT:              'bg-yellow-50 text-yellow-800 border border-yellow-200',
  PENDING_SIGNATURES: 'bg-blue-50  text-blue-800  border border-blue-200',
  SIGNED:             'bg-green-50 text-green-800 border border-green-200',
  ARCHIVED:           'bg-gray-100 text-gray-600  border border-gray-200',
}

/** Progress bar color per status. */
const PROGRESS_COLOR = {
  SIGNED:             'bg-green-500',
  PENDING_SIGNATURES: 'bg-blue-500',
  default:            'bg-gray-300',
}

/**
 * Formats an ISO date string as dd/MM/yyyy.
 * @param {string} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProtocolsListPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const canCreate = ['SECRETARY', 'ADMIN'].includes(user?.role)

  const [protocols, setProtocols] = useState([])
  const [total,     setTotal]     = useState(0)
  const [filter,    setFilter]    = useState('ALL')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Fetch ────────────────────────────────────

  const fetchProtocols = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { limit: 50 }
      if (filter !== 'ALL') params.status = filter
      const res = await api.get('/protocols', { params })
      setProtocols(res.data.data)
      setTotal(res.data.pagination.total)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchProtocols() }, [fetchProtocols])

  // ── Count by status for tab badges ──────────

  const counts = protocols.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  // ── Filter tabs config ────────────────────────

  const TABS = [
    { key: 'ALL',               labelKey: 'protocols.filterAll' },
    { key: 'DRAFT',             labelKey: 'protocols.filterDraft' },
    { key: 'PENDING_SIGNATURES',labelKey: 'protocols.filterPending' },
    { key: 'SIGNED',            labelKey: 'protocols.filterSigned' },
    { key: 'ARCHIVED',          labelKey: 'protocols.filterArchived' },
  ]

  // ── Signature progress helper ─────────────────

  function sigProgress(sigs = []) {
    const signed = sigs.filter(s => s.status === 'SIGNED').length
    return { signed, total: sigs.length }
  }

  // ── Status label helper ───────────────────────

  const STATUS_LABEL = {
    DRAFT:              t('protocols.statusDraft'),
    PENDING_SIGNATURES: t('protocols.statusPendingSig'),
    SIGNED:             t('protocols.statusSigned'),
    ARCHIVED:           t('protocols.statusArchived'),
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('protocols.title')}
          </h1>
          <p className="text-xs text-gray-400">{t('protocols.subtitle')}</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/protocols/new')}
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg"
            style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
            aria-label={t('protocols.new')}
          >
            <span aria-hidden="true">+</span>
            <span>{t('protocols.new')}</span>
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex gap-0 px-4 md:px-6 min-w-max" role="tablist" aria-label={t('protocols.title')}>
          {TABS.map(tab => {
            const count = tab.key === 'ALL' ? total : (counts[tab.key] ?? 0)
            const isActive = filter === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(tab.key)}
                className={`py-3 px-4 text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'border-blue-500 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ minHeight: '44px' }}
              >
                {t(tab.labelKey)}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {loading && (
          <div className="flex justify-center py-16 text-gray-400 text-sm" role="status" aria-live="polite">
            {t('common.loading')}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
            {t('protocols.loadError')}
          </div>
        )}

        {!loading && !error && protocols.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center" aria-live="polite">
            <p className="text-3xl mb-3" aria-hidden="true">📋</p>
            <p className="text-gray-500 text-sm">{t('protocols.noProtocols')}</p>
          </div>
        )}

        {!loading && !error && protocols.length > 0 && (
          <ul className="space-y-3 max-w-3xl mx-auto" role="list">
            {protocols.map(protocol => {
              const { signed, total: sigTotal } = sigProgress(protocol.signatures)
              const pct = sigTotal > 0 ? Math.round((signed / sigTotal) * 100) : 0
              const barColor = PROGRESS_COLOR[protocol.status] ?? PROGRESS_COLOR.default

              return (
                <li key={protocol.id} role="listitem">
                  <button
                    onClick={() => navigate(`/protocols/${protocol.id}`)}
                    className="w-full text-right bg-white rounded-xl border hover:shadow-md transition-shadow p-4 cursor-pointer"
                    aria-label={`${protocol.title} — ${STATUS_LABEL[protocol.status]}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[protocol.status]}`}>
                            {STATUS_LABEL[protocol.status]}
                          </span>
                        </div>
                        <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--lev-navy)' }}>
                          {protocol.title}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t('protocols.meeting')}: {protocol.meeting?.title}
                          {protocol.meeting?.scheduledAt && ` • ${fmtDate(protocol.meeting.scheduledAt)}`}
                        </p>
                      </div>

                      {/* Signature progress */}
                      <div className="shrink-0 text-left min-w-[80px]" aria-label={`${t('protocols.signatures')}: ${signed}/${sigTotal}`}>
                        <div className="text-xs text-gray-400 mb-1">{t('protocols.signatures')}</div>
                        {sigTotal > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                              role="progressbar"
                              aria-valuenow={signed}
                              aria-valuemin={0}
                              aria-valuemax={sigTotal}
                            >
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${protocol.status === 'SIGNED' ? 'text-green-600' : 'text-gray-500'}`}>
                              {signed}/{sigTotal}
                              {protocol.status === 'SIGNED' && ' ✓'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
