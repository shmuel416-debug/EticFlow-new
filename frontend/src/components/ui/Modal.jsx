/**
 * EthicFlow — Modal primitive
 * Accessible modal dialog. Focus trap, Escape to close, aria-modal.
 * Use for confirmations, quick forms; keep full pages in routes.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import IconButton from './IconButton'

/**
 * Accessible modal.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title - required Hebrew title (SR announcement)
 * @param {string} [props.description]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @returns {JSX.Element|null}
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = 'סגור חלון',
}) {
  const dialogRef = useRef(null)

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose?.()
    }
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => {
      const focusTarget = dialogRef.current?.querySelector('[autofocus]') || dialogRef.current
      focusTarget?.focus?.()
    }, 30)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [open, handleKey])

  if (!open) return null

  const maxWidth = { sm: 420, md: 560, lg: 780 }[size] || 560

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'var(--surface-overlay)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lev-modal-title"
        aria-describedby={description ? 'lev-modal-desc' : undefined}
        tabIndex={-1}
        className="relative bg-white w-full flex flex-col"
        style={{
          maxWidth,
          maxHeight: '90vh',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="min-w-0">
            <h2 id="lev-modal-title" className="text-base font-bold" style={{ color: 'var(--lev-navy)' }}>
              {title}
            </h2>
            {description && (
              <p id="lev-modal-desc" className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            )}
          </div>
          <IconButton icon={X} label={closeLabel} onClick={onClose} />
        </div>
        <div className="px-5 py-4 overflow-auto">
          {children}
        </div>
        {footer && (
          <div
            className="px-5 py-3 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
