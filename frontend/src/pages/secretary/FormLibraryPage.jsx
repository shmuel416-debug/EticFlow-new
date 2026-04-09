/**
 * EthicFlow — FormLibraryPage
 * Secretary views all forms (draft/published/archived), creates, edits, archives.
 * Design: Option B — stats bar + card grid with colored top stripe.
 * IS 5568 / WCAG 2.1 AA. Lev palette only. Mobile-first.
 * @module pages/secretary/FormLibraryPage
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate }                               from 'react-router-dom'
import { useTranslation }                            from 'react-i18next'
import api                                           from '../../services/api'
import FormCard                                      from '../../components/formLibrary/FormCard'

/* ─── Status filter keys ─────────────────── */
const FILTERS = ['all', 'draft', 'published', 'archived']

/* ─── Stats bar ─────────────────────────── */
/**
 * Summary stats: total / draft / published / archived counts.
 * @param {{ forms: object[] }} props
 */
function StatsBar({ forms }) {
  const { t } = useTranslation()
  const counts = useMemo(() => ({
    total:     forms.length,
    draft:     forms.filter(f => f.status === 'draft').length,
    published: forms.filter(f => f.status === 'published').length,
    archived:  forms.filter(f => f.status === 'archived').length,
  }), [forms])

  const stats = [
    { key: 'total',     value: counts.total,     label: t('secretary.formLibrary.statTotal'),     sub: t('secretary.formLibrary.statTotalLabel'),     bg: '#EEF0FA', border: '#c7cce8', color: 'var(--lev-navy)' },
    { key: 'draft',     value: counts.draft,     label: t('secretary.formLibrary.statDraft'),     sub: t('secretary.formLibrary.statDraftLabel'),     bg: '#fef9c3', border: '#fde68a', color: '#92400e'         },
    { key: 'published', value: counts.published, label: t('secretary.formLibrary.statPublished'), sub: t('secretary.formLibrary.statPublishedLabel'), bg: '#dcfce7', border: '#86efac', color: '#16a34a'         },
    { key: 'archived',  value: counts.archived,  label: t('secretary.formLibrary.statArchived'),  sub: t('secretary.formLibrary.statArchivedLabel'),  bg: '#f3f4f6', border: '#e5e7eb', color: '#6b7280'         },
  ]

  return (
    <div className="bg-white border-b px-4 md:px-6 py-3 shrink-0" aria-label={t('secretary.formLibrary.statsSummaryLabel')}>
      <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {stats.map(s => (
          <div key={s.key}
            className="rounded-xl p-3 shrink-0 flex-1 min-w-[80px]"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
            <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Filter tab bar ─────────────────────── */
/**
 * Filter tabs: all / draft / published / archived.
 * @param {{ active: string, onChange: (f: string) => void, counts: object }} props
 */
function FilterTabs({ active, onChange, counts }) {
  const { t } = useTranslation()
  const labels = {
    all:       t('secretary.formLibrary.filterAll'),
    draft:     t('secretary.formLibrary.filterDraft'),
    published: t('secretary.formLibrary.filterPublished'),
    archived:  t('secretary.formLibrary.filterArchived'),
  }
  return (
    <div className="flex gap-4 overflow-x-auto" role="tablist"
      aria-label={t('secretary.formLibrary.filterLabel')} style={{ scrollbarWidth: 'none' }}>
      {FILTERS.map(f => (
        <button key={f} type="button" role="tab"
          aria-selected={active === f}
          onClick={() => onChange(f)}
          className="py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors shrink-0"
          style={{
            borderColor: active === f ? 'var(--lev-navy)' : 'transparent',
            color:        active === f ? 'var(--lev-navy)' : '#6b7280',
            minHeight:    '44px',
          }}>
          {labels[f]}{f !== 'all' && counts[f] > 0 ? ` (${counts[f]})` : ''}
        </button>
      ))}
    </div>
  )
}

/* ─── Empty state ────────────────────────── */
/**
 * @param {{ filtered: boolean }} props
 */
function EmptyState({ filtered }) {
  const { t } = useTranslation()
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl mb-4" aria-hidden="true">📋</p>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--lev-navy)' }}>
        {t('secretary.formLibrary.emptyTitle')}
      </p>
      <p className="text-xs" style={{ color: 'var(--lev-teal-text)' }}>
        {filtered
          ? t('secretary.formLibrary.emptyFilterHint')
          : t('secretary.formLibrary.emptyHint')}
      </p>
    </div>
  )
}

/* ─── Main page ──────────────────────────── */
/**
 * FormLibraryPage — lists all forms in a card grid with stats and filters.
 */
export default function FormLibraryPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [forms,    setForms]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')

  /* Load forms from API */
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

  /* Filtered + searched list */
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

  /* Status counts for tab labels */
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

  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>

      {/* Skip link — IS 5568 */}
      <a href="#forms-grid"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2
          focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:text-white"
        style={{ background: 'var(--lev-navy)' }}>
        {t('common.skipToMain')}
      </a>

      {/* Page header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('secretary.formLibrary.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--lev-teal-text)' }}>
            {t('secretary.formLibrary.subtitle')}
          </p>
        </div>
        <button type="button"
          onClick={() => navigate('/secretary/forms/new')}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
          aria-label={t('secretary.formLibrary.newForm')}>
          <span aria-hidden="true">+</span>
          <span className="hidden sm:inline">{t('secretary.formLibrary.newForm')}</span>
        </button>
      </div>

      {/* Stats bar */}
      {!loading && !error && <StatsBar forms={forms} />}

      {/* Filter + search toolbar */}
      <div className="bg-white border-b px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
        <FilterTabs active={filter} onChange={setFilter} counts={counts} />
        <div className="shrink-0 py-2">
          <label htmlFor="form-search" className="sr-only">{t('secretary.formLibrary.search')}</label>
          <input id="form-search" type="search"
            placeholder={t('secretary.formLibrary.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none hidden sm:block"
            style={{ minHeight: '36px', width: '180px' }}
            onFocus={e => (e.target.style.borderColor = 'var(--lev-teal)')}
            onBlur={e  => (e.target.style.borderColor = '')}
          />
        </div>
      </div>

      {/* Content */}
      <main id="forms-grid" className="flex-1 p-4 md:p-6">

        {/* Error */}
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-500 font-bold ms-3" style={{ minWidth: '28px' }}>✕</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-live="polite" aria-label={t('common.loading')}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-2 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-9 bg-gray-100 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Card grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list"
            aria-label={t('secretary.formLibrary.title')}>
            {visible.length === 0
              ? <EmptyState filtered={filter !== 'all' || search !== ''} />
              : visible.map(form => (
                  <div key={form.id} role="listitem">
                    <FormCard
                      form={form}
                      onEdit={handleEdit}
                      onPreview={handlePreview}
                      onArchive={handleArchive}
                      onRestore={handleRestore}
                    />
                  </div>
                ))
            }
          </div>
        )}
      </main>
    </div>
  )
}
