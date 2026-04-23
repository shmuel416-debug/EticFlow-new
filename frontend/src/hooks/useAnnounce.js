/**
 * EthicFlow — useAnnounce hook
 * Imperatively announces a message to screen readers via an aria-live region.
 * Mount <AnnounceRegion /> once at the app root. The hook writes text to it.
 *
 * Usage:
 *   const announce = useAnnounce()
 *   announce('הבקשה נשלחה בהצלחה')        // polite (default)
 *   announce('שגיאה בטעינה', 'assertive') // assertive
 */

import { useCallback } from 'react'

export const LIVE_ID = 'ethicflow-live-region'
export const ASSERTIVE_ID = 'ethicflow-live-region-assertive'

/**
 * Returns a function that announces a message to SR users.
 * @returns {(message: string, priority?: 'polite'|'assertive') => void}
 */
export function useAnnounce() {
  return useCallback((message, priority = 'polite') => {
    if (typeof document === 'undefined' || !message) return
    const id = priority === 'assertive' ? ASSERTIVE_ID : LIVE_ID
    const node = document.getElementById(id)
    if (!node) return
    node.textContent = ''
    window.setTimeout(() => { node.textContent = message }, 30)
  }, [])
}
