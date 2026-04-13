/**
 * EthicFlow — CommentThread Component
 * Renders a list of comments and a form to add new ones.
 * Internal comments shown only to non-researcher roles.
 * IS 5568: role="log", aria-live="polite", form semantics.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

/**
 * Formats an ISO date string to locale date + time.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Renders a single comment item.
 * @param {{ comment: object }} props
 */
function CommentItem({ comment: c }) {
  const { t } = useTranslation()
  return (
    <article className={`p-3 rounded-lg border text-sm ${c.isInternal ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
      <header className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="font-semibold" style={{ color: 'var(--lev-navy)' }}>{c.author?.fullName}</span>
        {c.isInternal && (
          <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
            {t('submission.detail.internalLabel')}
          </span>
        )}
        <time className="text-xs text-gray-500 ms-auto" dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
      </header>
      <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
    </article>
  )
}

/**
 * Renders the add-comment form.
 * @param {{ onSubmit: Function, canMarkInternal: boolean }} props
 */
function AddCommentForm({ onSubmit, canMarkInternal }) {
  const { t }  = useTranslation()
  const [content, setContent]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  /**
   * Handles form submission.
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true); setError('')
    try {
      await onSubmit(content.trim(), isInternal)
      setContent(''); setIsInternal(false)
    } catch { setError(t('errors.SERVER_ERROR')) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <label htmlFor="comment-input" className="block text-sm font-medium text-gray-700">
        {t('submission.detail.addComment')}
      </label>
      <textarea id="comment-input" value={content} onChange={(e) => setContent(e.target.value)}
        placeholder={t('submission.detail.commentPlaceholder')} rows={3} aria-required="true"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none" />
      {canMarkInternal && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-4 h-4" />
          {t('submission.detail.internalLabel')}
        </label>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={saving || !content.trim()}
        className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
        style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
        {saving ? t('common.loading') : t('submission.detail.submitComment')}
      </button>
    </form>
  )
}

/**
 * Renders a threaded list of comments with optional add-comment form.
 * @param {{ comments: Array, onAdd: ((content: string, isInternal: boolean) => Promise<void>)|null }} props
 */
export default function CommentThread({ comments = [], onAdd }) {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const canMarkInternal = user?.role !== 'RESEARCHER'

  return (
    <div className="space-y-4">
      <div role="log" aria-live="polite" aria-label={t('submission.detail.sectionComments')}
        className="space-y-3 max-h-80 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">—</p>
        )}
        {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
      </div>
      {onAdd && <AddCommentForm onSubmit={onAdd} canMarkInternal={canMarkInternal} />}
    </div>
  )
}
