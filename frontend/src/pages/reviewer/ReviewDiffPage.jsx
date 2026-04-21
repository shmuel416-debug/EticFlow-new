/**
 * EthicFlow — Reviewer Diff Page
 * Compares submission versions and highlights changed fields.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api'

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
    return value.reduce((acc, item, index) => ({ ...acc, ...flatten(item, `${prefix}[${index}]`) }), {})
  }
  return Object.entries(value).reduce((acc, [key, val]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return { ...acc, ...flatten(val, next) }
  }, {})
}

/**
 * Builds comparison rows between versions.
 * @param {Record<string,string>} fromMap
 * @param {Record<string,string>} toMap
 * @returns {Array<{path:string, from:string, to:string, type:string}>}
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
    rows.push({ path: key, from: before ?? '—', to: after ?? '—', type })
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Reviewer diff page with version selectors.
 * @returns {JSX.Element}
 */
export default function ReviewDiffPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submission, setSubmission] = useState(null)
  const [fromVersion, setFromVersion] = useState('')
  const [toVersion, setToVersion] = useState('')

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
  const stats = useMemo(() => ({
    added: rows.filter((r) => r.type === 'added').length,
    removed: rows.filter((r) => r.type === 'removed').length,
    updated: rows.filter((r) => r.type === 'updated').length,
  }), [rows])

  return (
    <main id="main-content" className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Link to={`/reviewer/assignments/${id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--lev-teal-text)' }}>
          {t('reviewer.diff.backToAssignment')}
        </Link>
        <h1 className="text-lg md:text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('reviewer.diff.title')}
        </h1>
      </div>

      {loading && <p className="text-sm text-gray-500 py-4">{t('common.loading')}</p>}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {!loading && !error && (
        <section className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
          {versions.length < 2 && (
            <p className="text-sm text-gray-500">{t('reviewer.diff.notEnoughVersions')}</p>
          )}

          {versions.length >= 2 && (
            <>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <label className="text-sm">
                  <span className="block text-xs text-gray-600 mb-1">{t('reviewer.diff.fromVersion')}</span>
                  <select value={fromVersion} onChange={(e) => setFromVersion(e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px]">
                    {versions.map((v) => <option key={`from-${v.id}`} value={String(v.versionNum)}>v{v.versionNum}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-600 mb-1">{t('reviewer.diff.toVersion')}</span>
                  <select value={toVersion} onChange={(e) => setToVersion(e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px]">
                    {versions.map((v) => <option key={`to-${v.id}`} value={String(v.versionNum)}>v{v.versionNum}</option>)}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">{t('reviewer.diff.updatedCount', { count: stats.updated })}</span>
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">{t('reviewer.diff.addedCount', { count: stats.added })}</span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{t('reviewer.diff.removedCount', { count: stats.removed })}</span>
              </div>

              {rows.length === 0 && (
                <p className="text-sm text-gray-500">{t('reviewer.diff.noChanges')}</p>
              )}

              {rows.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-start">{t('reviewer.diff.fieldPath')}</th>
                        <th className="px-3 py-2 text-start">{t('reviewer.diff.fromValue')}</th>
                        <th className="px-3 py-2 text-start">{t('reviewer.diff.toValue')}</th>
                        <th className="px-3 py-2 text-start">{t('reviewer.diff.changeType')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.path} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{row.path}</td>
                          <td className="px-3 py-2 whitespace-pre-wrap break-words">{row.from}</td>
                          <td className="px-3 py-2 whitespace-pre-wrap break-words">{row.to}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              row.type === 'added'
                                ? 'bg-green-100 text-green-700'
                                : row.type === 'removed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                            >
                              {t(`reviewer.diff.type.${row.type}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  )
}
