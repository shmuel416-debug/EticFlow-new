/**
 * EthicFlow — Select primitive
 * Native <select> wrapped with a consistent look and a ChevronDown affordance.
 */

import React from 'react'
import { ChevronDown } from 'lucide-react'

const Select = React.forwardRef(function Select(
  { invalid = false, children, className = '', style = {}, fullWidth = true, ...rest },
  ref
) {
  return (
    <span
      className={`inline-flex items-center gap-2 bg-white relative ${fullWidth ? 'w-full' : ''}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${invalid ? 'var(--status-danger)' : 'var(--border-default)'}`,
        padding: '0 12px',
        minHeight: 44,
        transition: 'border-color var(--motion-base)',
        ...style,
      }}
    >
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`flex-1 border-none outline-none bg-transparent text-sm appearance-none ${className}`}
        style={{
          padding: '10px 24px 10px 0',
          color: 'var(--text-primary)',
          backgroundImage: 'none',
        }}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        focusable="false"
        style={{ color: 'var(--text-muted)', pointerEvents: 'none', flexShrink: 0 }}
      />
    </span>
  )
})

export default Select
