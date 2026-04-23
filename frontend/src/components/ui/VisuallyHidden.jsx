/**
 * EthicFlow — VisuallyHidden
 * Renders content that is not visible but announced by screen readers.
 * IS 5568 / WCAG — use for labels that would be redundant visually but
 * are required for SR users (e.g. "פתח תפריט" on a hamburger).
 */

import React from 'react'

/**
 * Visually hidden text for screen readers only.
 * @param {{children: React.ReactNode, as?: keyof JSX.IntrinsicElements}} props
 * @returns {JSX.Element}
 */
export default function VisuallyHidden({ children, as: Tag = 'span' }) {
  return <Tag className="lev-sr-only">{children}</Tag>
}
