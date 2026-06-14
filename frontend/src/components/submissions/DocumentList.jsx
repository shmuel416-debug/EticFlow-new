/**
 * Ethic-Net — DocumentList Component
 * Displays researcher-uploaded documents for a submission (not system-generated letters).
 * Allows upload (drag-and-drop or file picker) and delete for authorized users.
 * IS 5568 compliant, mobile-first, Lev palette.
 *
 * @param {string}   submissionId - Submission UUID
 * @param {boolean}  [canUpload]  - Whether the current user may upload / delete
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Image, FileSpreadsheet, Folder, Download, X, Paperclip, Eye } from 'lucide-react'
import api from '../../services/api'
import { getUserDisplayName } from '../../utils/userDisplayName'
import Modal from '../ui/Modal'

/** Allowed extensions for the file picker (informational only — server enforces). */
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx'

/** Human-readable file size. @param {number} bytes @returns {string} */
function fmtSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Monochrome MIME-type glyph (decorative).
 * @param {{ mime: string }} props
 * @returns {JSX.Element}
 */
function MimeGlyph({ mime }) {
  let Icon = Folder
  if (mime === 'application/pdf') Icon = FileText
  else if (mime?.startsWith('image/')) Icon = Image
  else if (mime?.includes('word')) Icon = FileText
  else if (mime?.includes('spreadsheet') || mime?.includes('excel')) Icon = FileSpreadsheet
  return (
    <Icon
      size={22}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      className="flex-shrink-0"
      style={{ color: 'var(--lev-navy)' }}
    />
  )
}

/**
 * Returns whether a MIME type is natively previewable in-browser.
 * @param {string} mime
 * @returns {boolean}
 */
function canInlinePreview(mime) {
  if (!mime) return false
  return (
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    mime.startsWith('text/')
  )
}

/**
 * DocumentList — upload area + file list for a submission.
 */
