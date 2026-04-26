/**
 * EthicFlow — Switch primitive
 * role="switch" toggle (WCAG pattern). Min 44×44 touch target.
 */

import React, { forwardRef } from 'react'

/**
 * @param {object} props
 * @param {boolean} props.checked
 * @param {function} props.onChange
 * @param {string} [props.id]
 * @param {string} props['aria-label']
 */
const Switch = forwardRef(function Switch(
  { id, checked, onChange, disabled, className = '', 'aria-label': ariaLabel, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`inline-flex items-center justify-center shrink-0 border-0 bg-transparent p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ minWidth: 44, minHeight: 44 }}
      {...rest}
    >
      <span
        className="relative inline-flex rounded-full transition-colors"
        style={{
          width: 48,
          height: 28,
          alignItems: 'center',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          paddingInline: 3,
          background: checked ? 'var(--lev-navy)' : 'var(--border-strong)',
        }}
        aria-hidden="true"
      >
        <span
          className="rounded-full bg-white shadow-sm"
          style={{ width: 22, height: 22 }}
        />
      </span>
    </button>
  )
})

export default Switch
