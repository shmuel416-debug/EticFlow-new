/**
 * Ethic-Net — useDocumentTitle Hook
 * Sets document.title for the active route and refreshes on language change.
 */

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { buildDocumentTitle } from '../utils/documentTitle'

/**
 * Updates the browser tab title while the component is mounted.
 * @param {string|null|undefined} pageTitle - Page-specific segment (without site suffix)
 * @returns {void}
 */
export default function useDocumentTitle(pageTitle) {
  const { i18n } = useTranslation()

  useEffect(() => {
    const apply = () => {
      document.title = buildDocumentTitle(pageTitle)
    }

    apply()
    i18n.on('languageChanged', apply)
    return () => {
      i18n.off('languageChanged', apply)
    }
  }, [pageTitle, i18n])
}
