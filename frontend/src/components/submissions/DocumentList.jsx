/**
 * EthicFlow — DocumentList Component
 * Displays uploaded documents for a submission.
 * Allows upload (drag-and-drop or file picker) and delete for authorized users.
 * IS 5568 compliant, mobile-first, Lev palette.
 *
 * @param {string}   submissionId - Submission UUID
 * @param {boolean}  [canUpload]  - Whether the current user may upload / delete
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Image, FileSpreadsheet, Folder, Download, X, Paperclip } from 'lucide-react'
import api from '../../services/api'

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
 * DocumentList — upload area + file list for a submission.
 */
export default function DocumentList({ submissionId, canUpload = false }) {
  const { t } = useTranslation()

  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [uploading,setUploading]= useState(false)
  const [error,    setError]    = useState('')
  const [drag,     setDrag]     = useState(false)

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

  /** Opens the download URL in a new tab. @param {string} docId */
  function handleDownload(docId) {
    window.open(`/api/documents/${docId}/download`, '_blank', 'noopener,noreferrer')
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
                  {doc.uploadedBy && ` · ${doc.uploadedBy.fullName}`}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(doc.id)}
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
    </section>
  )
}
