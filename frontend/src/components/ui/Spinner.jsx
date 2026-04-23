/**
 * EthicFlow — Spinner
 * Small accessible loading indicator. role="status" + SR-only label.
 * Uses CSS animation; respects prefers-reduced-motion via index.css rule.
 */

import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Loading spinner with accessible label.
 * @param {{ size?: number, label?: string, className?: string }} props
 * @returns {JSX.Element}
 */
export default function Spinner({ size = 20, label = 'טוען', className = '' }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <Loader2
        size={size}
        strokeWidth={2}
        aria-hidden="true"
        focusable="false"
        style={{ animation: 'lev-spin 0.9s linear infinite' }}
      />
      <span className="lev-sr-only">{label}</span>
      <style>{`
        @keyframes lev-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  )
}
