/**
 * EthicFlow — Card primitive
 * White surface with soft shadow + thin border, consistent rounded corners.
 * Compose with CardHeader / CardBody / CardFooter subcomponents.
 */

import React from 'react'

/**
 * Container card.
 * @param {object} props
 * @param {'flat'|'raised'} [props.elevation='raised']
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export default function Card({
  elevation = 'raised',
  className = '',
  children,
  as: Tag = 'section',
  ...rest
}) {
  return (
    <Tag
      className={`bg-white overflow-hidden ${className}`}
      style={{
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--border-default)',
        boxShadow: elevation === 'raised' ? 'var(--shadow-sm)' : 'none',
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Header section for a Card.
 */
export function CardHeader({ title, subtitle, actions, className = '', children }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 px-5 py-4 ${className}`}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="min-w-0">
        {title && (
          <h2 className="text-base font-bold truncate" style={{ color: 'var(--lev-navy)' }}>
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

/**
 * Body section for a Card. Adds consistent padding.
 */
export function CardBody({ className = '', children, padded = true }) {
  return (
    <div className={`${padded ? 'p-5' : ''} ${className}`}>{children}</div>
  )
}

/**
 * Footer section for a Card.
 */
export function CardFooter({ className = '', children }) {
  return (
    <div
      className={`px-5 py-3 flex items-center justify-between gap-3 ${className}`}
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--surface-sunken)',
      }}
    >
      {children}
    </div>
  )
}
