/**
 * EthicFlow — Reviewer Diff Page
 * Compares submission versions and highlights changed fields.
 * Refreshed to Lev design system (PageHeader + Card primitives + Select/Input).
 * IS 5568 / WCAG 2.2 AA.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { Search, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Spinner,
  FormField,
  Input,
  Select,
  EmptyState,
} from '../../components/ui'

/**
 * Flattens nested object/array into key-path map.
 * @param {any} value
 * @param {string} [prefix]
 * @returns {Record<string,string>}
 */
function flatten(value, prefix = '') {
  if (value === null || value === undefined) return { [prefix || 'root']: 'null' }
  if (typeof value !== 'object') return { [prefix || 'root']: String(value) }
  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item, index) => ({ ...acc, ...flatten(item, `${prefix}[${index}]`) }),
      {}
    )
  }
  return Object.entries(value).reduce((acc, [key, val]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return { ...acc, ...flatten(val, next) }
  }, {})
}

/**
 * Normalizes value to noise-friendly string.
 * @param {string|undefined} value
 * @returns {string}
 */
function normalizeValue(value) {
  if (value === undefined || value === null) return ''
  const trimmed = String(value).trim().toLowerCase()
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === '—') return ''
  return trimmed
}

/**
 * Returns whether the change is low-signal noise.
 * @param {{from:string,to:string}} row
 * @returns {boolean}
 */
function isNoisyChange(row) {
  const from = normalizeValue(row.from)
  const to = normalizeValue(row.to)
  if (from === to) return true
  if (!from && !to) return true
  if ((from === '[]' && !to) || (to === '[]' && !from)) return true
  if ((from === '{}' && !to) || (to === '{}' && !from)) return true
  return false
}

/**
 * Returns logical group key from path.
 * @param {string} path
 * @returns {string}
 */
function groupFromPath(path) {
  const first = path.split(/[.[\]]/).filter(Boolean)[0]
  return first || 'root'
}

/**
 * Builds comparison rows between versions.
 * @param {Record<string,string>} fromMap
 * @param {Record<string,string>} toMap
 * @returns {Array<{path:string, from:string, to:string, type:string, group:string, noisy:boolean}>}
 */
