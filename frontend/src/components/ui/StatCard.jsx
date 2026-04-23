/**
 * EthicFlow — StatCard primitive
 * KPI card with large number and label. Optional tone + trend + icon.
 */

import React from 'react'
import AccessibleIcon from './AccessibleIcon'

const TONE_COLORS = {
  navy:    'var(--lev-navy)',
  gold:    'var(--lev-gold-600)',
  purple:  'var(--lev-purple)',
  teal:    'var(--lev-teal-text)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger:  'var(--status-danger)',
  muted:   'var(--text-muted)',
}

/**
 * KPI stat card for dashboards.
 * @param {object} props
 * @param {string|number} props.value - large number
 * @param {string} props.label - Hebrew label beneath
 * @param {keyof TONE_COLORS} [props.tone='navy']
 * @param {React.ComponentType} [props.icon] - lucide icon (decorative)
 * @param {string} [props.hint] - small extra text
 * @returns {JSX.Element}
 */
export default function StatCard({ value, label, tone = 'navy', icon, hint, className = '', ...rest }) {
  const color = TONE_COLORS[tone] || TONE_COLORS.navy
  return (
    <div
      className={`bg-white p-4 md:p-5 ${className}`}
      style={{
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-xs font-medium leading-tight"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </p>
          <p
            className="text-3xl md:text-4xl font-black mt-2 leading-none tabular-nums"
            style={{ color }}
          >
            {value}
          </p>
          {hint && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-sunken)',
              color,
            }}
          >
            <AccessibleIcon icon={icon} size={20} decorative />
          </div>
        )}
      </div>
    </div>
  )
}
