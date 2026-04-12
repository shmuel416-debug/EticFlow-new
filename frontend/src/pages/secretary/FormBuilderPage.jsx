/**
 * EthicFlow — FormBuilderPage
 * Secretary drag-and-drop form builder with API save + publish.
 * Desktop: split-screen (palette/settings | canvas).
 * Mobile: 3-tab layout (שדות / טופס / הגדרות).
 * @module pages/secretary/FormBuilderPage
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link }      from 'react-router-dom'
import { useTranslation }                    from 'react-i18next'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'

import api                  from '../../services/api'
import useFormBuilder       from '../../hooks/useFormBuilder'
import FieldPalette         from '../../components/formBuilder/FieldPalette'
import FormCanvas           from '../../components/formBuilder/FormCanvas'
import FieldSettingsPanel   from '../../components/formBuilder/FieldSettingsPanel'
import PublishDialog        from '../../components/formBuilder/PublishDialog'

/* ─────────────────────────────────────────── */
/* Status badge                                */
/* ─────────────────────────────────────────── */

/**
 * Pill badge showing form status.
 * @param {{ status: 'draft'|'published'|'archived' }} props
 */
function StatusBadge({ status }) {
  const { t } = useTranslation()
  const styles = {
    draft:     { bg: '#fef9c3', color: '#92400e' },
    published: { bg: '#dcfce7', color: '#16a34a' },
    archived:  { bg: '#f3f4f6', color: '#6b7280' },
  }
  const { bg, color } = styles[status] ?? styles.draft
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
      style={{ background: bg, color }}>
      {t(`secretary.formBuilder.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
    </span>
  )
}

/* ─────────────────────────────────────────── */
/* Error banner                                */
/* ─────────────────────────────────────────── */

/**
 * Dismissable error banner shown below the toolbar.
 * @param {{ message: string, onDismiss: () => void }} props
 */
function ErrorBanner({ message, onDismiss }) {
  const { t } = useTranslation()
  if (!message) return null
  return (
    <div role="alert" aria-live="assertive"
      className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between shrink-0">
      <span className="text-sm text-red-700">{message}</span>
      <button type="button" onClick={onDismiss}
        className="text-red-500 hover:text-red-700 text-lg font-bold ms-3"
        aria-label={t('secretary.formBuilder.closeError')} style={{ minWidth: '32px', minHeight: '32px' }}>✕</button>
    </div>
  )
}

/* ─────────────────────────────────────────── */
/* Toolbar                                     */
/* ─────────────────────────────────────────── */

/**
 * Top toolbar: form names (he + en), status, preview, save, publish.
 * @param {{ formName, setFormName, formNameEn, setFormNameEn, isDirty,
 *           status, isSaving, formId, onSave, onPublish }} props
 */
function Toolbar({ formName, setFormName, formNameEn, setFormNameEn,
                   isDirty, status, isSaving, formId, onSave, onPublish }) {
  const { t } = useTranslation()

  const inputClass = `text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none`
  const focusStyle = e => (e.target.style.borderColor = 'var(--lev-teal)')
  const blurStyle  = e => (e.target.style.borderColor = '')

  return (
    <header className="bg-white border-b px-4 py-2.5 flex items-center gap-2 shrink-0 flex-wrap">
      {/* Hebrew form name */}
      <input type="text" dir="rtl"
        aria-label={t('secretary.formBuilder.formNameLabel')}
        placeholder={t('secretary.formBuilder.formNamePlaceholder')}
        value={formName}
        onChange={e => setFormName(e.target.value)}
        className={inputClass}
        style={{ minHeight: '40px', maxWidth: '200px', flex: '1 1 120px' }}
        onFocus={focusStyle} onBlur={blurStyle}
      />

      {/* English form name */}
      <input type="text" dir="ltr"
        aria-label={t('secretary.formBuilder.formNameEnLabel')}
        placeholder={t('secretary.formBuilder.formNameEnPlaceholder')}
        value={formNameEn}
        onChange={e => setFormNameEn(e.target.value)}
        className={inputClass}
        style={{ minHeight: '40px', maxWidth: '200px', flex: '1 1 120px' }}
        onFocus={focusStyle} onBlur={blurStyle}
      />

      <StatusBadge status={status} />

      <div className="flex gap-2 ms-auto shrink-0">
        {/* Preview — only when form has been saved (has an id) */}
        {formId && (
          <Link to={`/secretary/forms/${formId}/preview`}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl
              hover:bg-gray-50 transition-colors flex items-center gap-1"
            style={{ color: 'var(--lev-teal-text)', minHeight: '44px' }}
            aria-label={t('secretary.formPreview.openPreview')}>
            <span aria-hidden="true">👁</span>
            <span className="hidden sm:inline">{t('secretary.formPreview.openPreview')}</span>
          </Link>
        )}

        {/* Save */}
        <button type="button" onClick={onSave}
          disabled={!isDirty || isSaving}
          aria-label={t('secretary.formBuilder.save')}
          className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl
            hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          style={{ minHeight: '44px', color: 'var(--lev-navy)' }}>
          {isSaving ? '...' : t('secretary.formBuilder.save')}
        </button>

        {/* Publish — hidden after publish */}
        {status !== 'published' && status !== 'archived' && (
          <button type="button" onClick={onPublish}
            disabled={isSaving}
            aria-label={t('secretary.formBuilder.publish')}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl
              hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
            {t('secretary.formBuilder.publish')}
          </button>
        )}
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────── */
/* Desktop left panel                          */
/* ─────────────────────────────────────────── */

/**
 * Desktop left panel with palette / settings tabs.
 * @param {{ activeTab, setActiveTab, onAdd, selectedField, onSave, onCancel }} props
 */
function LeftPanel({ activeTab, setActiveTab, onAdd, selectedField, onSave, onCancel }) {
  const { t } = useTranslation()
  const TABS = [
    { key: 'palette',  label: t('secretary.formBuilder.tabFields')   },
    { key: 'settings', label: t('secretary.formBuilder.tabSettings') },
  ]
  return (
    <aside className="hidden md:flex flex-col border-e bg-white shrink-0"
      style={{ width: '288px' }}
      aria-label={t('secretary.formBuilder.leftPanel')}>
      <div className="flex border-b shrink-0" role="tablist"
        aria-label={t('secretary.formBuilder.leftPanel')}>
        {TABS.map(tab => (
          <button key={tab.key} type="button" role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors"
            style={{
              color:        activeTab === tab.key ? 'var(--lev-navy)' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid var(--lev-navy)' : '2px solid transparent',
              minHeight:    '44px',
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'palette'
        ? <FieldPalette onAdd={onAdd} />
        : <FieldSettingsPanel field={selectedField} onSave={onSave} onCancel={onCancel} />
      }
    </aside>
  )
}

/* ─────────────────────────────────────────── */
/* Mobile tab bar                              */
/* ─────────────────────────────────────────── */

const MOBILE_TABS = [
  { key: 'fields',   labelKey: 'secretary.formBuilder.tabFields'   },
  { key: 'canvas',   labelKey: 'secretary.formBuilder.tabCanvas'   },
  { key: 'settings', labelKey: 'secretary.formBuilder.tabSettings' },
]

/**
 * Bottom tab bar for mobile.
 * @param {{ active: string, onChange: (key: string) => void }} props
 */
function MobileTabBar({ active, onChange }) {
  const { t } = useTranslation()
  return (
    <nav className="md:hidden flex border-t bg-white shrink-0"
      role="tablist" aria-label={t('secretary.formBuilder.mobileNavLabel')}>
      {MOBILE_TABS.map(tab => (
        <button key={tab.key} type="button" role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className="flex-1 py-3 text-xs font-semibold transition-colors"
          style={{
            color:     active === tab.key ? 'var(--lev-navy)' : '#6b7280',
            borderTop: active === tab.key ? '2px solid var(--lev-navy)' : '2px solid transparent',
            minHeight: '44px',
          }}>
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  )
}

/* ─────────────────────────────────────────── */
/* Main page                                   */
/* ─────────────────────────────────────────── */

/**
 * FormBuilderPage — assembles Form Builder with API save/publish.
 * /secretary/forms/new  → creates a new form
 * /secretary/forms/:id  → loads and edits existing form
 */
export default function FormBuilderPage() {
  const { id: routeId }  = useParams()
  const navigate         = useNavigate()
  const { t }            = useTranslation()

  const {
    formName,    setFormName,
    formNameEn,  setFormNameEn,
    fields,      setFields,
    setIsDirty,
    selectedId,  selectedField,
    activeTab,   setActiveTab,
    mobileTab,   setMobileTab,
    isDirty,
    previewLang, setPreviewLang,
    addField,    removeField,   duplicateField,
    selectField, updateField,   reorderFields,
  } = useFormBuilder()

  const [formId,           setFormId]           = useState(routeId ?? null)
  const [status,           setStatus]           = useState('draft')
  const [isSaving,         setIsSaving]         = useState(false)
  const [saveError,        setSaveError]        = useState('')
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [loadingForm,      setLoadingForm]      = useState(!!routeId)

  /* Load existing form when editing */
  useEffect(() => {
    if (!routeId) return
    let cancelled = false

    async function loadForm() {
      try {
        const { data } = await api.get(`/forms/${routeId}`)
        if (cancelled) return
        setFormName(data.form.name ?? '')
        setFormNameEn(data.form.nameEn ?? '')
        setStatus(data.form.status ?? 'draft')
        setFields(data.form.schemaJson?.fields ?? [])
        setIsDirty(false)
      } catch {
        if (!cancelled) setSaveError(t('errors.SERVER_ERROR'))
      } finally {
        if (!cancelled) setLoadingForm(false)
      }
    }
    loadForm()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  /** Build schemaJson payload from current fields state */
  const buildSchema = useCallback(
    (currentFields) => ({ fields: currentFields }),
    []
  )

  /**
   * Save form — POST (new) or PUT (existing).
   * On create: redirects to /secretary/forms/:newId.
   */
  const handleSaveForm = useCallback(async () => {
    if (!formName.trim()) {
      setSaveError(t('secretary.formBuilder.errorNoName'))
      return
    }
    setIsSaving(true)
    setSaveError('')
    try {
      const payload = {
        name:       formName.trim(),
        nameEn:     formNameEn.trim() || undefined,
        schemaJson: buildSchema(fields),
      }
      if (formId) {
        await api.put(`/forms/${formId}`, payload)
        setIsDirty(false)
      } else {
        const { data } = await api.post('/forms', payload)
        setFormId(data.form.id)
        setIsDirty(false)
        navigate(`/secretary/forms/${data.form.id}`, { replace: true })
      }
    } catch (err) {
      setSaveError(t(`errors.${err.code}`) || t('errors.SERVER_ERROR'))
    } finally {
      setIsSaving(false)
    }
  }, [formName, formNameEn, formId, fields, buildSchema, navigate, setIsDirty, t])

  /**
   * Publish — saves first (if dirty), then publishes.
   * Locks the form permanently.
   */
  const handlePublishConfirm = useCallback(async () => {
    setIsSaving(true)
    setSaveError('')
    setPublishDialogOpen(false)
    try {
      let targetId = formId
      // Auto-save if needed before publishing
      if (!targetId || isDirty) {
        const payload = {
          name:       formName.trim(),
          nameEn:     formNameEn.trim() || undefined,
          schemaJson: buildSchema(fields),
        }
        if (targetId) {
          await api.put(`/forms/${targetId}`, payload)
        } else {
          const { data } = await api.post('/forms', payload)
          targetId = data.form.id
          setFormId(targetId)
          navigate(`/secretary/forms/${targetId}`, { replace: true })
        }
        setIsDirty(false)
      }
      await api.post(`/forms/${targetId}/publish`)
      setStatus('published')
    } catch (err) {
      setSaveError(t(`errors.${err.code}`) || t('errors.SERVER_ERROR'))
    } finally {
      setIsSaving(false)
    }
  }, [formId, isDirty, formName, formNameEn, fields, buildSchema, navigate, setIsDirty, t])

  const handleSaveField = useCallback((id, updates) => {
    updateField(id, updates)
    setActiveTab('palette')
  }, [updateField, setActiveTab])

  const handleCancelSettings = useCallback(() => {
    setActiveTab('palette')
    setMobileTab('canvas')
  }, [setActiveTab, setMobileTab])

  /* DnD sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  /** @param {import('@dnd-kit/core').DragEndEvent} event */
  const handleDragEnd = useCallback(({ active, over }) => {
    if (over && active.id !== over.id) reorderFields(active.id, over.id)
  }, [reorderFields])

  if (loadingForm) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status" aria-live="polite">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Skip link — IS 5568 */}
      <a href="#form-canvas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2
          focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:text-white focus:shadow-lg"
        style={{ background: 'var(--lev-navy)' }}>
        {t('common.skipToMain')}
      </a>

      <Toolbar
        formName={formName}       setFormName={setFormName}
        formNameEn={formNameEn}   setFormNameEn={setFormNameEn}
        isDirty={isDirty}         status={status}
        isSaving={isSaving}       formId={formId}
        onSave={handleSaveForm}
        onPublish={() => setPublishDialogOpen(true)}
      />

      <ErrorBanner message={saveError} onDismiss={() => setSaveError('')} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">

          {/* Desktop left panel */}
          <LeftPanel
            activeTab={activeTab}     setActiveTab={setActiveTab}
            onAdd={addField}
            selectedField={selectedField}
            onSave={handleSaveField}  onCancel={handleCancelSettings}
          />

          {/* Mobile: active tab panel */}
          <div className="md:hidden flex-1 flex flex-col overflow-hidden">
            {mobileTab === 'fields' && (
              <FieldPalette onAdd={(type) => { addField(type); setMobileTab('canvas') }} />
            )}
            {mobileTab === 'canvas' && (
              <FormCanvas
                fields={fields}         selectedId={selectedId}
                formName={formName}     previewLang={previewLang}
                onSelect={(id) => { selectField(id); setMobileTab('settings') }}
                onRemove={removeField}  onDuplicate={duplicateField}
                onPreviewLangChange={setPreviewLang}
              />
            )}
            {mobileTab === 'settings' && (
              <FieldSettingsPanel
                field={selectedField}
                onSave={handleSaveField}  onCancel={handleCancelSettings}
              />
            )}
          </div>

          {/* Desktop canvas */}
          <main id="form-canvas" className="hidden md:flex flex-1 overflow-hidden">
            <FormCanvas
              fields={fields}           selectedId={selectedId}
              formName={formName}       previewLang={previewLang}
              onSelect={selectField}    onRemove={removeField}
              onDuplicate={duplicateField}
              onPreviewLangChange={setPreviewLang}
            />
          </main>
        </div>
      </DndContext>

      <MobileTabBar active={mobileTab} onChange={setMobileTab} />

      <PublishDialog
        isOpen={publishDialogOpen}
        onConfirm={handlePublishConfirm}
        onClose={() => setPublishDialogOpen(false)}
      />
    </div>
  )
}
