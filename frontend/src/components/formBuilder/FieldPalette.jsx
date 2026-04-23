/**
 * EthicFlow — FieldPalette
 * Grid of available field types grouped by category.
 * Click → adds field to canvas. Keyboard: Enter/Space also triggers.
 * @module components/formBuilder/FieldPalette
 */

import { useTranslation } from 'react-i18next'
import { FIELD_CATEGORIES } from './fieldTypes'

/**
 * Renders the field-type palette grouped into categories.
 * @param {{ onAdd: (type: string) => void }} props
 */
export default function FieldPalette({ onAdd }) {
  const { t } = useTranslation()

  /**
   * Handles keyboard activation of palette items (Enter / Space).
   * @param {React.KeyboardEvent} e
   * @param {string} type
   */
  function handleKeyDown(e, type) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onAdd(type)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
      {/* Search — decorative for now, filtering wired in Sprint 3 */}
      <div className="mb-3">
        <label htmlFor="field-search" className="sr-only">{t('secretary.formBuilder.fieldSearch')}</label>
        <input
          id="field-search"
          type="search"
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
          style={{ '--tw-ring-color': 'var(--lev-teal)', borderColor: '' }}
          onFocus={e => (e.target.style.borderColor = 'var(--lev-teal)')}
          onBlur={e  => (e.target.style.borderColor = '')}
          placeholder={t('secretary.formBuilder.fieldSearch')}
          aria-label={t('secretary.formBuilder.fieldSearch')}
        />
      </div>

      {FIELD_CATEGORIES.map(category => (
        <div key={category.key} className="mb-4">
          <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--lev-teal-text)' }}>
            {t(category.i18nKey)}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {category.items.map(({ type, Icon }) => (
              <button
                key={type}
                type="button"
                role="button"
                tabIndex={0}
                aria-label={t('secretary.formBuilder.addFieldAriaLabel', { type: t(`secretary.fieldTypes.${type}`) })}
                onClick={() => onAdd(type)}
                onKeyDown={e => handleKeyDown(e, type)}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border
                  border-gray-200 bg-white text-center text-xs text-gray-600 cursor-pointer
                  transition-all hover:border-[var(--lev-navy)] hover:bg-[var(--lev-navy-50)]
                  hover:text-[var(--lev-navy)] active:scale-95 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-[var(--lev-navy)]"
                style={{ minHeight: '64px' }}
              >
                <Icon
                  size={20}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                  className="flex-shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <span>{t(`secretary.fieldTypes.${type}`)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
