/**
 * EthicFlow — PageHeader primitive
 * Standard page title block for protected pages.
 *   - Right-aligned title + subtitle (RTL start)
 *   - Left-aligned action slot (CTAs, filters)
 *   - Thin 3px brand gradient strip beneath
 *   - Optional back-link (ArrowRight in RTL, ArrowLeft in LTR)
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowLeft } from 'lucide-react'

/**
 * Consistent page header with brand accent strip.
 * @param {object} props
 * @param {string} props.title - Hebrew page title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.actions] - CTA slot on the end (LTR side)
 * @param {string} [props.backTo] - optional path for a "back" link
 * @param {string} [props.backLabel] - aria-label/text for back link
 * @returns {JSX.Element}
 */
export default function PageHeader({ title, subtitle, actions, backTo, backLabel, className = '' }) {
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  return (
    <header className={`mb-4 ${className}`}>
      <div className="flex flex-col gap-3 min-[600px]:flex-row min-[600px]:items-start min-[600px]:justify-between min-[600px]:gap-4 w-full min-w-0">
        <div className="min-w-0 flex items-center gap-2 sm:gap-3 max-w-full">
          {backTo && (
            <Link
              to={backTo}
              aria-label={backLabel || (isRtl ? 'חזרה' : 'Back')}
              className="inline-flex shrink-0 items-center justify-center rounded-lg transition hover:bg-gray-100"
              style={{ minWidth: 40, minHeight: 40, color: 'var(--text-secondary)' }}
            >
              <BackIcon size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
            </Link>
          )}
          <div className="min-w-0">
            <h1
              className="text-xl md:text-2xl font-bold break-words [overflow-wrap:anywhere] min-[600px]:truncate"
              style={{ color: 'var(--lev-navy)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm mt-0.5 break-words" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-stretch min-[400px]:items-center gap-2 min-w-0 w-full min-[600px]:w-auto min-[600px]:shrink-0 min-[600px]:max-w-full min-[600px]:justify-end">
            {actions}
          </div>
        )}
      </div>
      <div className="lev-accent-strip mt-3" aria-hidden="true" />
    </header>
  )
}
