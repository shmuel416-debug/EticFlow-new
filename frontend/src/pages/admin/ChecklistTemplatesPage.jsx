/**
 * Admin — Reviewer checklist template library: list, create drafts, edit structure, publish.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus, Save, Send, ArrowUp, ArrowDown, Trash2, ClipboardList, ListChecks,
} from 'lucide-react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Input,
  Select,
  Textarea,
  Badge,
  Checkbox,
  Modal,
  FormField,
} from '../../components/ui'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  publishTemplate,
} from '../../services/reviewerChecklist.api'

const TRACK_OPTIONS = ['', 'FULL', 'EXPEDITED', 'EXEMPT']
const ANSWER_TYPES = ['ADEQUACY', 'YES_NO', 'YES_NO_PROBLEM']

/**
 * Sort sections and nested items by orderIndex.
 * @param {object[]} sections
 * @returns {object[]}
 */
function sortSections(sections) {
  if (!Array.isArray(sections)) return []
  const sorted = [...sections].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  return sorted.map((s) => ({
    ...s,
    items: [...(s.items || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
  }))
}

/**
 * Clone template into editable shape (detached from list reference).
 * @param {object} template
 * @returns {object}
 */
function cloneEditorState(template) {
  const sections = sortSections(template.sections || []).map((s) => ({
    ...s,
    items: (s.items || []).map((it) => ({ ...it })),
  }))
  return {
    id: template.id,
    name: template.name || '',
    nameEn: template.nameEn || '',
    track: template.track ?? null,
    version: template.version,
    isPublished: Boolean(template.isPublished),
    isActive: Boolean(template.isActive),
    sections,
  }
}

/**
 * Build PUT body sections array for API.
 * @param {object[]} sections
 * @returns {object[]}
 */
function sectionsToPayload(sections) {
  return sections.map((s, si) => ({
    code: (s.code || '').trim(),
    title: (s.title || '').trim(),
    titleEn: (s.titleEn || '').trim(),
    description: (s.description || '').trim() || undefined,
    answerType: s.answerType,
    yesIsProblem: Boolean(s.yesIsProblem),
    orderIndex: si,
    items: (s.items || []).map((it, ii) => ({
      code: (it.code || '').trim(),
      label: (it.label || '').trim(),
      labelEn: (it.labelEn || '').trim(),
      helpText: (it.helpText || '').trim() || undefined,
      helpTextEn: (it.helpTextEn || '').trim() || undefined,
      orderIndex: ii,
      isRequired: it.isRequired !== false,
      requiresDetails: Boolean(it.requiresDetails),
      conditional: it.conditional || undefined,
    })),
  }))
}

/**
 * @param {string} prefix
 * @returns {string}
 */
function uniqueCode(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * @param {object} editor
 * @returns {string|null} Error message key or null if valid
 */
function validateEditor(editor) {
  const name = editor.name.trim()
  const nameEn = editor.nameEn.trim()
  if (!name || !nameEn) return 'checklistTemplates.validationNames'
  for (const s of editor.sections) {
    if (!(s.code || '').trim() || !(s.title || '').trim() || !(s.titleEn || '').trim()) {
      return 'checklistTemplates.validationSection'
    }
    for (const it of s.items || []) {
      if (!(it.code || '').trim() || !(it.label || '').trim() || !(it.labelEn || '').trim()) {
        return 'checklistTemplates.validationItem'
      }
    }
  }
  return null
}

/**
 * Swap two entries in a copy of arr.
 * @template T
 * @param {T[]} arr
 * @param {number} i
 * @param {number} j
 * @returns {T[]}
 */
function swapRows(arr, i, j) {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr
  const next = [...arr]
  const t = next[i]
  next[i] = next[j]
  next[j] = t
  return next
}

export default function ChecklistTemplatesPage() {
  const { t, i18n } = useTranslation()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNameEn, setNewNameEn] = useState('')
  const [newTrack, setNewTrack] = useState('')

  const isRtl = i18n.language === 'he' || (typeof i18n.language === 'string' && i18n.language.startsWith('he'))
  const isHeUi = i18n.language.startsWith('he')

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { templates: rows } = await listTemplates({ take: 200 })
      setTemplates(rows || [])
    } catch {
      setError(t('checklistTemplates.loadError'))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(''), 4000)
    return () => window.clearTimeout(id)
  }, [toast])

  /**
   * Select a template and load full editor state.
   * @param {string} id
   */
  const selectTemplate = async (id) => {
    setSelectedId(id)
    setError('')
    try {
      const full = await getTemplate(id)
      setEditor(cloneEditorState(full))
    } catch {
      setError(t('checklistTemplates.loadOneError'))
      setEditor(null)
    }
  }

  /**
   * Persist draft changes.
   */
  const handleSave = async () => {
    if (!editor || editor.isPublished) return
    const key = validateEditor(editor)
    if (key) {
      setError(t(key))
      return
    }
    const name = editor.name.trim()
    const nameEn = editor.nameEn.trim()
    setSaving(true)
    setError('')
    try {
      const updated = await updateTemplate(editor.id, {
        name,
        nameEn,
        track: editor.track,
        sections: sectionsToPayload(editor.sections),
      })
      setEditor(cloneEditorState(updated))
      setToast(t('checklistTemplates.saved'))
      await loadList()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message
      setError(msg || t('checklistTemplates.saveError'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Open publish confirmation.
   */
  const handlePublishClick = () => {
    if (!editor || editor.isPublished) return
    if (!editor.sections?.length) {
      setError(t('checklistTemplates.publishNeedsSections'))
      return
    }
    const key = validateEditor(editor)
    if (key) {
      setError(t(key))
      return
    }
    setPublishOpen(true)
  }

  /**
   * Save draft then publish.
   */
  const handlePublishConfirm = async () => {
    if (!editor) return
    const key = validateEditor(editor)
    if (key) {
      setError(t(key))
      setPublishOpen(false)
      return
    }
    const name = editor.name.trim()
    const nameEn = editor.nameEn.trim()
    setSaving(true)
    setError('')
    try {
      await updateTemplate(editor.id, {
        name,
        nameEn,
        track: editor.track,
        sections: sectionsToPayload(editor.sections),
      })
      await publishTemplate(editor.id)
      setPublishOpen(false)
      setToast(t('checklistTemplates.published'))
      await loadList()
      await selectTemplate(editor.id)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message
      setError(msg || t('checklistTemplates.publishError'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Create draft from modal.
   */
  const handleCreate = async () => {
    const name = newName.trim()
    const nameEn = newNameEn.trim()
    if (!name || !nameEn) {
      setError(t('checklistTemplates.validationNames'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const track = newTrack === '' ? null : newTrack
      const created = await createTemplate({ name, nameEn, track })
      setCreateOpen(false)
      setNewName('')
      setNewNameEn('')
      setNewTrack('')
      setToast(t('checklistTemplates.created'))
      await loadList()
      await selectTemplate(created.id)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message
      setError(msg || t('checklistTemplates.createError'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * @param {number} si
   */
  const addItem = (si) => {
    if (!editor || editor.isPublished) return
    setEditor((prev) => {
      if (!prev) return prev
      const sections = prev.sections.map((s, idx) => {
        if (idx !== si) return s
        const items = [...(s.items || [])]
        items.push({
          id: undefined,
          code: uniqueCode('ITEM'),
          label: '',
          labelEn: '',
          helpText: '',
          helpTextEn: '',
          orderIndex: items.length,
          isRequired: true,
          requiresDetails: false,
        })
        return { ...s, items }
      })
      return { ...prev, sections }
    })
  }

  const addSection = () => {
    if (!editor || editor.isPublished) return
    setEditor((prev) => {
      if (!prev) return prev
      const sections = [...prev.sections]
      sections.push({
        id: undefined,
        code: uniqueCode('SEC'),
        title: '',
        titleEn: '',
        description: '',
        answerType: 'ADEQUACY',
        yesIsProblem: false,
        orderIndex: sections.length,
        items: [],
      })
      return { ...prev, sections }
    })
  }

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        title={t('checklistTemplates.pageTitle')}
        subtitle={t('checklistTemplates.pageDescription')}
      />

      {error && (
        <div
          role="alert"
          className="text-sm font-medium rounded-xl px-3 py-2 border"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            borderColor: 'var(--status-danger)',
          }}
        >
          {error}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="text-sm font-medium rounded-xl px-3 py-2 border"
          style={{
            background: 'var(--status-success-50)',
            color: 'var(--status-success)',
            borderColor: 'var(--status-success)',
          }}
        >
          {toast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <Card className="w-full lg:w-[340px] shrink-0">
          <CardHeader
            title={t('checklistTemplates.listTitle')}
            actions={(
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" aria-hidden />
                {t('checklistTemplates.create')}
              </Button>
            )}
          />
          <CardBody className="pt-0">
            {loading ? (
              <p className="text-sm text-gray-500">{t('common.loading')}</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-500">{t('checklistTemplates.emptyList')}</p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-1">
                {templates.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectTemplate(row.id)}
                      className={[
                        'w-full text-start rounded-xl px-3 py-2 border transition-colors',
                        row.id === selectedId ? 'bg-[var(--lev-navy-50)] border-[var(--lev-navy)]' : 'border-gray-200 hover:bg-gray-50',
                      ].join(' ')}
                      style={{ minHeight: 44 }}
                    >
                      <span className="block font-semibold text-sm" style={{ color: 'var(--lev-navy)' }}>
                        {isHeUi ? row.name : row.nameEn}
                      </span>
                      <span className="flex flex-wrap gap-1 mt-1">
                        {row.isPublished && (
                          <Badge tone="success" size="sm" className="text-xs">
                            {t('checklistTemplates.badgePublished')}
                          </Badge>
                        )}
                        {!row.isPublished && (
                          <Badge tone="neutral" size="sm" className="text-xs">
                            {t('checklistTemplates.badgeDraft')}
                          </Badge>
                        )}
                        {row.isActive && (
                          <Badge tone="teal" size="sm" className="text-xs">
                            {t('checklistTemplates.badgeActive')}
                          </Badge>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="flex-1 min-w-0 w-full space-y-3">
          {!editor && !loading && (
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 m-0 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 shrink-0" aria-hidden />
                  {t('checklistTemplates.selectHint')}
                </p>
              </CardBody>
            </Card>
          )}

          {editor && (
            <>
              <Card>
                <CardHeader
                  title={isHeUi ? editor.name : editor.nameEn}
                  actions={(
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Badge tone="navy" size="sm">v{editor.version}</Badge>
                      {!editor.isPublished && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSave}
                            disabled={saving}
                          >
                            <Save className="w-4 h-4" aria-hidden />
                            {t('checklistTemplates.save')}
                          </Button>
                          <Button
                            type="button"
                            onClick={handlePublishClick}
                            disabled={saving}
                          >
                            <Send className="w-4 h-4" aria-hidden />
                            {t('checklistTemplates.publish')}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                />
                <CardBody className="space-y-4">
                  {editor.isPublished && (
                    <div
                      role="status"
                      className="text-sm rounded-lg px-3 py-2 border"
                      style={{
                        borderColor: 'var(--border-default)',
                        background: 'var(--lev-navy-50)',
                        color: 'var(--lev-navy)',
                      }}
                    >
                      {t('checklistTemplates.readOnlyPublished')}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField label={t('checklistTemplates.fieldNameHe')}>
                      <Input
                        value={editor.name}
                        onChange={(e) => setEditor((p) => (p ? { ...p, name: e.target.value } : p))}
                        disabled={editor.isPublished}
                        autoComplete="off"
                      />
                    </FormField>
                    <FormField label={t('checklistTemplates.fieldNameEn')}>
                      <Input
                        value={editor.nameEn}
                        onChange={(e) => setEditor((p) => (p ? { ...p, nameEn: e.target.value } : p))}
                        disabled={editor.isPublished}
                        autoComplete="off"
                      />
                    </FormField>
                    <FormField label={t('checklistTemplates.fieldTrack')} className="md:col-span-2">
                      <Select
                        value={editor.track ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setEditor((p) => (p ? { ...p, track: v === '' ? null : v } : p))
                        }}
                        disabled={editor.isPublished}
                      >
                        {TRACK_OPTIONS.map((val) => (
                          <option key={val || 'all'} value={val}>
                            {val === '' ? t('checklistTemplates.track.ALL') : t(`checklistTemplates.track.${val}`)}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title={t('checklistTemplates.sectionsTitle')}
                  actions={
                    !editor.isPublished ? (
                      <Button type="button" size="sm" variant="secondary" onClick={addSection}>
                        <ListChecks className="w-4 h-4" aria-hidden />
                        {t('checklistTemplates.addSection')}
                      </Button>
                    ) : undefined
                  }
                />
                <CardBody className="space-y-6">
                  {editor.sections.length === 0 && (
                    <p className="text-sm text-gray-500 m-0">{t('checklistTemplates.noSections')}</p>
                  )}
                  {editor.sections.map((section, si) => (
                    <div
                      key={section.id || `${section.code}-${si}`}
                      className="rounded-xl border border-gray-200 p-3 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold m-0" style={{ color: 'var(--lev-navy)' }}>
                          {t('checklistTemplates.sectionHeading', { index: si + 1 })}
                        </h3>
                        {!editor.isPublished && (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={t('checklistTemplates.moveSectionUp')}
                              onClick={() => setEditor((p) => {
                                if (!p) return p
                                return { ...p, sections: swapRows(p.sections, si, si - 1) }
                              })}
                              disabled={si === 0}
                            >
                              <ArrowUp className="w-4 h-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={t('checklistTemplates.moveSectionDown')}
                              onClick={() => setEditor((p) => {
                                if (!p) return p
                                return { ...p, sections: swapRows(p.sections, si, si + 1) }
                              })}
                              disabled={si >= editor.sections.length - 1}
                            >
                              <ArrowDown className="w-4 h-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.filter((_, idx) => idx !== si)
                                return { ...p, sections }
                              })}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden />
                              {t('checklistTemplates.removeSection')}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <FormField label={t('checklistTemplates.sectionCode')}>
                          <Input
                            value={section.code}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.map((s, idx) => (idx === si ? { ...s, code: v } : s))
                                return { ...p, sections }
                              })
                            }}
                            disabled={editor.isPublished}
                          />
                        </FormField>
                        <FormField label={t('checklistTemplates.answerType')}>
                          <Select
                            value={section.answerType}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.map((s, idx) => (idx === si ? { ...s, answerType: v } : s))
                                return { ...p, sections }
                              })
                            }}
                            disabled={editor.isPublished}
                          >
                            {ANSWER_TYPES.map((at) => (
                              <option key={at} value={at}>{t(`checklistTemplates.answerTypeOption.${at}`)}</option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField label={t('checklistTemplates.sectionTitleHe')} className="md:col-span-2">
                          <Input
                            value={section.title}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.map((s, idx) => (idx === si ? { ...s, title: v } : s))
                                return { ...p, sections }
                              })
                            }}
                            disabled={editor.isPublished}
                          />
                        </FormField>
                        <FormField label={t('checklistTemplates.sectionTitleEn')} className="md:col-span-2">
                          <Input
                            value={section.titleEn}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.map((s, idx) => (idx === si ? { ...s, titleEn: v } : s))
                                return { ...p, sections }
                              })
                            }}
                            disabled={editor.isPublished}
                          />
                        </FormField>
                        <FormField label={t('checklistTemplates.sectionDescription')} className="md:col-span-2">
                          <Textarea
                            value={section.description || ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.map((s, idx) => (idx === si ? { ...s, description: v } : s))
                                return { ...p, sections }
                              })
                            }}
                            disabled={editor.isPublished}
                            rows={2}
                          />
                        </FormField>
                        <div className="md:col-span-2 flex items-center gap-2">
                          <Checkbox
                            checked={Boolean(section.yesIsProblem)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEditor((p) => {
                                if (!p) return p
                                const sections = p.sections.map((s, idx) => (idx === si ? { ...s, yesIsProblem: checked } : s))
                                return { ...p, sections }
                              })
                            }}
                            disabled={editor.isPublished}
                            id={`yes-problem-${si}`}
                          />
                          <label htmlFor={`yes-problem-${si}`} className="text-sm cursor-pointer">
                            {t('checklistTemplates.yesIsProblem')}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {t('checklistTemplates.itemsTitle')}
                          </span>
                          {!editor.isPublished && (
                            <Button type="button" size="sm" variant="secondary" onClick={() => addItem(si)}>
                              <Plus className="w-4 h-4" aria-hidden />
                              {t('checklistTemplates.addItem')}
                            </Button>
                          )}
                        </div>
                        {(section.items || []).length === 0 && (
                          <p className="text-xs text-gray-500 m-0">{t('checklistTemplates.noItems')}</p>
                        )}
                        {(section.items || []).map((item, ii) => (
                          <div
                            key={item.id || `${item.code}-${ii}`}
                            className="rounded-lg bg-gray-50 border border-gray-100 p-2 space-y-2"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                {t('checklistTemplates.itemHeading', { index: ii + 1 })}
                              </span>
                              {!editor.isPublished && (
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    aria-label={t('checklistTemplates.moveItemUp')}
                                    onClick={() => setEditor((p) => {
                                      if (!p) return p
                                      const sections = p.sections.map((s, idx) => {
                                        if (idx !== si) return s
                                        return { ...s, items: swapRows(s.items || [], ii, ii - 1) }
                                      })
                                      return { ...p, sections }
                                    })}
                                    disabled={ii === 0}
                                  >
                                    <ArrowUp className="w-4 h-4" aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    aria-label={t('checklistTemplates.moveItemDown')}
                                    onClick={() => setEditor((p) => {
                                      if (!p) return p
                                      const sections = p.sections.map((s, idx) => {
                                        if (idx !== si) return s
                                        const items = s.items || []
                                        return { ...s, items: swapRows(items, ii, ii + 1) }
                                      })
                                      return { ...p, sections }
                                    })}
                                    disabled={ii >= (section.items || []).length - 1}
                                  >
                                    <ArrowDown className="w-4 h-4" aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setEditor((p) => {
                                      if (!p) return p
                                      const sections = p.sections.map((s, idx) => {
                                        if (idx !== si) return s
                                        const items = (s.items || []).filter((_, j) => j !== ii)
                                        return { ...s, items }
                                      })
                                      return { ...p, sections }
                                    })}
                                  >
                                    <Trash2 className="w-4 h-4" aria-hidden />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <FormField label={t('checklistTemplates.itemCode')}>
                                <Input
                                  value={item.code}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setEditor((p) => {
                                      if (!p) return p
                                      const sections = p.sections.map((s, sidx) => {
                                        if (sidx !== si) return s
                                        const items = (s.items || []).map((it, j) => (j === ii ? { ...it, code: v } : it))
                                        return { ...s, items }
                                      })
                                      return { ...p, sections }
                                    })
                                  }}
                                  disabled={editor.isPublished}
                                />
                              </FormField>
                              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                                <div className="flex-1 flex items-center gap-2 pb-1">
                                  <Checkbox
                                    checked={item.isRequired !== false}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setEditor((p) => {
                                        if (!p) return p
                                        const sections = p.sections.map((s, sidx) => {
                                          if (sidx !== si) return s
                                          const items = (s.items || []).map((it, j) => (j === ii ? { ...it, isRequired: checked } : it))
                                          return { ...s, items }
                                        })
                                        return { ...p, sections }
                                      })
                                    }}
                                    disabled={editor.isPublished}
                                    id={`req-${si}-${ii}`}
                                  />
                                  <label htmlFor={`req-${si}-${ii}`} className="text-sm cursor-pointer">
                                    {t('checklistTemplates.itemRequired')}
                                  </label>
                                </div>
                                <div className="flex-1 flex items-center gap-2 pb-1">
                                  <Checkbox
                                    checked={Boolean(item.requiresDetails)}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setEditor((p) => {
                                        if (!p) return p
                                        const sections = p.sections.map((s, sidx) => {
                                          if (sidx !== si) return s
                                          const items = (s.items || []).map((it, j) => (j === ii ? { ...it, requiresDetails: checked } : it))
                                          return { ...s, items }
                                        })
                                        return { ...p, sections }
                                      })
                                    }}
                                    disabled={editor.isPublished}
                                    id={`det-${si}-${ii}`}
                                  />
                                  <label htmlFor={`det-${si}-${ii}`} className="text-sm cursor-pointer">
                                    {t('checklistTemplates.itemRequiresDetails')}
                                  </label>
                                </div>
                              </div>
                              <FormField label={t('checklistTemplates.itemLabelHe')} className="md:col-span-2">
                                <Input
                                  value={item.label}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setEditor((p) => {
                                      if (!p) return p
                                      const sections = p.sections.map((s, sidx) => {
                                        if (sidx !== si) return s
                                        const items = (s.items || []).map((it, j) => (j === ii ? { ...it, label: v } : it))
                                        return { ...s, items }
                                      })
                                      return { ...p, sections }
                                    })
                                  }}
                                  disabled={editor.isPublished}
                                />
                              </FormField>
                              <FormField label={t('checklistTemplates.itemLabelEn')} className="md:col-span-2">
                                <Input
                                  value={item.labelEn}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setEditor((p) => {
                                      if (!p) return p
                                      const sections = p.sections.map((s, sidx) => {
                                        if (sidx !== si) return s
                                        const items = (s.items || []).map((it, j) => (j === ii ? { ...it, labelEn: v } : it))
                                        return { ...s, items }
                                      })
                                      return { ...p, sections }
                                    })
                                  }}
                                  disabled={editor.isPublished}
                                />
                              </FormField>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('checklistTemplates.createModalTitle')}
        description={t('checklistTemplates.createModalDescription')}
        closeLabel={t('common.cancel')}
        footer={(
          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {t('checklistTemplates.createSubmit')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <FormField label={t('checklistTemplates.fieldNameHe')}>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoComplete="off" />
          </FormField>
          <FormField label={t('checklistTemplates.fieldNameEn')}>
            <Input value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} autoComplete="off" />
          </FormField>
          <FormField label={t('checklistTemplates.fieldTrack')}>
            <Select value={newTrack} onChange={(e) => setNewTrack(e.target.value)}>
              {TRACK_OPTIONS.map((val) => (
                <option key={val || 'all'} value={val}>
                  {val === '' ? t('checklistTemplates.track.ALL') : t(`checklistTemplates.track.${val}`)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Modal>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title={t('checklistTemplates.publishModalTitle')}
        description={t('checklistTemplates.publishModalDescription')}
        closeLabel={t('common.cancel')}
        footer={(
          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setPublishOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handlePublishConfirm} disabled={saving}>
              {t('checklistTemplates.publishConfirm')}
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-gray-600 m-0">{t('checklistTemplates.publishModalBody')}</p>
      </Modal>
    </div>
  )
}
