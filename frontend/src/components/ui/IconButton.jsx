/**
 * EticFlow — IconButton primitive
 * Icon-only button; aria-label is REQUIRED (enforced at runtime via warning).
 * Guarantees 44×44 minimum touch target (IS 5568 / WCAG 2.2).
 */

import React from 'react'
import AccessibleIcon from './AccessibleIcon'

const VARIANT_STYLES = {
  ghost:   { background: 'transparent', color: 'var(--text-secondary)' },
  subtle:  { background: 'var(--lev-navy-50)', color: 'var(--lev-navy)' },
  primary: { background: 'var(--lev-navy)',    color: '#fff' },
}

/**
 * Accessible icon-only button (44×44 min).
 * @param {object} props
 * @param {React.ComponentType} props.icon - lucide icon component
 * @param {string} props.label - REQUIRED aria-label in Hebrew
 * @param {'ghost'|'subtle'|'primary'} [props.variant='ghost']
 * @param {number} [props.size=20] - icon size in px
 * @returns {JSX.Element}
 */
export default function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 20,
  className = '',
  type = 'button',
  ...rest
}) {
  if (!label && import.meta.env.DEV) {
    console.warn('IconButton: missing required "label" prop (aria-label)')
  }
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.ghost
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg transition
        hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        minWidth: 44,
        minHeight: 44,
        ...v,
        transitionProperty: 'background-color, color',
        transitionDuration: 'var(--motion-base)',
      }}
      {...rest}
    >
      <AccessibleIcon icon={icon} size={size} decorative />
    </button>
  )
}
