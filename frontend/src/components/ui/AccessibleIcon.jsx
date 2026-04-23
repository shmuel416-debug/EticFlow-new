/**
 * EthicFlow — AccessibleIcon
 * Wrapper that enforces IS 5568 accessibility rules:
 *   - If the icon is decorative, it must be marked aria-hidden.
 *   - If the icon has standalone meaning, it must carry an aria-label.
 * Always passes through className and remaining props to the lucide icon.
 */

import React from 'react'

/**
 * Accessible wrapper for a lucide icon.
 * @param {object} props
 * @param {React.ComponentType} props.icon - lucide icon component
 * @param {string} [props.label] - aria-label when icon carries meaning on its own
 * @param {boolean} [props.decorative=true] - whether to mark aria-hidden
 * @param {number} [props.size=18] - icon pixel size
 * @param {number} [props.strokeWidth=1.75] - stroke width
 * @param {string} [props.className] - extra CSS classes
 * @returns {JSX.Element}
 */
export default function AccessibleIcon({
  icon: Icon,
  label,
  /** When false and no label, still treated as decorative (dev-only warning). */
  decorative = true,
  size = 18,
  strokeWidth = 1.75,
  className = '',
  ...rest
}) {
  const hasLabel = typeof label === 'string' && label.length > 0
  if (import.meta.env.DEV && !hasLabel && !decorative) {
    console.warn('AccessibleIcon: pass label when decorative=false')
  }
  const ariaProps = hasLabel
    ? { 'aria-label': label, role: 'img' }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...ariaProps}
      {...rest}
    />
  )
}
