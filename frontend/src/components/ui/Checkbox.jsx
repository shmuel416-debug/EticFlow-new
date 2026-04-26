/**
 * EthicFlow — Checkbox primitive
 * Native input with Lev accent and minimum touch target on mobile.
 */

import React, { forwardRef } from 'react'

/**
 * @param {object} props
 * @param {string} [props.id]
 * @param {string} [props.label] - optional visible label (wraps input)
 */
const Checkbox = forwardRef(function Checkbox(
  { id, label, className = '', style, ...rest },
  ref
) {
  const input = (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className={`shrink-0 rounded border cursor-pointer ${className}`}
      style={{
        width: 20,
        height: 20,
        minWidth: 20,
        minHeight: 20,
        accentColor: 'var(--lev-navy)',
        borderColor: 'var(--border-strong)',
        ...style,
      }}
      {...rest}
    />
  )

  if (!label) return input

  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium"
      style={{ color: 'var(--text-primary)', minHeight: 44 }}
    >
      {input}
      <span>{label}</span>
    </label>
  )
})

export default Checkbox
