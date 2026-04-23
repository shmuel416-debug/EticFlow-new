/**
 * EthicFlow — Button primitive
 * Variants: primary (navy) | gold (accent CTA) | secondary (outline) |
 *           ghost | danger | subtle.
 * Sizes: sm | md | lg. Full-width optional.
 * A11y: native <button>, min 44×44 via size, focus-visible handled globally,
 *       aria-busy + spinner swap when loading.
 */

import React from 'react'
import Spinner from './Spinner'

const VARIANT_STYLES = {
  primary: {
    background: 'var(--lev-navy)',
    color: '#fff',
    border: '1px solid var(--lev-navy)',
  },
  gold: {
    background: 'var(--lev-gold)',
    color: 'var(--lev-navy)',
    border: '1px solid var(--lev-gold)',
    fontWeight: 700,
  },
  secondary: {
    background: '#fff',
    color: 'var(--lev-navy)',
    border: '1px solid var(--border-default)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--lev-navy)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--status-danger)',
    color: '#fff',
    border: '1px solid var(--status-danger)',
  },
  subtle: {
    background: 'var(--lev-navy-50)',
    color: 'var(--lev-navy)',
    border: '1px solid transparent',
  },
}

const SIZE_STYLES = {
  sm: { minHeight: 36, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-lg)' },
  md: { minHeight: 44, padding: '0 16px', fontSize: 14, borderRadius: 'var(--radius-xl)' },
  lg: { minHeight: 52, padding: '0 22px', fontSize: 16, borderRadius: 'var(--radius-xl)' },
}

/**
 * Primary button primitive.
 * @param {object} props
 * @param {'primary'|'gold'|'secondary'|'ghost'|'danger'|'subtle'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullWidth]
 * @param {boolean} [props.loading]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary
  const s = SIZE_STYLES[size] || SIZE_STYLES.md
  const isDisabled = disabled || loading
  const focusClass = variant === 'gold' ? 'lev-gold-focus' : ''

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition
        disabled:opacity-60 disabled:cursor-not-allowed select-none ${focusClass} ${className}`}
      style={{
        ...v,
        ...s,
        width: fullWidth ? '100%' : undefined,
        transitionProperty: 'opacity, background-color, box-shadow, transform',
        transitionDuration: 'var(--motion-base)',
      }}
      {...rest}
    >
      {loading ? <Spinner size={16} label="טוען" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
}
