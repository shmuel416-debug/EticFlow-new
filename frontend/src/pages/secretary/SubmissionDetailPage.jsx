/**
 * EthicFlow — Submission Detail Page (Secretary / Chairman / Admin)
 * Full submission view with form answers, comments, status transitions, and reviewer assignment.
 * Role-conditioned: secretary sees assign+transition, chairman sees decision buttons.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/submissions/StatusBadge'
import CommentThread from '../../components/submissions/CommentThread'
import StatusTransitionPanel from '../../components/submissions/StatusTransitionPanel'
import ReviewerSelect from '../../components/submissions/ReviewerSelect'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import DocumentList from '../../components/submissions/DocumentList'
import AiPanel from '../../components/submissions/AiPanel'

/**
 * Determines the back-link path based on user role.
 * @param {string} role
 * @returns {string}
 */
function backPath(role) {
  if (role === 'CHAIRMAN' || role === 'ADMIN') return '/chairman/queue'
  return '/secretary/submissions'
}

/**
 * Shared submission detail page for staff roles.
 */
export default function SubmissionDetailPage() {
  const { t }            = useTranslation()
  const { id }           = useParams()
  const { user }         = useAuth()
  const [submission,     setSubmission]     = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [transitioning,  setTransitioning]  = useState(false)
  const [assigningId,    setAssigningId]    = useState('')
  const [successMsg,     setSuccessMsg]     = useState('')
  const [pdfLoading,     setPdfLoading]     = useState(null)

  /**
   * Loads submission data from API.
   */
  const fetchSubmission = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/submissions/${id}`)
      setSubmission(data.submission)
      setAssigningId(data.submission.reviewerId ?? '')
    } catch {
      setError(t('submission.detail.loadError'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { fetchSubmission() }, [fetchSubmission])

  /**
   * Handles status transition action.
   * @param {string} newStatus
   */
  async function handleTransition(newStatus) {
    setTransitioning(true)
    setSuccessMsg('')
    try {
      await api.patch(`/submissions/${id}/status`, { status: newStatus })
      setSuccessMsg(t('submission.detail.statusUpdated'))
      await fetchSubmission()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setTransitioning(false)
    }
  }

  /**
   * Handles reviewer assignment.
   */
  async function handleAssign() {
    if (!assigningId) return
    setTransitioning(true)
    setSuccessMsg('')
    try {
      await api.patch(`/submissions/${id}/assign`, { reviewerId: assigningId })
      setSuccessMsg(t('submission.detail.reviewerAssigned'))
      await fetchSubmission()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setTransitioning(false)
    }
  }

  /**
   * Adds a comment via API.
   * @param {string} content
   * @param {boolean} isInternal
   */
  async function handleAddComment(content, isInternal) {
    await api.post(`/submissions/${id}/comments`, { content, isInternal })
    await fetchSubmission()
  }

  if (loading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>
  if (error && !submission) return <div className="p-8 text-center text-red-600" role="alert">{error}</div>

  const latestVersion = submission?.versions?.slice(-1)[0]
  const canAssign     = ['SECRETARY','ADMIN'].includes(user?.role) && ['IN_TRIAGE','ASSIGNED'].includes(submission?.status)

  /**
   * Generates and downloads the approval letter PDF.
   */
  async function handleDownloadPdf(lang) {
    setPdfLoading(lang)
    try {
      const response = await api.post(`/submissions/${id}/approval-letter?lang=${lang}`, {}, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href     = url
      link.download = `approval-letter-${lang}-${submission.applicationId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('statusPage.pdfError'))
    } finally {
      setPdfLoading(null)
    }
  }

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link to={backPath(user?.role)} className="text-sm hover:underline mb-2 inline-flex items-center gap-1"
          style={{ color: 'var(--lev-navy)' }}>
          ← {t('submission.detail.backToList')}
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>{submission?.title}</h1>
          <StatusBadge status={submission?.status} />
          <span className="text-sm text-gray-500 font-mono">{submission?.applicationId}</span>
        </div>
      </div>

      {successMsg && <p role="status" className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{successMsg}</p>}

      {/* Approval letter download — only when approved */}
      {submission?.status === 'APPROVED' && (
        <div className="w-full sm:w-auto flex gap-2">
          <button
            onClick={() => handleDownloadPdf('he')}
            disabled={pdfLoading !== null}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition disabled:opacity-60"
            style={{ background: 'var(--lev-teal-text)', minHeight: '44px' }}>
            {pdfLoading === 'he' ? t('common.loading') : `⬇ ${t('statusPage.downloadPdf')}`}
          </button>
          <button
            onClick={() => handleDownloadPdf('en')}
            disabled={pdfLoading !== null}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition disabled:opacity-60"
            style={{ background: '#374151', minHeight: '44px' }}>
            {pdfLoading === 'en' ? t('common.loading') : `⬇ ${t('statusPage.downloadPdfEn')}`}
          </button>
        </div>
      )}
      {error      && <p role="alert"  className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form answers — main column */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
            {t('submission.detail.sectionAnswers')}
          </h2>
          <FormAnswersViewer
            formConfig={submission?.formConfig}
            dataJson={latestVersion?.dataJson ?? {}}
          />
        </section>

        {/* Actions sidebar */}
        <aside className="space-y-5">
          {/* Status transitions */}
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>
              {t('submission.detail.sectionStatus')}
            </h2>
            <StatusTransitionPanel
              currentStatus={submission?.status}
              userRole={user?.role}
              onTransition={handleTransition}
              loading={transitioning}
            />
          </section>

          {/* Reviewer assignment */}
          {canAssign && (
            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>
                {t('submission.detail.sectionReviewer')}
              </h2>
              <ReviewerSelect
                value={assigningId}
                onChange={setAssigningId}
                disabled={transitioning}
              />
              <button
                onClick={handleAssign}
                data-testid="assign-reviewer-submit"
                disabled={transitioning || !assigningId}
                className="mt-3 w-full py-2 text-sm rounded-lg text-white disabled:opacity-50"
                style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
              >
                {t('submission.detail.assignReviewer')}
              </button>
            </section>
          )}

          {/* Current reviewer info */}
          {submission?.reviewer && (
            <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm">
              <p className="font-medium text-gray-700">{t('submission.detail.sectionReviewer')}</p>
              <p className="text-gray-600 mt-1">{submission.reviewer.fullName}</p>
              <p className="text-gray-400 text-xs">{submission.reviewer.email}</p>
            </section>
          )}

          {/* AI advisory panel */}
          <AiPanel submissionId={submission.id} canRun />
        </aside>
      </div>

      {/* Documents */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
          {t('documents.sectionTitle')}
        </h2>
        <DocumentList submissionId={submission.id} canUpload />
      </section>

      {/* Comments */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
          {t('submission.detail.sectionComments')}
        </h2>
        <CommentThread comments={submission?.comments ?? []} onAdd={handleAddComment} />
      </section>
    </main>
  )
}
