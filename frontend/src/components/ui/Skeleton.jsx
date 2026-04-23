/**
 * EthicFlow — Skeleton placeholder
 * Loading shimmer bar. Use `width/height` or pass as a child container.
 */

import React from 'react'

/**
 * Shimmer placeholder bar.
 * @param {object} props
 * @param {number|string} [props.width='100%']
 * @param {number|string} [props.height=14]
 * @param {string} [props.radius='var(--radius-md)']
 * @returns {JSX.Element}
 */
export default function Skeleton({
  width = '100%',
  height = 14,
  radius = 'var(--radius-md)',
  className = '',
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, #EEF0F5 0%, #F6F7FB 50%, #EEF0F5 100%)',
        backgroundSize: '200% 100%',
        animation: 'lev-skel 1.4s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes lev-skel {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </span>
  )
}
