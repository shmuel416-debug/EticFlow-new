/**
 * EthicFlow — Protocols List Page
 * Displays all meeting protocols with status filter tabs.
 * Roles: SECRETARY, CHAIRMAN, ADMIN
 * Rebuilt on the EthicFlow design system (PageHeader, Card, Badge, Tabs,
 * Button, Modal, Select, EmptyState) with the Lev palette and lucide-react
 * icons. IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FilePlus2, FileText, Inbox, Check,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  Button, Badge, Tabs, Modal, Select, FormField, EmptyState, Spinner,
  PageHeader, AccessibleIcon,
} from '../../components/ui'

/**
 * Maps a protocol status to a Badge tone.
 * @param {string} status
 * @returns {'warning'|'info'|'success'|'neutral'}
 */
function statusTone(status) {
  switch (status) {
    case 'DRAFT':              return 'warning'
    case 'PENDING_SIGNATURES': return 'info'
    case 'SIGNED':             return 'success'
    case 'ARCHIVED':           return 'neutral'
    default:                   return 'neutral'
  }
}

/**
 * Maps a protocol status to the signature progress bar color.
 * @param {string} status
 * @returns {string}
 */
function progressColor(status) {
  switch (status) {
    case 'SIGNED':             return 'var(--status-success)'
    case 'PENDING_SIGNATURES': return 'var(--status-info)'
    default:                   return 'var(--border-default)'
  }
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

/**
 * Counts signed signatures out of total.
 * @param {Array<{ status: string }>} sigs
 * @returns {{ signed: number, total: number }}
 */
function sigProgress(sigs = []) {
  const signed = sigs.filter(s => s.status === 'SIGNED').length
  return { signed, total: sigs.length }
}

/**
 * Protocols list page — lists meeting protocols with status filter tabs.
 * Preserves all data-fetching, permissions, and routing from the previous
 * version; only presentation is updated.
 * @returns {JSX.Element}
 */
export default function ProtocolsListPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const canCreate = ['SECRETARY', 'ADMIN'].includes(user?.role)

  const [protocols, setProtocols] = useState([])
  const [total,     setTotal]     = useState(0)
  const [filter,    setFilter]    = useState('ALL')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [meetings, setMeetings] = useState([])
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const returnPath = `${location.pathname}${location.search}`

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

  const counts = protocols.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  const TABS = [
    { key: 'ALL',                labelKey: 'protocols.filterAll' },
    { key: 'DRAFT',              labelKey: 'protocols.filterDraft' },
    { key: 'PENDING_SIGNATURES', labelKey: 'protocols.filterPending' },
    { key: 'SIGNED',             labelKey: 'protocols.filterSigned' },
    { key: 'ARCHIVED',           labelKey: 'protocols.filterArchived' },
  ]

  const tabItems = TABS.map(tab => ({
    key: tab.key,
    label: t(tab.labelKey),
    count: tab.key === 'ALL' ? total : (counts[tab.key] ?? 0),
  }))

  /**
   * Loads available meetings and opens the create dialog.
   * Excludes meetings that already have a protocol.
   * @returns {Promise<void>}
   */
  async function handleOpenCreateModal() {
    setShowCreateModal(true)
    setLoadingMeetings(true)
    setCreateError('')
    setSelectedMeetingId('')
    try {
      const [meetingsRes, protocolsRes] = await Promise.all([
        api.get('/meetings', { params: { filter: 'upcoming', limit: 100 } }),
        api.get('/protocols', { params: { limit: 500 } }),
      ])

      const existingMeetingIds = new Set(
        (protocolsRes.data.data ?? []).map((protocol) => protocol.meetingId)
      )

      const availableMeetings = (meetingsRes.data.data ?? []).filter(
        (meeting) => !existingMeetingIds.has(meeting.id)
      )

      setMeetings(availableMeetings)
      if (availableMeetings.length > 0) {
        setSelectedMeetingId(availableMeetings[0].id)
      }
    } catch {
      setCreateError(t('protocols.createLoadMeetingsError'))
      setMeetings([])
    } finally {
      setLoadingMeetings(false)
    }
  }

  /**
   * Navigates to protocol creation with selected meeting context.
   * @returns {void}
   */
  function handleStartCreateProtocol() {
    if (!selectedMeetingId) return
    setCreating(true)
    navigate(`/protocols/new?meetingId=${selectedMeetingId}`)
  }

  const STATUS_LABEL = {
    DRAFT:              t('protocols.statusDraft'),
    PENDING_SIGNATURES: t('protocols.statusPendingSig'),
    SIGNED:             t('protocols.statusSigned'),
    ARCHIVED:           t('protocols.statusArchived'),
  }

  return (
    <div className="p-4 md:p-6 space-y-4 min-w-0 max-w-full">
      <PageHeader
        title={t('protocols.title')}
        subtitle={t('protocols.subtitle')}
        actions={
          canCreate ? (
            <Button
              className="w-full min-[600px]:w-auto"
              variant="gold"
              onClick={handleOpenCreateModal}
              leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              aria-label={t('protocols.new')}
            >
              {t('protocols.new')}
            </Button>
          ) : null
        }
      />

      <Tabs
        items={tabItems}
        value={filter}
        onChange={setFilter}
        variant="pills"
        scrollable
        ariaLabel={t('protocols.title')}
      />

      {loading && (
        <div className="flex justify-center py-16" role="status" aria-live="polite">
          <Spinner size={32} label={t('common.loading')} />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="text-sm font-medium"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          {t('protocols.loadError')}
        </div>
      )}

      {!loading && !error && protocols.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={t('protocols.noProtocols')}
          action={
            canCreate ? (
              <Button
                variant="gold"
                onClick={handleOpenCreateModal}
                leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              >
                {t('protocols.new')}
              </Button>
            ) : null
          }
        />
      )}

      {!loading && !error && protocols.length > 0 && (
        <ul className="space-y-3 w-full max-w-3xl mx-auto min-w-0" role="list">
          {protocols.map(protocol => {
            const { signed, total: sigTotal } = sigProgress(protocol.signatures)
            const pct = sigTotal > 0 ? Math.round((signed / sigTotal) * 100) : 0
            const barColor = progressColor(protocol.status)
            const label = `${protocol.title} — ${STATUS_LABEL[protocol.status] ?? protocol.status}`

            return (
              <li key={protocol.id} role="listitem">
                <button
                  type="button"
                  onClick={() => navigate(`/protocols/${protocol.id}`, { state: { from: returnPath } })}
                  className="w-full text-start bg-white p-4 transition hover:shadow-md"
                  style={{
                    borderRadius: 'var(--radius-2xl)',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)',
                    minHeight: 64,
                  }}
                  aria-label={label}
                >
                  <div className="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-start min-[500px]:justify-between min-[500px]:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <AccessibleIcon icon={FileText} size={14} decorative style={{ color: 'var(--text-muted)' }} />
                        <Badge tone={statusTone(protocol.status)} size="sm">
                          {STATUS_LABEL[protocol.status] ?? protocol.status}
                        </Badge>
                      </div>
                      <h2
                        className="font-semibold text-sm break-words [overflow-wrap:anywhere] min-[500px]:line-clamp-2"
                        style={{ color: 'var(--lev-navy)' }}
                      >
                        {protocol.title}
                      </h2>
                      <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--text-muted)' }}>
                        {t('protocols.meeting')}: {protocol.meeting?.title}
                        {protocol.meeting?.scheduledAt && ` • ${fmtDate(protocol.meeting.scheduledAt)}`}
                      </p>
                    </div>

                    <div
                      className="shrink-0 w-full min-[500px]:w-auto min-[500px]:min-w-[88px] min-[500px]:text-end border-t min-[500px]:border-0 border-[color:var(--border-subtle)] pt-2 min-[500px]:pt-0"
                      aria-label={`${t('protocols.signatures')}: ${signed}/${sigTotal}`}
                    >
                      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        {t('protocols.signatures')}
                      </div>
                      {sigTotal > 0 ? (
                        <div className="flex items-center gap-1.5 min-[500px]:justify-end">
                          <div
                            className="overflow-hidden min-[500px]:w-16 flex-1 min-[500px]:flex-none max-w-[12rem] min-[500px]:max-w-none"
                            role="progressbar"
                            aria-valuenow={signed}
                            aria-valuemin={0}
                            aria-valuemax={sigTotal}
                            style={{
                              height: 6,
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--surface-sunken)',
                            }}
                          >
                            <div
                              className="h-full"
                              style={{
                                width: `${pct}%`,
                                background: barColor,
                                borderRadius: 'var(--radius-full)',
                              }}
                            />
                          </div>
                          <span
                            className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums shrink-0"
                            style={{
                              color: protocol.status === 'SIGNED'
                                ? 'var(--status-success)'
                                : 'var(--text-secondary)',
                            }}
                          >
                            {signed}/{sigTotal}
                            {protocol.status === 'SIGNED' && (
                              <AccessibleIcon icon={Check} size={12} decorative />
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('protocols.selectMeetingTitle')}
        size="sm"
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="gold"
              onClick={handleStartCreateProtocol}
              disabled={loadingMeetings || meetings.length === 0 || !selectedMeetingId || creating}
              loading={creating}
              leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            >
              {t('protocols.new')}
            </Button>
          </>
        }
      >
        {loadingMeetings && (
          <div className="flex items-center gap-2 py-2" role="status" aria-live="polite">
            <Spinner size={16} label={t('common.loading')} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('common.loading')}
            </span>
          </div>
        )}

        {!loadingMeetings && createError && (
          <p
            role="alert"
            className="text-sm mb-3"
            style={{ color: 'var(--status-danger)' }}
          >
            {createError}
          </p>
        )}

        {!loadingMeetings && !createError && meetings.length === 0 && (
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('protocols.noMeetingsForCreate')}
          </p>
        )}

        {!loadingMeetings && !createError && meetings.length > 0 && (
          <FormField
            label={t('protocols.selectMeetingLabel')}
            render={({ inputId, describedBy }) => (
              <Select
                id={inputId}
                value={selectedMeetingId}
                onChange={(event) => setSelectedMeetingId(event.target.value)}
                aria-describedby={describedBy}
              >
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title} — {fmtDate(meeting.scheduledAt)}
                  </option>
                ))}
              </Select>
            )}
          />
        )}
      </Modal>
    </div>
  )
}
