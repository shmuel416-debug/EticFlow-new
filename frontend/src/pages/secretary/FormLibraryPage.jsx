/**
 * EthicFlow — FormLibraryPage
 * Secretary views all forms (draft/published/archived), creates, edits, archives.
 * Keeps the existing card-grid UX but rebuilt on the EthicFlow design system
 * (PageHeader, Card, StatCard, Tabs, Button, Input, EmptyState) with the Lev
 * palette and lucide-react icons. IS 5568 / WCAG 2.2 AA. Mobile-first.
 * @module pages/secretary/FormLibraryPage
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate }    from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FilePlus2, FileText, FileEdit, FileCheck2, Archive, Search, X, Inbox,
} from 'lucide-react'
import api                from '../../services/api'
import FormCard           from '../../components/formLibrary/FormCard'
import {
  Button, StatCard, Tabs, Input, EmptyState, Skeleton, IconButton,
  PageHeader,
} from '../../components/ui'

/** Status filter keys. */
const FILTERS = ['all', 'draft', 'published', 'archived']

/**
 * Summary stats row: total / draft / published / archived counts.
 * @param {{ forms: object[] }} props
 */
function StatsRow({ forms }) {
  const { t } = useTranslation()
  const counts = useMemo(() => ({
    total:     forms.length,
    draft:     forms.filter(f => f.status === 'draft').length,
    published: forms.filter(f => f.status === 'published').length,
    archived:  forms.filter(f => f.status === 'archived').length,
  }), [forms])

  const stats = [
    { key: 'total',     value: counts.total,     label: t('secretary.formLibrary.statTotal'),     hint: t('secretary.formLibrary.statTotalLabel'),     tone: 'navy',    icon: FileText   },
    { key: 'draft',     value: counts.draft,     label: t('secretary.formLibrary.statDraft'),     hint: t('secretary.formLibrary.statDraftLabel'),     tone: 'warning', icon: FileEdit   },
    { key: 'published', value: counts.published, label: t('secretary.formLibrary.statPublished'), hint: t('secretary.formLibrary.statPublishedLabel'), tone: 'success', icon: FileCheck2 },
    { key: 'archived',  value: counts.archived,  label: t('secretary.formLibrary.statArchived'),  hint: t('secretary.formLibrary.statArchivedLabel'),  tone: 'muted',   icon: Archive    },
  ]

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      aria-label={t('secretary.formLibrary.statsSummaryLabel')}
    >
      {stats.map(s => (
        <StatCard
          key={s.key}
          value={s.value}
          label={s.label}
          hint={s.hint}
          tone={s.tone}
          icon={s.icon}
        />
      ))}
    </div>
  )
}

/**
 * FormLibraryPage — lists all forms in a card grid with stats and filters.
 * @returns {JSX.Element}
 */
export default function FormLibraryPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [forms,    setForms]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data } = await api.get('/forms')
        if (!cancelled) setForms(data.forms ?? [])
      } catch {
        if (!cancelled) setError(t('secretary.formLibrary.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [t])

  const visible = useMemo(() => {
    let list = filter === 'all' ? forms : forms.filter(f => f.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(f =>
        f.name?.toLowerCase().includes(q) || f.nameEn?.toLowerCase().includes(q)
      )
    }
    return list
  }, [forms, filter, search])

  const counts = useMemo(() => ({
    draft:     forms.filter(f => f.status === 'draft').length,
    published: forms.filter(f => f.status === 'published').length,
    archived:  forms.filter(f => f.status === 'archived').length,
  }), [forms])

  const handleEdit    = useCallback((id) => navigate(`/secretary/forms/${id}`),         [navigate])
  const handlePreview = useCallback((id) => navigate(`/secretary/forms/${id}/preview`), [navigate])

  const handleArchive = useCallback(async (id) => {
    if (!window.confirm(t('secretary.formLibrary.confirmArchive'))) return
    try {
      await api.post(`/forms/${id}/archive`)
      setForms(prev => prev.map(f => f.id === id ? { ...f, status: 'archived' } : f))
    } catch {
      setError(t('errors.SERVER_ERROR'))
    }
  }, [t])

  const handleRestore = useCallback(async (id) => {
    if (!window.confirm(t('secretary.formLibrary.confirmRestore'))) return
    try {
      await api.post(`/forms/${id}/restore`)
      setForms(prev => prev.map(f => f.id === id ? { ...f, status: 'draft' } : f))
    } catch {
      setError(t('errors.SERVER_ERROR'))
    }
  }, [t])

  const tabItems = FILTERS.map((f) => ({
    key: f,
    label: t(`secretary.formLibrary.filter${f.charAt(0).toUpperCase() + f.slice(1)}`),
    count: f === 'all' ? undefined : counts[f],
  }))

  const filtered = filter !== 'all' || search !== ''

  return (
    <>
      <a href="#forms-grid" className="skip-link">{t('common.skipToMain')}</a>

      <div className="p-4 md:p-6 space-y-4">
        <PageHeader
          title={t('secretary.formLibrary.title')}
          subtitle={t('secretary.formLibrary.subtitle')}
          actions={
            <Button
              variant="gold"
              leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              onClick={() => navigate('/secretary/forms/new')}
              aria-label={t('secretary.formLibrary.newForm')}
            >
              {t('secretary.formLibrary.newForm')}
            </Button>
          }
        />

        {!loading && !error && <StatsRow forms={forms} />}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 text-sm font-medium"
            style={{
              background: 'var(--status-danger-50)',
              color: 'var(--status-danger)',
              border: '1px solid var(--status-danger)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
            }}
          >
            <span>{error}</span>
            <IconButton
              icon={X}
              label={t('secretary.formBuilder.closeError')}
              onClick={() => setError('')}
            />
          </div>
        )}

        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3"
          style={{
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Tabs
            items={tabItems}
            value={filter}
            onChange={setFilter}
            variant="pills"
            ariaLabel={t('secretary.formLibrary.filterLabel')}
          />
          <div className="md:w-64">
            <label htmlFor="form-search" className="lev-sr-only">
              {t('secretary.formLibrary.search')}
            </label>
            <Input
              id="form-search"
              icon={Search}
              type="search"
              placeholder={t('secretary.formLibrary.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('secretary.formLibrary.search')}
            />
          </div>
        </div>

        <section id="forms-grid">
          {loading && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              role="status"
              aria-live="polite"
              aria-label={t('common.loading')}
            >
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="bg-white overflow-hidden"
                  style={{
                    borderRadius: 'var(--radius-2xl)',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ height: 8, background: 'var(--surface-sunken)' }} />
                  <div className="p-4 space-y-3">
                    <Skeleton width="75%" height={16} />
                    <Skeleton width="50%" height={12} />
                    <Skeleton width="100%" height={36} radius="var(--radius-xl)" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && visible.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={t('secretary.formLibrary.emptyTitle')}
              description={
                filtered
                  ? t('secretary.formLibrary.emptyFilterHint')
                  : t('secretary.formLibrary.emptyHint')
              }
              action={
                filtered ? null : (
                  <Button
                    variant="gold"
                    leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                    onClick={() => navigate('/secretary/forms/new')}
                  >
                    {t('secretary.formLibrary.newForm')}
                  </Button>
                )
              }
            />
          )}

          {!loading && visible.length > 0 && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
              aria-label={t('secretary.formLibrary.title')}
            >
              {visible.map(form => (
                <div key={form.id} role="listitem">
                  <FormCard
                    form={form}
                    onEdit={handleEdit}
                    onPreview={handlePreview}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
