/**
 * EthicFlow — FormBuilderPage
 * Secretary drag-and-drop form builder with API save + publish.
 * Desktop: split-screen (palette/settings | canvas).
 * Mobile: 3-tab layout (שדות / טופס / הגדרות).
 * Page wrapper only uses the design system primitives; canvas, palette,
 * settings panel and publish dialog are untouched children.
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
import { Eye, X as XIcon, Check, Send } from 'lucide-react'

import api                  from '../../services/api'
import useFormBuilder       from '../../hooks/useFormBuilder'
import FieldPalette         from '../../components/formBuilder/FieldPalette'
import FormCanvas           from '../../components/formBuilder/FormCanvas'
import FieldSettingsPanel   from '../../components/formBuilder/FieldSettingsPanel'
import PublishDialog        from '../../components/formBuilder/PublishDialog'
import {
  Button, IconButton, PageHeader, Badge, Input,
} from '../../components/ui'

/**
 * Maps raw form status to design-system badge tone.
 * @param {'draft'|'published'|'archived'} status
 */
function statusTone(status) {
  switch (status) {
    case 'published': return 'success'
    case 'archived':  return 'neutral'
    default:          return 'warning'
  }
}

/**
 * Dismissable error banner shown below the toolbar.
 * @param {{ message: string, onDismiss: () => void }} props
 */
function ErrorBanner({ message, onDismiss }) {
  const { t } = useTranslation()
  if (!message) return null
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="px-4 py-2 flex items-center justify-between shrink-0"
      style={{
        background: 'var(--status-danger-50)',
        borderBottom: '1px solid var(--status-danger)',
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--status-danger)' }}>
        {message}
      </span>
      <IconButton
        icon={XIcon}
        label={t('secretary.formBuilder.closeError')}
        onClick={onDismiss}
      />
    </div>
  )
}

/**
 * Toolbar: form names (he + en) + status badge + preview link.
 * The save/publish CTAs live in the PageHeader actions slot above.
 */
function NameToolbar({ formName, setFormName, formNameEn, setFormNameEn, status, formId }) {
  const { t } = useTranslation()
  return (
    <div
      className="bg-white px-4 md:px-6 pb-3 flex items-center gap-2 shrink-0 flex-wrap"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      <div style={{ maxWidth: 220, flex: '1 1 140px' }}>
        <Input
          type="text"
          dir="rtl"
          aria-label={t('secretary.formBuilder.formNameLabel')}
          placeholder={t('secretary.formBuilder.formNamePlaceholder')}
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
      </div>
      <div style={{ maxWidth: 220, flex: '1 1 140px' }}>
        <Input
          type="text"
          dir="ltr"
          aria-label={t('secretary.formBuilder.formNameEnLabel')}
          placeholder={t('secretary.formBuilder.formNameEnPlaceholder')}
          value={formNameEn}
          onChange={(e) => setFormNameEn(e.target.value)}
        />
      </div>
      <Badge tone={statusTone(status)} size="md">
        {t(`secretary.formBuilder.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
      </Badge>
      {formId && (
        <Link
          to={`/secretary/forms/${formId}/preview`}
          aria-label={t('secretary.formPreview.openPreview')}
          className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80 ms-auto"
          style={{
            color: 'var(--lev-teal-text)',
            minHeight: 44,
            padding: '0 12px',
          }}
        >
          <Eye size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <span className="hidden sm:inline">{t('secretary.formPreview.openPreview')}</span>
        </Link>
      )}
    </div>
  )
}

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
    <aside
      className="hidden md:flex flex-col shrink-0 bg-white"
      style={{ width: 288, borderInlineEnd: '1px solid var(--border-default)' }}
      aria-label={t('secretary.formBuilder.leftPanel')}
    >
      <div
        className="flex shrink-0"
        role="tablist"
        aria-label={t('secretary.formBuilder.leftPanel')}
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2.5 text-xs font-semibold transition"
            style={{
              color:        activeTab === tab.key ? 'var(--lev-navy)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--lev-navy)' : '2px solid transparent',
              minHeight:    44,
            }}
          >
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
    <nav
      className="md:hidden flex bg-white shrink-0"
      role="tablist"
      aria-label={t('secretary.formBuilder.mobileNavLabel')}
      style={{ borderTop: '1px solid var(--border-default)' }}
    >
      {MOBILE_TABS.map(tab => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className="flex-1 py-3 text-xs font-semibold transition"
          style={{
            color:     active === tab.key ? 'var(--lev-navy)' : 'var(--text-muted)',
            borderTop: active === tab.key ? '2px solid var(--lev-navy)' : '2px solid transparent',
            minHeight: 44,
          }}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  )
}

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
    selectField, updateField,   reorderFields, moveField,
  } = useFormBuilder()

  const [formId,           setFormId]           = useState(routeId ?? null)
  const [status,           setStatus]           = useState('draft')
  const [isSaving,         setIsSaving]         = useState(false)
  const [saveError,        setSaveError]        = useState('')
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [loadingForm,      setLoadingForm]      = useState(!!routeId)

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

  const buildSchema = useCallback(
    (currentFields) => ({ fields: currentFields }),
    []
  )

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

  const handlePublishConfirm = useCallback(async () => {
    setIsSaving(true)
    setSaveError('')
    setPublishDialogOpen(false)
    try {
      let targetId = formId
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  /** @param {import('@dnd-kit/core').DragEndEvent} event */
  const handleDragEnd = useCallback(({ active, over }) => {
    if (over && active.id !== over.id) reorderFields(active.id, over.id)
  }, [reorderFields])

  if (loadingForm) {
    return (
      <div
        className="flex flex-1 items-center justify-center py-24"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Skip link — IS 5568 */}
      <a
        href="#form-canvas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2
          focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:text-white focus:shadow-lg"
        style={{ background: 'var(--lev-navy)' }}
      >
        {t('common.skipToMain')}
      </a>

      <div className="bg-white px-4 md:px-6 pt-4 md:pt-5 shrink-0">
        <PageHeader
          title={formName || 'בונה הטפסים'}
          backTo="/secretary/forms"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={handleSaveForm}
                disabled={!isDirty || isSaving}
                loading={isSaving}
                leftIcon={<Check size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                aria-label={t('secretary.formBuilder.save')}
              >
                {t('secretary.formBuilder.save')}
              </Button>
              {status !== 'published' && status !== 'archived' && (
                <Button
                  variant="gold"
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={isSaving}
                  leftIcon={<Send size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                  aria-label={t('secretary.formBuilder.publish')}
                >
                  {t('secretary.formBuilder.publish')}
                </Button>
              )}
            </>
          }
        />
      </div>

      <NameToolbar
        formName={formName}
        setFormName={setFormName}
        formNameEn={formNameEn}
        setFormNameEn={setFormNameEn}
        status={status}
        formId={formId}
      />

      <ErrorBanner message={saveError} onDismiss={() => setSaveError('')} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <LeftPanel
            activeTab={activeTab}     setActiveTab={setActiveTab}
            onAdd={addField}
            selectedField={selectedField}
            onSave={handleSaveField}  onCancel={handleCancelSettings}
          />

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
                onMoveField={moveField}
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

          <main id="form-canvas" className="hidden md:flex flex-1 overflow-hidden">
            <FormCanvas
              fields={fields}           selectedId={selectedId}
              formName={formName}       previewLang={previewLang}
              onSelect={selectField}    onRemove={removeField}
              onDuplicate={duplicateField}
              onMoveField={moveField}
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
