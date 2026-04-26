/**
 * EthicFlow — Label primitive
 * Associates visible text with a control via htmlFor (IS 5568: explicit labels).
 */

import React from 'react'

/**
 * @param {object} props
 * @param {string} props.htmlFor - id of the labelled control
 * @param {boolean} [props.required] - shows asterisk (decorative; use aria-required on input too)
 * @param {React.ReactNode} props.children
 */
export default function Label({ htmlFor, required, children, className = '', ...rest }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-semibold ${className}`}
      style={{ color: 'var(--text-primary)' }}
      {...rest}
    >
      {children}
      {required && (
        <span className="text-[var(--status-danger)] ms-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}
