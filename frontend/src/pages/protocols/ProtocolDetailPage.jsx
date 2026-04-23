/**
 * EthicFlow — Protocol Detail Page
 * Edit protocol content (sections), finalize, request signatures, download PDF.
 * Also handles creation when navigated with ?meetingId=xxx
 * Roles: SECRETARY (edit/finalize/request), CHAIRMAN/ADMIN (view/download)
 * Design: Option A — Clean & Minimal, two-column: editor left, signatures right
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

/** Status badge styles. */
const STATUS_STYLES = {
  DRAFT:              'bg-yellow-50 text-yellow-800 border border-yellow-200',
  PENDING_SIGNATURES: 'bg-blue-50  text-blue-800  border border-blue-200',
  SIGNED:             'bg-green-50 text-green-800 border border-green-200',
  ARCHIVED:           'bg-gray-100 text-gray-600  border border-gray-200',
}

/** Signer status badge colours. */
const SIG_STYLES = {
  PENDING:  { cls: 'bg-amber-50 border border-amber-100',  dot: 'bg-amber-400',  label: 'protocols.signerPending' },
  SIGNED:   { cls: 'bg-green-50 border border-green-100',  dot: 'bg-green-500',  label: 'protocols.signerSigned' },
  DECLINED: { cls: 'bg-red-50   border border-red-100',    dot: 'bg-red-400',    label: 'protocols.signerDeclined' },
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

export default function ProtocolDetailPage() {
  const { t, i18n } = useTranslation()
  const { id }   = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const meetingId = search.get('meetingId')   // Set when creating new protocol
  const isNew     = !id || id === 'new'
  const canEdit   = ['SECRETARY', 'ADMIN'].includes(user?.role)
  const backTo    = typeof location.state?.from === 'string' ? location.state.from : '/protocols'

  const [protocol,       setProtocol]       = useState(null)
  const [title,          setTitle]          = useState('')
  const [sections,       setSections]       = useState([{ heading: 'פתיחה', content: '' }])
  const [loading,        setLoading]        = useState(!isNew)
  const [saving,         setSaving]         = useState(false)
  const [toast,          setToast]          = useState(null)  // { msg, type }
  const [showSignModal,  setShowSignModal]  = useState(false)
  const [allUsers,       setAllUsers]       = useState([])
  const [selectedSigners,setSelectedSigners]= useState([])
  const [requestingSign, setRequestingSign] = useState(false)
  const [finalizing,     setFinalizing]     = useState(false)

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
    // Pre-select meeting attendees if available
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
      <div className="flex justify-center items-center h-64 text-gray-400 text-sm" role="status" aria-live="polite">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Toast ── */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backTo)}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label={t('protocols.backToList')}
          >
            ← {t('common.back')}
          </button>
          <span className="text-gray-200" aria-hidden="true">|</span>
          <div>
            <h1 className="font-bold text-sm" style={{ color: 'var(--lev-navy)' }}>
              {protocol?.title ?? t('protocols.new')}
            </h1>
            <p className="text-xs text-gray-400">
              {protocol?.meeting?.title}
              {protocol?.meeting?.scheduledAt && ` • ${fmtDate(protocol.meeting.scheduledAt)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {protocol?.status && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[protocol.status]}`}>
              {STATUS_LABEL[protocol.status]}
            </span>
          )}
          {canEdit && isDraft && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                {saving ? '...' : t('protocols.save')}
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                {finalizing ? '...' : t('protocols.finalize')}
              </button>
            </>
          )}
          {canEdit && isPending && (
            <button
              onClick={openSignModal}
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg"
              style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
            >
              {t('protocols.requestSignatures')}
            </button>
          )}
          <button
            onClick={() => handlePdf('he')}
            className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            style={{ minHeight: '44px' }}
          >
            {t('protocols.downloadPdf')}
          </button>
          <button
            onClick={() => handlePdf('en')}
            className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            style={{ minHeight: '44px' }}
          >
            {t('protocols.downloadPdfEn')}
          </button>
        </div>
      </div>

      {/* ── Body — editor + signatures ── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* Editor */}
        <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50">
          {/* Title */}
          <div className="bg-white rounded-xl border p-4">
            <label className="text-xs font-semibold text-gray-500 block mb-1.5" htmlFor="protocol-title">
              {t('protocols.protocolTitle')}
            </label>
            <input
              id="protocol-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={!canEdit || !isDraft}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
              style={{ color: 'var(--lev-navy)' }}
            />
          </div>

          {/* Sections */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                {t('protocols.sections')}
              </h2>
              {canEdit && isDraft && (
                <button
                  onClick={addSection}
                  className="text-xs text-blue-600 font-medium hover:text-blue-800"
                  style={{ minHeight: '44px', padding: '0 8px' }}
                >
                  + {t('protocols.addSection')}
                </button>
              )}
            </div>

            {sections.map((section, idx) => (
              <fieldset key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-0.5" htmlFor={`section-heading-${idx}`}>
                      {t('protocols.sectionHeading')}
                    </label>
                    <input
                      id={`section-heading-${idx}`}
                      value={section.heading}
                      onChange={e => updateSection(idx, 'heading', e.target.value)}
                      disabled={!canEdit || !isDraft}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:border-blue-400 disabled:bg-white disabled:text-gray-600"
                      style={{ color: 'var(--lev-navy)' }}
                    />
                  </div>
                  {canEdit && isDraft && sections.length > 1 && (
                    <button
                      onClick={() => removeSection(idx)}
                      className="text-gray-300 hover:text-red-400 text-sm mt-4"
                      aria-label={`${t('protocols.removeSection')} ${section.heading}`}
                      style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-0.5" htmlFor={`section-content-${idx}`}>
                    {t('protocols.sectionContent')}
                  </label>
                  <textarea
                    id={`section-content-${idx}`}
                    value={section.content}
                    onChange={e => updateSection(idx, 'content', e.target.value)}
                    disabled={!canEdit || !isDraft}
                    rows={4}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-400 disabled:bg-white disabled:text-gray-600 resize-y"
                    placeholder={canEdit && isDraft ? t('protocols.sectionContent') + '...' : ''}
                  />
                </div>
              </fieldset>
            ))}

            {canEdit && isDraft && (
              <button
                onClick={addSection}
                className="w-full border-2 border-dashed border-gray-200 text-gray-400 py-3 rounded-lg text-sm hover:border-blue-300 hover:text-blue-400 transition-colors"
                style={{ minHeight: '44px' }}
              >
                + {t('protocols.addSection')}
              </button>
            )}
          </div>
        </div>

        {/* Signatures panel */}
        <div
          className="w-full md:w-[260px] bg-white border-t md:border-t-0 md:border-s overflow-auto p-4 shrink-0"
          aria-label={t('protocols.signatures')}
        >
          <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('protocols.signatures')}
          </h2>

          {/* Progress summary */}
          {protocol?.signatures?.length > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>
                  {protocol.signatures.filter(s => s.status === 'SIGNED').length}
                  {' / '}
                  {protocol.signatures.length}
                  {' '}{t('protocols.signerSigned')}
                </span>
              </div>
              <div
                className="h-1.5 bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={protocol.signatures.length}
                aria-valuenow={protocol.signatures.filter(s => s.status === 'SIGNED').length}
              >
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${Math.round(
                      (protocol.signatures.filter(s => s.status === 'SIGNED').length /
                      protocol.signatures.length) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Signer list */}
          <ul className="space-y-2 mb-4" role="list">
            {(protocol?.signatures ?? []).map(sig => {
              const style = SIG_STYLES[sig.status] ?? SIG_STYLES.PENDING
              const initials = sig.user?.fullName?.charAt(0) ?? '?'
              return (
                <li
                  key={sig.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${style.cls}`}
                >
                  <div
                    className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {sig.user?.fullName}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} aria-hidden="true" />
                      <span className="text-[10px] text-gray-500">{t(style.label)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
            {(!protocol?.signatures || protocol.signatures.length === 0) && (
              <li className="text-xs text-gray-400 text-center py-4">{t('protocols.noSignaturesYet')}</li>
            )}
          </ul>

          {/* Actions */}
          {canEdit && isPending && (
            <button
              onClick={openSignModal}
              className="w-full text-sm font-semibold text-white py-2.5 rounded-xl mb-2"
              style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
            >
              {t('protocols.requestSignatures')}
            </button>
          )}
          <button
            onClick={() => handlePdf(i18n.language === 'en' ? 'en' : 'he')}
            className="w-full text-sm border border-gray-200 text-gray-600 py-2 rounded-xl hover:bg-gray-50"
            style={{ minHeight: '44px' }}
          >
            {i18n.language === 'en' ? t('protocols.downloadPdfEn') : t('protocols.downloadPdf')}
          </button>
        </div>
      </div>

      {/* ── Request Signatures Modal ── */}
      {showSignModal && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('protocols.requestSignatures')}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm" style={{ color: 'var(--lev-navy)' }}>
                {t('protocols.selectSigners')}
              </h3>
              <button
                onClick={() => setShowSignModal(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label={t('common.cancel')}
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                ✕
              </button>
            </div>
            <ul className="space-y-1.5 max-h-60 overflow-auto mb-4" role="list">
              {allUsers.map(u => {
                const checked = selectedSigners.includes(u.id)
                return (
                  <li key={u.id}>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" style={{ minHeight: '44px' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedSigners(prev =>
                            checked ? prev.filter(x => x !== u.id) : [...prev, u.id]
                          )
                        }
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-700">{u.fullName}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </label>
                  </li>
                )
              })}
              {allUsers.length === 0 && (
                <li className="text-xs text-gray-400 text-center py-4">
                  {t('protocols.noSignersAvailable')}
                </li>
              )}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSignModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm"
                style={{ minHeight: '44px' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRequestSignatures}
                disabled={requestingSign || selectedSigners.length === 0}
                className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
                style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
              >
                {requestingSign ? '...' : t('protocols.requestSignatures')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
