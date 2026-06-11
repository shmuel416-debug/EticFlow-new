/**
 * Ethic-Net — useUnsavedChangesGuard hook
 * Blocks browser unload and prompts before programmatic in-app navigation.
 * @module hooks/useUnsavedChangesGuard
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Guards leaving the page when there are unsaved edits.
 * @param {{
 *   isBlocked: boolean,
 *   getExtraBlocked?: () => boolean,
 *   onSaveAndLeave?: () => Promise<boolean>,
 * }} options
 * @returns {{
 *   showDialog: boolean,
 *   requestNavigation: (path: string) => void,
 *   confirmLeave: () => void,
 *   cancelLeave: () => void,
 *   saveAndLeave: () => Promise<void>,
 *   isSavingLeave: boolean,
 * }}
 */
export default function useUnsavedChangesGuard({ isBlocked, getExtraBlocked, onSaveAndLeave }) {
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState(false)
  const [isSavingLeave, setIsSavingLeave] = useState(false)
  const pendingPathRef = useRef(null)

  useEffect(() => {
    const blocked = isBlocked || getExtraBlocked?.()
    if (!blocked) return undefined
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isBlocked, getExtraBlocked])

  /**
   * Navigates to path or opens confirm dialog when blocked.
   * @param {string} path
   */
  const requestNavigation = useCallback((path) => {
    const blocked = isBlocked || getExtraBlocked?.()
    if (!blocked) {
      navigate(path)
      return
    }
    pendingPathRef.current = path
    setShowDialog(true)
  }, [isBlocked, getExtraBlocked, navigate])

  const confirmLeave = useCallback(() => {
    const path = pendingPathRef.current
    pendingPathRef.current = null
    setShowDialog(false)
    if (path) navigate(path)
  }, [navigate])

  const cancelLeave = useCallback(() => {
    pendingPathRef.current = null
    setShowDialog(false)
  }, [])

  const saveAndLeave = useCallback(async () => {
    if (!onSaveAndLeave) {
      confirmLeave()
      return
    }
    setIsSavingLeave(true)
    try {
      const ok = await onSaveAndLeave()
      if (ok) confirmLeave()
    } finally {
      setIsSavingLeave(false)
    }
  }, [onSaveAndLeave, confirmLeave])

  return {
    showDialog,
    requestNavigation,
    confirmLeave,
    cancelLeave,
    saveAndLeave,
    isSavingLeave,
  }
}
