/**
 * EthicFlow — Textarea primitive
 */

import React from 'react'

const Textarea = React.forwardRef(function Textarea(
  { invalid = false, rows = 4, className = '', style = {}, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`w-full bg-white text-sm leading-relaxed outline-none ${className}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${invalid ? 'var(--status-danger)' : 'var(--border-default)'}`,
        padding: '10px 12px',
        color: 'var(--text-primary)',
        resize: 'vertical',
        transition: 'border-color var(--motion-base)',
        ...style,
      }}
      {...rest}
    />
  )
})

export default Textarea
