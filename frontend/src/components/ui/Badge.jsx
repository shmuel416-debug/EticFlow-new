/**
 * EthicFlow — Badge primitive
 * Soft-pill badge. Tone controls color scheme (tint bg + strong text).
 * Use for status, counts, labels.
 */

import React from 'react'

const TONE_STYLES = {
  neutral: { bg: '#F3F4F6', color: '#374151' },
  navy:    { bg: 'var(--lev-navy-50)',      color: 'var(--lev-navy)' },
  teal:    { bg: 'var(--lev-teal-50)',      color: 'var(--lev-teal-text)' },
  purple:  { bg: 'var(--lev-purple-50)',    color: 'var(--lev-purple)' },
  gold:    { bg: 'var(--lev-gold-50)',      color: 'var(--lev-gold-600)' },
  success: { bg: 'var(--status-success-50)', color: 'var(--status-success)' },
  warning: { bg: 'var(--status-warning-50)', color: 'var(--status-warning)' },
  danger:  { bg: 'var(--status-danger-50)',  color: 'var(--status-danger)' },
  info:    { bg: 'var(--status-info-50)',    color: 'var(--status-info)' },
}

const SIZE_STYLES = {
  sm: { padding: '2px 8px',  fontSize: 11, lineHeight: 1.4 },
  md: { padding: '3px 10px', fontSize: 12, lineHeight: 1.4 },
  lg: { padding: '4px 12px', fontSize: 13, lineHeight: 1.4 },
}

/**
 * Soft-pill badge.
 * @param {object} props
 * @param {'neutral'|'navy'|'teal'|'purple'|'gold'|'success'|'warning'|'danger'|'info'} [props.tone='neutral']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export default function Badge({ tone = 'neutral', size = 'md', className = '', children, ...rest }) {
  const t = TONE_STYLES[tone] || TONE_STYLES.neutral
  const s = SIZE_STYLES[size] || SIZE_STYLES.md
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${className}`}
      style={{
        background: t.bg,
        color: t.color,
        borderRadius: 'var(--radius-full)',
        ...s,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}