function buildDiffRows(fromMap, toMap) {
  const keys = new Set([...Object.keys(fromMap), ...Object.keys(toMap)])
  const rows = []
  for (const key of keys) {
    const before = fromMap[key]
    const after = toMap[key]
    if (before === after) continue
    let type = 'updated'
    if (before === undefined) type = 'added'
    if (after === undefined) type = 'removed'
    const row = {
      path: key,
      from: before ?? '—',
      to: after ?? '—',
      type,
      group: groupFromPath(key),
    }
    rows.push({ ...row, noisy: isNoisyChange(row) })
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Highlights token-level changes for long text values.
 * @param {string} value
 * @param {string} other
 * @param {'from'|'to'} side
 * @returns {import('react').ReactNode}
 */
function highlightLongText(value, other, side) {
  const valueTokens = String(value).split(/\s+/)
  const otherSet = new Set(String(other).split(/\s+/))
  return valueTokens.map((token, index) => {
    const changed = !otherSet.has(token)
    const bg =
      side === 'from' ? 'var(--status-danger-50)' : 'var(--status-success-50)'
    return (
      <span
        key={`${side}-${token}-${index}`}
        style={
          changed
            ? {
                background: bg,
                padding: '0 2px',
                borderRadius: 'var(--radius-sm)',
              }
            : undefined
        }
      >
        {token}
        {' '}
      </span>
    )
  })
}

/**
 * Renders value cell with long-text diff highlighting.
 * @param {string} value
 * @param {string} other
 * @param {'from'|'to'} side
 * @returns {import('react').ReactNode}
 */
function renderValueCell(value, other, side) {
  if (String(value).length < 90 && String(other).length < 90) return value
  return highlightLongText(value, other, side)
}

/**
 * Reviewer diff page with version selectors.
 * @returns {JSX.Element}
 */
export default function ReviewDiffPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submission, setSubmission] = useState(null)
  const [fromVersion, setFromVersion] = useState('')
  const [toVersion, setToVersion] = useState('')
  const [changeTypeFilter, setChangeTypeFilter] = useState('all')
  const [activeGroup, setActiveGroup] = useState('all')
  const [hideNoise, setHideNoise] = useState(true)
  const [searchText, setSearchText] = useState('')
  const backTo =
    typeof location.state?.from === 'string'
      ? location.state.from
      : `/reviewer/assignments/${id}`

  useEffect(() => {
    /**
     * Loads submission with versions for diff rendering.
     * @returns {Promise<void>}
     */
    async function loadSubmission() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/submissions/${id}`)
        const sub = data.submission
        setSubmission(sub)
        const versions = sub?.versions || []
        if (versions.length >= 2) {
          setFromVersion(String(versions[versions.length - 2].versionNum))
          setToVersion(String(versions[versions.length - 1].versionNum))
        } else if (versions.length === 1) {
          setFromVersion(String(versions[0].versionNum))
          setToVersion(String(versions[0].versionNum))
        }
      } catch (err) {
        setError(err.message || t('submission.detail.loadError'))
      } finally {
        setLoading(false)
      }
    }
    loadSubmission()
  }, [id, t])

  const versions = useMemo(() => submission?.versions || [], [submission])
  const fromData = useMemo(() => {
    const v = versions.find((item) => String(item.versionNum) === fromVersion)
    return flatten(v?.dataJson || {})
  }, [versions, fromVersion])
  const toData = useMemo(() => {
    const v = versions.find((item) => String(item.versionNum) === toVersion)
    return flatten(v?.dataJson || {})
  }, [versions, toVersion])
  const rows = useMemo(() => buildDiffRows(fromData, toData), [fromData, toData])
  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase()
    return rows.filter((row) => {
      if (hideNoise && row.noisy) return false
      if (changeTypeFilter !== 'all' && row.type !== changeTypeFilter) return false
      if (activeGroup !== 'all' && row.group !== activeGroup) return false
      if (!search) return true
      return `${row.path} ${row.from} ${row.to}`.toLowerCase().includes(search)
    })
  }, [rows, hideNoise, changeTypeFilter, activeGroup, searchText])

  const groupedRows = useMemo(() => {
    return filteredRows.reduce((acc, row) => {
      const arr = acc[row.group] || []
      arr.push(row)
      acc[row.group] = arr
      return acc
    }, {})
  }, [filteredRows])

  const groupKeys = useMemo(() => Object.keys(groupedRows).sort(), [groupedRows])

  const stats = useMemo(
    () => ({
      added: filteredRows.filter((r) => r.type === 'added').length,
      removed: filteredRows.filter((r) => r.type === 'removed').length,
      updated: filteredRows.filter((r) => r.type === 'updated').length,
      noisy: rows.filter((r) => r.noisy).length,
    }),
    [filteredRows, rows]
  )

  /**
   * Tone mapping for diff row type badges.
   * @param {string} type
   * @returns {'success'|'danger'|'info'}
   */
  function toneForType(type) {
    if (type === 'added') return 'success'
    if (type === 'removed') return 'danger'
    return 'info'
  }

  return (
    <main id="main-content" className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title={t('reviewer.diff.title')}
        backTo={backTo}
        backLabel={t('reviewer.diff.backToAssignment')}
      />

      {loading && (
        <div
          className="flex items-center justify-center gap-3 py-8"
          role="status"
          aria-live="polite"
        >
          <Spinner size={20} label={t('common.loading')} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('common.loading')}
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
          }}
        >
          <AlertCircle
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
          />
          {error}
        </div>
      )}

      {!loading && !error && (
        <Card as="section">
          <CardHeader title={t('reviewer.diff.title')} />
          <CardBody>
            {versions.length < 2 && (
              <p
                role="status"
                aria-live="polite"
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('reviewer.diff.notEnoughVersions')}
              </p>
            )}

            {versions.length >= 2 && (
              <>
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <FormField
                    label={t('reviewer.diff.fromVersion')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Select
                        id={inputId}
                        value={fromVersion}
                        onChange={(e) => setFromVersion(e.target.value)}
                        data-testid="diff-from-version"
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      >
                        {versions.map((v) => (
                          <option
                            key={`from-${v.id}`}
                            value={String(v.versionNum)}
                          >
                            v{v.versionNum}
                          </option>
                        ))}
                      </Select>
                    )}
                  />

                  <FormField
                    label={t('reviewer.diff.toVersion')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Select
                        id={inputId}
                        value={toVersion}
                        onChange={(e) => setToVersion(e.target.value)}
                        data-testid="diff-to-version"
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      >
                        {versions.map((v) => (
                          <option
                            key={`to-${v.id}`}
                            value={String(v.versionNum)}
                          >
                            v{v.versionNum}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  <FormField
                    label={t('reviewer.diff.filterByType')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Select
                        id={inputId}
                        value={changeTypeFilter}
                        data-testid="diff-type-filter"
                        onChange={(e) => setChangeTypeFilter(e.target.value)}
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      >
                        <option value="all">{t('reviewer.diff.allTypes')}</option>
                        <option value="updated">
                          {t('reviewer.diff.type.updated')}
                        </option>
                        <option value="added">
                          {t('reviewer.diff.type.added')}
                        </option>
                        <option value="removed">
                          {t('reviewer.diff.type.removed')}
                        </option>
                      </Select>
                    )}
                  />

                  <FormField
                    label={t('reviewer.diff.filterByGroup')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Select
                        id={inputId}
                        value={activeGroup}
                        data-testid="diff-group-filter"
                        onChange={(e) => setActiveGroup(e.target.value)}
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      >
                        <option value="all">
                          {t('reviewer.diff.allGroups')}
                        </option>
                        {groupKeys.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </Select>
                    )}
                  />

                  <FormField
                    label={t('reviewer.diff.search')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Input
                        id={inputId}
                        type="text"
                        icon={Search}
                        value={searchText}
                        data-testid="diff-search"
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={t('reviewer.diff.searchPlaceholder')}
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      />
                    )}
                  />
                </div>

                <label
                  className="inline-flex items-center gap-2 text-sm mb-4"
                  style={{ minHeight: 36 }}
                >
                  <input
                    type="checkbox"
                    data-testid="diff-hide-noise"
                    checked={hideNoise}
                    onChange={(e) => setHideNoise(e.target.checked)}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {t('reviewer.diff.hideNoise', { count: stats.noisy })}
                  </span>
                </label>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge tone="info" size="sm">
                    {t('reviewer.diff.updatedCount', { count: stats.updated })}
                  </Badge>
                  <Badge tone="success" size="sm">
                    {t('reviewer.diff.addedCount', { count: stats.added })}
                  </Badge>
                  <Badge tone="danger" size="sm">
                    {t('reviewer.diff.removedCount', { count: stats.removed })}
                  </Badge>
                </div>

                {filteredRows.length === 0 && (
                  <EmptyState
                    icon={Search}
                    title={t('reviewer.diff.noChanges')}
                  />
                )}

                {filteredRows.length > 0 && (
                  <div className="space-y-4">
                    {groupKeys.map((group) => (
                      <section
                        key={group}
                        style={{
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-lg)',
                          overflow: 'hidden',
                        }}
                      >
                        <header
                          className="px-3 py-2 text-xs font-semibold"
                          style={{
                            background: 'var(--surface-sunken)',
                            color: 'var(--text-secondary)',
                            borderBottom: '1px solid var(--border-default)',
                          }}
                        >
                          {t('reviewer.diff.groupPrefix')} {group} (
                          {groupedRows[group].length})
                        </header>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead
                              className="text-xs"
                              style={{
                                background: 'var(--surface-raised)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <tr>
                                <th className="px-3 py-2 text-start">
                                  {t('reviewer.diff.fieldPath')}
                                </th>
                                <th className="px-3 py-2 text-start">
                                  {t('reviewer.diff.fromValue')}
                                </th>
                                <th className="px-3 py-2 text-start">
                                  {t('reviewer.diff.toValue')}
                                </th>
                                <th className="px-3 py-2 text-start">
                                  {t('reviewer.diff.changeType')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupedRows[group].map((row) => (
                                <tr
                                  key={row.path}
                                  style={{
                                    borderTop: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <td
                                    className="px-3 py-2 font-mono text-xs"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {row.path}
                                  </td>
                                  <td className="px-3 py-2 whitespace-pre-wrap break-words">
                                    {renderValueCell(row.from, row.to, 'from')}
                                  </td>
                                  <td className="px-3 py-2 whitespace-pre-wrap break-words">
                                    {renderValueCell(row.to, row.from, 'to')}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge tone={toneForType(row.type)} size="sm">
                                      {t(`reviewer.diff.type.${row.type}`)}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}
    </main>
  )
}
