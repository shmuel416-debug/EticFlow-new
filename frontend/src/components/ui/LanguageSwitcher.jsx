/**
 * EthicFlow — Language Switcher
 * Toggles between Hebrew (RTL) and English (LTR).
 * IS 5568: aria-label, aria-pressed, min 44px touch target.
 */

import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {{ className?: string }} props
 */
export default function LanguageSwitcher({ className = '' }) {
  const { i18n }         = useTranslation()
  const { changeLanguage } = useAuth()
  const lang             = i18n.language

  return (
    <div className={`flex gap-2 ${className}`} role="group" aria-label="בחירת שפה / Language">
      {[
        { code: 'he', label: 'עברית', display: 'עב' },
        { code: 'en', label: 'English', display: 'EN' },
      ].map(({ code, label, display }) => {
        const isActive = lang === code
        return (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            aria-label={label}
            aria-pressed={isActive}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              background: isActive ? 'var(--lev-navy)' : undefined,
              color: isActive ? 'white' : undefined,
            }}
            className={`px-3 rounded-lg text-xs font-semibold transition-colors ${
              isActive ? '' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {display}
          </button>
        )
      })}
    </div>
  )
}
