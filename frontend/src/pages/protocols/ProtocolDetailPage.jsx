/**
 * EthicFlow — Protocol Detail Page (brand refresh)
 * Edit protocol content (sections), finalize, request signatures, download PDF.
 * Also handles creation when navigated with ?meetingId=xxx
 * Roles: SECRETARY (edit/finalize/request), CHAIRMAN/ADMIN (view/download)
 *
 * Visual: PageHeader with backTo + action slot, Card shells, Modal primitive,
 *         lucide monochrome icons, brand tokens only. Behaviour is unchanged.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Save,
  FileCheck2,
  Signature,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  Button,
  IconButton,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Modal,
  Spinner,
  EmptyState,
  FormField,
  Input,
  Textarea,
  AccessibleIcon,
} from '../../components/ui'

/**
 * Maps a protocol status to a Badge tone.
 * @param {string} status
 * @returns {'warning'|'info'|'success'|'neutral'}
 */
function statusTone(status) {
  if (status === 'DRAFT') return 'warning'
  if (status === 'PENDING_SIGNATURES') return 'info'
  if (status === 'SIGNED') return 'success'
  return 'neutral'
}

/**
 * Maps a signer status to a Badge tone + i18n key.
 * @param {string} status
 * @returns {{ tone: 'warning'|'success'|'danger', label: string }}
 */
function signerBadge(status) {
  if (status === 'SIGNED')   return { tone: 'success', label: 'protocols.signerSigned' }
  if (status === 'DECLINED') return { tone: 'danger',  label: 'protocols.signerDeclined' }
  return { tone: 'warning', label: 'protocols.signerPending' }
}

/**
 * Formats an ISO date as dd/MM/yyyy (he-IL).
 * @param {string} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Protocol detail page.
 * @returns {JSX.Element}
 */
