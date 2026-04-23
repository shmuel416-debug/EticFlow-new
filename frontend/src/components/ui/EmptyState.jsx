/**
 * EthicFlow — EmptyState primitive
 * Friendly empty/zero-data screen with optional CTA.
 */

import React from 'react'
import AccessibleIcon from './AccessibleIcon'
import { Inbox } from 'lucide-react'

/**
 * Empty-state block.
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - lucide icon
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] - CTA button
 * @returns {JSX.Element}
 */
export default function EmptyState({
  icon = Inbox,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`text-center py-12 px-6 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="inline-flex items-center justify-center mb-4"
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-full)',
          background: 'var(--lev-navy-50)',
          color: 'var(--lev-navy)',
        }}
      >
        <AccessibleIcon icon={icon} size={28} decorative />
      </div>
      <h3 className="text-base font-bold" style={{ color: 'var(--lev-navy)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mt-1.5 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4 inline-flex">{action}</div>}
    </div>
  )
}
