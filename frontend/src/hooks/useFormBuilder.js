/**
 * EthicFlow — useFormBuilder hook
 * Manages all Form Builder state: fields list, selection, dirty flag, active tab.
 * Designed for use in FormBuilderPage only.
 * @module hooks/useFormBuilder
 */

import { useState, useCallback } from 'react'
import { arrayMove }              from '@dnd-kit/sortable'
import { createField }            from '../components/formBuilder/fieldTypes'

/**
 * Central state and action handlers for the Form Builder.
 * @param {string} [initialName=''] - initial form name
 * @returns {object} state + handlers
 */
export default function useFormBuilder(initialName = '', initialNameEn = '') {
  const [formName,    setFormName]    = useState(initialName)
  const [formNameEn,  setFormNameEn]  = useState(initialNameEn)
  const [fields,      setFields]      = useState([])
  const [selectedId,  setSelectedId]  = useState(null)
  const [activeTab,   setActiveTab]   = useState('palette') // 'palette' | 'settings'
  const [mobileTab,   setMobileTab]   = useState('fields')  // 'fields' | 'canvas' | 'settings'
  const [isDirty,     setIsDirty]     = useState(false)
  const [previewLang, setPreviewLang] = useState('he')

  const selectedField = fields.find(f => f.id === selectedId) ?? null

  /** Add a new field from the palette → auto-select + open settings */
  const addField = useCallback((type) => {
    const field = createField(type)
    setFields(prev => [...prev, field])
    setSelectedId(field.id)
    setActiveTab('settings')
    setMobileTab('settings')
    setIsDirty(true)
  }, [])

  /** Remove a field by id */
  const removeField = useCallback((id) => {
    setFields(prev => prev.filter(f => f.id !== id))
    setSelectedId(prev => (prev === id ? null : prev))
    setIsDirty(true)
  }, [])

  /** Clone a field and insert it after the original */
  const duplicateField = useCallback((id) => {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === id)
      if (idx === -1) return prev
      const clone = { ...prev[idx], id: Math.random().toString(36).slice(2, 10) }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
    setIsDirty(true)
  }, [])

  /** Select a field → switch left panel to settings tab */
  const selectField = useCallback((id) => {
    setSelectedId(id)
    setActiveTab('settings')
    setMobileTab('settings')
  }, [])

  /** Patch an existing field's properties */
  const updateField = useCallback((id, updates) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    setIsDirty(true)
  }, [])

  /** Reorder: called from DndContext.onDragEnd with active/over ids */
  const reorderFields = useCallback((activeId, overId) => {
    setFields(prev => {
      const oldIdx = prev.findIndex(f => f.id === activeId)
      const newIdx = prev.findIndex(f => f.id === overId)
      return arrayMove(prev, oldIdx, newIdx)
    })
    setIsDirty(true)
  }, [])

  return {
    formName,    setFormName,
    formNameEn,  setFormNameEn,
    fields,      setFields,
    selectedId,  selectedField,
    activeTab,   setActiveTab,
    mobileTab,   setMobileTab,
    isDirty,     setIsDirty,
    previewLang, setPreviewLang,
    addField,    removeField,   duplicateField,
    selectField, updateField,   reorderFields,
  }
}