export default function ProtocolDetailPage() {
  const { t, i18n } = useTranslation()
  const { id }   = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const meetingId = search.get('meetingId')
  const isNew     = !id || id === 'new'
  const canEdit   = ['SECRETARY', 'ADMIN'].includes(user?.role)
  const backTo    = typeof location.state?.from === 'string' ? location.state.from : '/protocols'

  const [protocol,        setProtocol]        = useState(null)
  const [title,           setTitle]           = useState('')
  const [sections,        setSections]        = useState([{ heading: 'פתיחה', content: '' }])
  const [loading,         setLoading]         = useState(!isNew)
  const [saving,          setSaving]          = useState(false)
  const [toast,           setToast]           = useState(null)  // { msg, type }
  const [showSignModal,   setShowSignModal]   = useState(false)
  const [allUsers,        setAllUsers]        = useState([])
  const [selectedSigners, setSelectedSigners] = useState([])
  const [requestingSign,  setRequestingSign]  = useState(false)
  const [finalizing,      setFinalizing]      = useState(false)

  // ── Fetch or Create ──────────────────────────

  const fetchProtocol = useCallback(async () => {
    if (isNew) {
      if (!meetingId) { navigate(backTo); return }
      setLoading(true)
      try {
        const res = await api.post('/protocols', { meetingId })
        navigate(`/protocols/${res.data.data.id}`, { replace: true, state: location.state })
      } catch (err) {
        showToast(err.message, 'error')
        setLoading(false)
      }
      return
    }
    setLoading(true)
    try {
      const res = await api.get(`/protocols/${id}`)
      const p   = res.data.data
      setProtocol(p)
      setTitle(p.title)
      setSections(
        Array.isArray(p.contentJson?.sections)
          ? p.contentJson.sections
          : [{ heading: 'פתיחה', content: '' }]
      )
    } catch {
      showToast(t('protocols.loadError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [backTo, id, isNew, meetingId, navigate, location.state, t])

  useEffect(() => { fetchProtocol() }, [fetchProtocol])

  // ── Save ──────────────────────────────────────

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    try {
      await api.put(`/protocols/${id}`, { title, contentJson: { sections } })
      showToast(t('protocols.savedSuccess'), 'success')
      fetchProtocol()
    } catch {
      showToast(t('protocols.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Finalize ─────────────────────────────────

  async function handleFinalize() {
    if (!window.confirm(t('protocols.finalizeConfirm'))) return
    setFinalizing(true)
    try {
      await api.put(`/protocols/${id}`, { title, contentJson: { sections } })
      await api.post(`/protocols/${id}/finalize`)
      showToast(t('protocols.finalizedSuccess'), 'success')
      fetchProtocol()
    } catch {
      showToast(t('protocols.saveError'), 'error')
    } finally {
      setFinalizing(false)
    }
  }

  // ── Request signatures ────────────────────────

  async function openSignModal() {
    try {
      const res = await api.get('/users/signers')
      setAllUsers(res.data.data ?? [])
    } catch {
      setAllUsers([])
      showToast(t('protocols.loadSignersError'), 'error')
    }
    setSelectedSigners(
      protocol?.meeting?.attendees?.map(a => a.userId) ?? []
    )
    setShowSignModal(true)
  }

  async function handleRequestSignatures() {
    if (selectedSigners.length === 0) return
    setRequestingSign(true)
    try {
      const res = await api.post(`/protocols/${id}/request-signatures`, { signerIds: selectedSigners })
      showToast(t('protocols.signaturesRequested', { count: res.data.data.created }), 'success')
      setShowSignModal(false)
      fetchProtocol()
    } catch {
      showToast(t('protocols.saveError'), 'error')
    } finally {
      setRequestingSign(false)
    }
  }

  // ── Download PDF ─────────────────────────────

  /**
   * Downloads protocol PDF in selected language.
   * @param {'he'|'en'} lang
   */
  function handlePdf(lang) {
    window.open(`/api/protocols/${id}/pdf?lang=${lang}`, '_blank')
  }

  // ── Section helpers ───────────────────────────

  function updateSection(idx, field, value) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function addSection() {
    setSections(prev => [...prev, { heading: '', content: '' }])
  }

  function removeSection(idx) {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Toast helper ──────────────────────────────

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const isDraft   = protocol?.status === 'DRAFT'
  const isPending = protocol?.status === 'PENDING_SIGNATURES'

  const STATUS_LABEL = {
    DRAFT:              t('protocols.statusDraft'),
    PENDING_SIGNATURES: t('protocols.statusPendingSig'),
    SIGNED:             t('protocols.statusSigned'),
    ARCHIVED:           t('protocols.statusArchived'),
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <Spinner size={28} label={t('common.loading')} />
      </div>
    )
  }

  const signedCount = protocol?.signatures?.filter(s => s.status === 'SIGNED').length ?? 0
  const totalSig    = protocol?.signatures?.length ?? 0

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {protocol?.status && (
        <Badge tone={statusTone(protocol.status)} size="md">
          {STATUS_LABEL[protocol.status]}
        </Badge>
      )}
      {canEdit && isDraft && (
        <>
          <Button
            variant="secondary"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            leftIcon={<AccessibleIcon icon={Save} size={16} decorative />}
          >
            {t('protocols.save')}
          </Button>
          <Button
            variant="gold"
            onClick={handleFinalize}
            loading={finalizing}
            disabled={finalizing}
            leftIcon={<AccessibleIcon icon={FileCheck2} size={16} decorative />}
          >
            {t('protocols.finalize')}
          </Button>
        </>
      )}
      {canEdit && isPending && (
        <Button
          variant="gold"
          onClick={openSignModal}
          leftIcon={<AccessibleIcon icon={Signature} size={16} decorative />}
        >
          {t('protocols.requestSignatures')}
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => handlePdf('he')}
        leftIcon={<AccessibleIcon icon={Download} size={16} decorative />}
      >
        {t('protocols.downloadPdf')}
      </Button>
      <Button
        variant="ghost"
        onClick={() => handlePdf('en')}
        leftIcon={<AccessibleIcon icon={Download} size={16} decorative />}
      >
        {t('protocols.downloadPdfEn')}
      </Button>
    </div>
  )

  const subtitleParts = []
  if (protocol?.meeting?.title) subtitleParts.push(protocol.meeting.title)
  if (protocol?.meeting?.scheduledAt) subtitleParts.push(fmtDate(protocol.meeting.scheduledAt))

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Toast ── */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
          style={{
            zIndex: 'var(--z-toast)',
            background: toast.type === 'error' ? 'var(--status-danger)' : 'var(--status-success)',
            color: '#fff',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <AccessibleIcon
            icon={toast.type === 'error' ? XCircle : CheckCircle2}
            size={18}
            decorative
          />
          <span>{toast.msg}</span>
        </div>
      )}

      <PageHeader
        title={protocol?.title ?? t('protocols.new')}
        subtitle={subtitleParts.join(' • ')}
        backTo={backTo}
        backLabel={t('protocols.backToList')}
        actions={headerActions}
      />

      {/* ── Body — editor + signatures ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">

        {/* Editor column */}
        <div className="space-y-4">
          {/* Title card */}
          <Card>
            <CardBody>
              <FormField
                label={t('protocols.protocolTitle')}
                render={({ inputId, describedBy }) => (
                  <Input
                    id={inputId}
                    aria-describedby={describedBy}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={!canEdit || !isDraft}
                  />
                )}
              />
            </CardBody>
          </Card>

          {/* Sections card */}
          <Card>
            <CardHeader
              title={t('protocols.sections')}
              actions={
                canEdit && isDraft
                  ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addSection}
                      leftIcon={<AccessibleIcon icon={Plus} size={16} decorative />}
                    >
                      {t('protocols.addSection')}
                    </Button>
                  )
                  : null
              }
            />
            <CardBody>
              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <fieldset
                    key={idx}
                    className="p-3 space-y-2"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-sunken)',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <FormField
                          label={t('protocols.sectionHeading')}
                          render={({ inputId, describedBy }) => (
                            <Input
                              id={inputId}
                              aria-describedby={describedBy}
                              value={section.heading}
                              onChange={e => updateSection(idx, 'heading', e.target.value)}
                              disabled={!canEdit || !isDraft}
                            />
                          )}
                        />
                      </div>
                      {canEdit && isDraft && sections.length > 1 && (
                        <div className="mt-6">
                          <IconButton
                            icon={Trash2}
                            label={`${t('protocols.removeSection')} ${section.heading ?? ''}`}
                            onClick={() => removeSection(idx)}
                          />
                        </div>
                      )}
                    </div>
                    <FormField
                      label={t('protocols.sectionContent')}
                      render={({ inputId, describedBy }) => (
                        <Textarea
                          id={inputId}
                          aria-describedby={describedBy}
                          value={section.content}
                          onChange={e => updateSection(idx, 'content', e.target.value)}
                          disabled={!canEdit || !isDraft}
                          rows={4}
                          placeholder={canEdit && isDraft ? `${t('protocols.sectionContent')}...` : ''}
                        />
                      )}
                    />
                  </fieldset>
                ))}

                {canEdit && isDraft && (
                  <button
                    type="button"
                    onClick={addSection}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold transition"
                    style={{
                      minHeight: 44,
                      border: '2px dashed var(--border-default)',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--text-muted)',
                      background: 'transparent',
                      padding: '10px 14px',
                    }}
                  >
                    <Plus size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                    <span>{t('protocols.addSection')}</span>
                  </button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Signatures column */}
        <Card aria-label={t('protocols.signatures')}>
          <CardHeader title={t('protocols.signatures')} />
          <CardBody>
            {/* Progress */}
            {totalSig > 0 && (
              <div className="mb-3">
                <div
                  className="flex justify-between text-xs mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>
                    {signedCount} / {totalSig} {t('protocols.signerSigned')}
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden"
                  style={{
                    background: 'var(--surface-sunken)',
                    borderRadius: 'var(--radius-full)',
                  }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={totalSig}
                  aria-valuenow={signedCount}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.round((signedCount / totalSig) * 100)}%`,
                      background: 'var(--lev-navy)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            )}

            <ul className="space-y-2 mb-4" role="list">
              {(protocol?.signatures ?? []).map(sig => {
                const b = signerBadge(sig.status)
                const initials = sig.user?.fullName?.charAt(0) ?? '?'
                return (
                  <li
                    key={sig.id}
                    className="flex items-center gap-2 p-2"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-raised)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--lev-navy-50)',
                        color: 'var(--lev-navy)',
                      }}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {sig.user?.fullName}
                      </div>
                      <div className="mt-0.5">
                        <Badge tone={b.tone} size="sm">{t(b.label)}</Badge>
                      </div>
                    </div>
                  </li>
                )
              })}
              {totalSig === 0 && (
                <li>
                  <EmptyState
                    icon={ClipboardList}
                    title={t('protocols.noSignaturesYet')}
                  />
                </li>
              )}
            </ul>

            {canEdit && isPending && (
              <Button
                variant="gold"
                fullWidth
                onClick={openSignModal}
                className="mb-2"
                leftIcon={<AccessibleIcon icon={Signature} size={16} decorative />}
              >
                {t('protocols.requestSignatures')}
              </Button>
            )}
            <Button
              variant="secondary"
              fullWidth
              onClick={() => handlePdf(i18n.language === 'en' ? 'en' : 'he')}
              leftIcon={<AccessibleIcon icon={Download} size={16} decorative />}
            >
              {i18n.language === 'en' ? t('protocols.downloadPdfEn') : t('protocols.downloadPdf')}
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* ── Request Signatures Modal ── */}
      <Modal
        open={showSignModal}
        onClose={() => setShowSignModal(false)}
        title={t('protocols.selectSigners')}
        size="sm"
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSignModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="gold"
              onClick={handleRequestSignatures}
              disabled={requestingSign || selectedSigners.length === 0}
              loading={requestingSign}
              leftIcon={<AccessibleIcon icon={Signature} size={16} decorative />}
            >
              {t('protocols.requestSignatures')}
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5 max-h-60 overflow-auto" role="list">
          {allUsers.map(u => {
            const checked = selectedSigners.includes(u.id)
            return (
              <li key={u.id}>
                <label
                  className="flex items-center gap-3 p-2 cursor-pointer transition"
                  style={{
                    minHeight: 44,
                    borderRadius: 'var(--radius-lg)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-sunken)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedSigners(prev =>
                        checked ? prev.filter(x => x !== u.id) : [...prev, u.id]
                      )
                    }
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--lev-navy)' }}
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {u.fullName}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </label>
              </li>
            )
          })}
          {allUsers.length === 0 && (
            <li>
              <div className="flex items-center justify-center gap-2 py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                <AccessibleIcon icon={AlertTriangle} size={14} decorative />
                <span>{t('protocols.noSignersAvailable')}</span>
              </div>
            </li>
          )}
        </ul>
      </Modal>
    </div>
  )
}
