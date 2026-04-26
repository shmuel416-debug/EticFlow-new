/**
 * EthicFlow — MobileStickyBar
 * Fixed bottom action area on small screens; hidden from md up.
 * Respects safe-area-inset-bottom (iOS). Parent page should add bottom padding on mobile.
 */

import React from 'react'

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function MobileStickyBar({ children, className = '' }) {
  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 ${className}`}
      style={{
        zIndex: 'var(--z-sticky)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        background: 'var(--surface-raised)',
        borderTop: '1px solid var(--border-default)',
        boxShadow: '0 -4px 12px rgba(30, 42, 114, 0.08)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2 p-3">{children}</div>
    </div>
  )
}
