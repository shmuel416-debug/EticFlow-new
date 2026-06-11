/**
 * Ethic-Net — useFormAutoSave hook
 * Debounced auto-save for Form Builder draft forms.
 * @module hooks/useFormAutoSave
 */

import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 2000

/**
 * Triggers saveFn after debounce when form is dirty and saveable.
 * @param {{
 *   isDirty: boolean,
 *   enabled: boolean,
 *   canSave: boolean,
 *   saveFn: () => Promise<boolean>,
 * }} options
 * @returns {{ saveStatus: 'idle'|'saving'|'saved'|'error', resetStatus: () => void }}
 */
export default function useFormAutoSave({ isDirty, enabled, canSave, saveFn }) {
  const [saveStatus, setSaveStatus] = useState('idle')
  const saveFnRef = useRef(saveFn)
  const timerRef = useRef(null)

  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  useEffect(() => {
    if (!enabled || !isDirty || !canSave) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return undefined
    }

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        const ok = await saveFnRef.current()
        setSaveStatus(ok ? 'saved' : 'error')
      } catch {
        setSaveStatus('error')
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDirty, enabled, canSave, saveFn])

  const resetStatus = () => setSaveStatus('idle')

  return { saveStatus, resetStatus }
}
