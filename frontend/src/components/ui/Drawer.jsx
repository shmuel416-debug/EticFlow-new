/**
 * EthicFlow — Drawer primitive
 * Overlay panel from logical start/end (RTL-aware). Escape closes.
 * Use for mobile navigation or filters; z-index uses --z-drawer.
 */

import { useEffect } from 'react'

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {'start'|'end'} [props.side='end'] - inline placement (end = sidebar side in RTL)
 * @param {string} [props.title] - aria-label for dialog
 * @param {React.ReactNode} props.children
 * @param {string} [props.id]
 */
export default function Drawer({
  open,
  onClose,
  side = 'end',
  title,
  children,
  id,
  className = '',
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const sideStyle =
    side === 'end'
      ? { insetInlineEnd: 0 }
      : { insetInlineStart: 0 }

  return (
    <div className="fixed inset-0 md:hidden" style={{ zIndex: 'var(--z-drawer)' }}>
      <div
        role="presentation"
        className="absolute inset-0"
        style={{ background: 'var(--surface-overlay)' }}
        onClick={onClose}
      />
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 bottom-0 flex flex-col bg-white shadow-lg overflow-auto ${className}`}
        style={{
          ...sideStyle,
          width: 'min(100vw - 48px, 280px)',
          maxWidth: '100vw',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
