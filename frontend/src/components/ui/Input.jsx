/**
 * EthicFlow — Input primitive
 * Text / email / password / search input. Supports leading icon.
 * When invalid, aria-invalid and red border are applied.
 */

import React from 'react'
import AccessibleIcon from './AccessibleIcon'

/**
 * Accessible text input.
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - lucide icon on leading edge
 * @param {boolean} [props.invalid]
 * @param {boolean} [props.fullWidth=true]
 * @returns {JSX.Element}
 */
const Input = React.forwardRef(function Input(
  { icon, invalid = false, fullWidth = true, className = '', style = {}, dir, ...rest },
  ref
) {
  const borderColor = invalid ? 'var(--status-danger)' : 'var(--border-default)'
  return (
    <span
      className={`inline-flex items-center gap-2 bg-white ${fullWidth ? 'w-full' : ''}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${borderColor}`,
        padding: '0 12px',
        minHeight: 44,
        background: 'var(--surface-raised)',
        transition: 'border-color var(--motion-base), box-shadow var(--motion-base)',
        ...style,
      }}
    >
      {icon && (
        <AccessibleIcon
          icon={icon}
          size={18}
          decorative
          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
        />
      )}
      <input
        ref={ref}
        dir={dir}
        aria-invalid={invalid || undefined}
        className={`flex-1 border-none outline-none bg-transparent text-sm min-w-0 ${className}`}
        style={{ padding: '10px 0', color: 'var(--text-primary)' }}
        {...rest}
      />
    </span>
  )
})

export default Input
