/**
 * EthicFlow — FormField primitive
 * Accessible label + input wrapper with hint and error handling.
 * IS 5568: label↔input association, aria-required, aria-invalid,
 *          aria-describedby pointing to hint+error, role="alert" on error.
 */

import React, { useId } from 'react'

/**
 * Form field wrapper — pass a single child input via render-prop or `children`.
 * @param {object} props
 * @param {string} props.label - Hebrew label text
 * @param {boolean} [props.required]
 * @param {string} [props.hint] - help text shown below label
 * @param {string} [props.error] - error text; presence marks field invalid
 * @param {(ids:{inputId:string,hintId?:string,errorId?:string}) => React.ReactNode} [props.render]
 * @param {React.ReactNode} [props.children]
 * @returns {JSX.Element}
 */
export default function FormField({
  label,
  required = false,
  hint,
  error,
  render,
  children,
  className = '',
  htmlFor: htmlForProp,
}) {
  const autoId = useId()
  const inputId = htmlForProp || `fld-${autoId}`
  const hintId  = hint  ? `${inputId}-hint`  : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const content = render
    ? render({ inputId, hintId, errorId, describedBy, required, invalid: !!error })
    : children

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="text-sm font-semibold"
        style={{ color: 'var(--lev-navy)' }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--status-danger)', marginInlineStart: 4 }}>*</span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
      {content}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium"
          style={{ color: 'var(--status-danger)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
