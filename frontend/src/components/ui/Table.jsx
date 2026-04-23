/**
 * EthicFlow — Table + MobileCardList primitives
 * Declarative table with desktop <table> + automatic mobile card fallback.
 * IS 5568: scope="col" headers, optional <caption>, row keyboard focus.
 */

import React from 'react'
import Skeleton from './Skeleton'
import EmptyState from './EmptyState'

/**
 * @typedef {object} TableColumn
 * @property {string} key
 * @property {string} header
 * @property {(row:any) => React.ReactNode} [render]
 * @property {string} [accessor] - property name on row
 * @property {string} [align] - 'start'|'center'|'end'
 * @property {boolean} [hideOnMobile] - skipped in mobile card view
 * @property {string} [width]
 */

/**
 * Responsive data table with mobile card fallback.
 * @param {object} props
 * @param {TableColumn[]} props.columns
 * @param {any[]} props.rows
 * @param {(row:any) => string|number} props.rowKey
 * @param {string} [props.caption] - visually-hidden table caption (SR)
 * @param {boolean} [props.loading]
 * @param {number} [props.skeletonRows=5]
 * @param {string} [props.emptyTitle]
 * @param {string} [props.emptyDescription]
 * @param {React.ReactNode} [props.emptyAction]
 * @param {(row:any) => void} [props.onRowClick]
 * @param {(row:any) => string} [props.rowAriaLabel]
 * @returns {JSX.Element}
 */
export default function Table({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  skeletonRows = 5,
  emptyTitle = 'אין תוצאות',
  emptyDescription,
  emptyAction,
  onRowClick,
  rowAriaLabel,
}) {
  const isEmpty = !loading && rows.length === 0

  return (
    <div className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          {caption && <caption className="lev-sr-only">{caption}</caption>}
          <thead>
            <tr style={{ background: 'var(--surface-sunken)' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className="text-right px-4 py-2.5 font-semibold text-xs"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-default)',
                    textAlign: col.align || 'start',
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`sk-${r}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton width={`${50 + ((r * 17) % 40)}%`} height={12} />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && rows.map((row) => {
              const key = rowKey(row)
              const clickable = !!onRowClick
              return (
                <tr
                  key={key}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? (rowAriaLabel ? rowAriaLabel(row) : undefined) : undefined}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row) } } : undefined}
                  className={clickable ? 'hover:bg-gray-50 cursor-pointer transition' : ''}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="px-4 py-3 align-middle"
                      style={{ textAlign: col.align || 'start', color: 'var(--text-primary)' }}
                    >
                      {col.render ? col.render(row) : row[col.accessor || col.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {loading && Array.from({ length: skeletonRows }).map((_, r) => (
          <div key={`mk-${r}`} className="p-4 space-y-2">
            <Skeleton width="60%" height={12} />
            <Skeleton width="85%" height={14} />
            <Skeleton width="35%" height={10} />
          </div>
        ))}
        {!loading && rows.map((row) => {
          const key = rowKey(row)
          const clickable = !!onRowClick
          return (
            <div
              key={key}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? (rowAriaLabel ? rowAriaLabel(row) : undefined) : undefined}
              onClick={clickable ? () => onRowClick(row) : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row) } } : undefined}
              className={`p-4 ${clickable ? 'hover:bg-gray-50 cursor-pointer transition' : ''}`}
              style={{ minHeight: 64 }}
            >
              <dl className="space-y-1.5">
                {columns.filter(c => !c.hideOnMobile).map(col => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <dt className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {col.header}
                    </dt>
                    <dd className="text-sm text-right min-w-0" style={{ color: 'var(--text-primary)' }}>
                      {col.render ? col.render(row) : row[col.accessor || col.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
      </div>

      {isEmpty && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}
    </div>
  )
}