export default function DocumentList({ submissionId, canUpload = false }) {
  const { t, i18n } = useTranslation()

  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [uploading,setUploading]= useState(false)
  const [error,    setError]    = useState('')
  const [drag,     setDrag]     = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const inputRef = useRef(null)

  /** Fetches document list from API. */
  const loadDocs = useCallback(async () => {
    try {
      const { data } = await api.get(`/documents/submissions/${submissionId}`)
      setDocs(data.data)
    } catch {
      setError(t('documents.loadError'))
    } finally {
      setLoading(false)
    }
  }, [submissionId, t])

  useEffect(() => { loadDocs() }, [loadDocs])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  /**
   * Fetches document bytes with JWT auth (iframe/window.open cannot send Authorization).
   * @param {string} docId
   * @param {'preview'|'download'} mode
   * @returns {Promise<Blob>}
   */
  /**
   * Parses API error code from a blob error response.
   * @param {unknown} err
   * @returns {Promise<string>}
   */
  async function parseBlobErrorCode(err) {
    const blob = err?.response?.data
    if (!(blob instanceof Blob)) return err?.response?.data?.code || err?.code || ''
    try {
      const text = await blob.text()
      const parsed = JSON.parse(text)
      return parsed?.code || parsed?.error?.code || ''
    } catch {
      return ''
    }
  }

  async function fetchDocumentBlob(docId, mode) {
    const endpoint = mode === 'preview' ? 'preview' : 'download'
    try {
      const { data } = await api.get(`/documents/${docId}/${endpoint}`, {
        responseType: 'blob',
        timeout: 60000,
      })
      return data
    } catch (err) {
      const code = await parseBlobErrorCode(err)
      throw new Error(code || 'GENERIC')
    }
  }

  /**
   * Uploads selected files to the server.
   * @param {FileList} files
   */
  async function handleUpload(files) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      Array.from(files).forEach(f => form.append('files', f))
      await api.post(`/documents/submissions/${submissionId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadDocs()
    } catch (err) {
      const code = err?.response?.data?.code
      setError(t(`documents.uploadError.${code}`, { defaultValue: t('documents.uploadError.generic') }))
    } finally {
      setUploading(false)
    }
  }

  /**
   * Soft-deletes a document.
   * @param {string} docId
   */
  async function handleDelete(docId) {
    if (!window.confirm(t('documents.confirmDelete'))) return
    try {
      await api.delete(`/documents/${docId}`)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {
      setError(t('documents.deleteError'))
    }
  }

  /**
   * Downloads a document via authenticated blob fetch.
   * @param {object} doc
   */
  async function handleDownload(doc) {
    try {
      const blob = await fetchDocumentBlob(doc.id, 'download')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.originalName || doc.filename || 'document'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      const code = err?.message
      setError(t(`documents.previewError.${code}`, { defaultValue: t('documents.loadError') }))
    }
  }

  /**
   * Opens an inline preview modal for a selected document.
   * @param {object} doc
   */
  async function handlePreview(doc) {
    setPreviewDoc(doc)
    setPreviewLoading(true)
    setError('')
    try {
      const blob = await fetchDocumentBlob(doc.id, 'preview')
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (err) {
      setPreviewDoc(null)
      const code = err?.message
      setError(t(`documents.previewError.${code}`, { defaultValue: t('documents.previewError.generic') }))
    } finally {
      setPreviewLoading(false)
    }
  }

  /** Closes document preview modal and revokes blob URL. */
  function closePreview() {
    setPreviewDoc(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
  }

  // ─── Drag-and-drop handlers ───────────────────
  function onDragOver(e) {
    e.preventDefault()
    if (canUpload) setDrag(true)
  }
  function onDragLeave() { setDrag(false) }
  function onDrop(e) {
    e.preventDefault()
    setDrag(false)
    if (canUpload) handleUpload(e.dataTransfer.files)
  }

  // ─── Render ───────────────────────────────────

  return (
    <section aria-label={t('documents.sectionLabel')}>

      {/* Upload drop zone */}
      {canUpload && (
        <div
          role="button"
          tabIndex={0}
          aria-label={t('documents.dropZoneLabel')}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
            drag
              ? 'border-[var(--lev-teal)] bg-[var(--lev-teal-50)]'
              : 'border-gray-200 hover:border-[var(--lev-teal)] bg-gray-50'
          }`}>
          <Paperclip
            className="mx-auto mb-1"
            size={28}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
            style={{ color: 'var(--lev-navy)' }}
          />
          <p className="text-sm font-medium text-gray-700">{t('documents.dropZoneTitle')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('documents.dropZoneHint')}</p>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            aria-label={t('documents.fileInputLabel')}
            onChange={e => handleUpload(e.target.files)}
          />
        </div>
      )}

      {/* Uploading spinner */}
      {uploading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm mb-3"
          style={{ color: 'var(--lev-teal-text)' }}
        >
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75"/>
          </svg>
          {t('documents.uploading')}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('common.loading')}</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">{t('documents.empty')}</p>
      ) : (
        <ul className="space-y-2" aria-label={t('documents.listLabel')}>
          {docs.map(doc => (
            <li key={doc.id}
              className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <MimeGlyph mime={doc.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={doc.originalName}>
                  {doc.originalName}
                </p>
                <p className="text-xs text-gray-400">
                  {fmtSize(doc.sizeBytes)}
                  {doc.uploadedBy && ` · ${getUserDisplayName(doc.uploadedBy, i18n.language)}`}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handlePreview(doc)}
                  aria-label={t('documents.previewLabel', { name: doc.originalName })}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition
                    hover:bg-[var(--lev-teal-50)]"
                  style={{ color: 'var(--lev-navy)' }}
                >
                  <Eye size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  aria-label={t('documents.downloadLabel', { name: doc.originalName })}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition
                    hover:bg-[var(--lev-teal-50)]"
                  style={{ color: 'var(--lev-teal-text)' }}
                >
                  <Download size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </button>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    aria-label={t('documents.deleteLabel', { name: doc.originalName })}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition
                      hover:bg-[var(--status-danger-50)]"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    <X size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(previewDoc)}
        onClose={closePreview}
        title={t('documents.previewTitle')}
        description={previewDoc?.originalName || ''}
        size="lg"
        closeLabel={t('documents.closePreviewLabel')}
      >
        {previewDoc && (
          <div className="space-y-3">
            {previewLoading ? (
              <p className="text-sm text-center py-8 text-gray-500">{t('common.loading')}</p>
            ) : canInlinePreview(previewDoc.mimeType) && previewUrl ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                {previewDoc.mimeType.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={previewDoc.originalName}
                    className="w-full max-h-[65vh] object-contain mx-auto"
                  />
                ) : (
                  <iframe
                    title={t('documents.previewFrameLabel', { name: previewDoc.originalName })}
                    src={previewUrl}
                    className="w-full h-[65vh]"
                  />
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  {t('documents.previewUnsupported')}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="min-h-[44px] px-4 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--lev-teal)' }}
                  >
                    {t('documents.downloadFallback')}
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {t('documents.previewHint')}
            </p>
          </div>
        )}
      </Modal>
    </section>
  )
}
