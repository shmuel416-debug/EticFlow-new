/**
 * EthicFlow — Tabs primitive (uncontrolled or controlled).
 * Accessible: role="tablist" + role="tab" + aria-selected + arrow-key nav.
 * Two visual styles:
 *   - 'pills' (default): rounded pill buttons, great for filter tabs on list pages
 *   - 'underline': classic underlined tabs for page sections
 */

import React, { useState, useRef, useCallback } from 'react'

/**
 * @typedef {object} TabItem
 * @property {string} key
 * @property {string} label
 * @property {number|string} [count]
 * @property {boolean} [disabled]
 */

/**
 * Tabs component.
 * @param {object} props
 * @param {TabItem[]} props.items
 * @param {string} [props.value] - controlled active key
 * @param {string} [props.defaultValue]
 * @param {(key:string) => void} [props.onChange]
 * @param {'pills'|'underline'} [props.variant='pills']
 * @param {string} [props.ariaLabel]
 * @returns {JSX.Element}
 */
export default function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = 'pills',
  ariaLabel = 'Tabs',
  className = '',
}) {
  const [inner, setInner] = useState(defaultValue ?? items[0]?.key)
  const active = value ?? inner
  const refs = useRef({})

  const handleSelect = useCallback((key) => {
    if (value === undefined) setInner(key)
    onChange?.(key)
  }, [onChange, value])

  const handleKey = useCallback((e, idx) => {
    const keys = items.map(i => i.key)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const delta = e.key === 'ArrowLeft' ? 1 : -1
      const next = (idx + delta + keys.length) % keys.length
      const nextKey = keys[next]
      handleSelect(nextKey)
      refs.current[nextKey]?.focus()
    }
  }, [items, handleSelect])

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-2 flex-wrap ${variant === 'underline' ? 'border-b' : ''} ${className}`}
      style={variant === 'underline' ? { borderColor: 'var(--border-default)' } : undefined}
    >
      {items.map((item, idx) => {
        const isActive = item.key === active
        const base = 'inline-flex items-center gap-2 text-sm font-semibold transition whitespace-nowrap'
        const pillStyle = isActive
          ? { background: 'var(--lev-navy)', color: '#fff' }
          : { background: 'var(--lev-navy-50)', color: 'var(--lev-navy)' }
        const underlineStyle = {
          color: isActive ? 'var(--lev-navy)' : 'var(--text-muted)',
          borderBottom: `2px solid ${isActive ? 'var(--lev-navy)' : 'transparent'}`,
        }

        return (
          <button
            key={item.key}
            ref={(el) => { refs.current[item.key] = el }}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.key}`}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => handleSelect(item.key)}
            onKeyDown={(e) => handleKey(e, idx)}
            className={base}
            style={{
              minHeight: 40,
              padding: variant === 'pills' ? '6px 14px' : '10px 6px',
              borderRadius: variant === 'pills' ? 'var(--radius-full)' : 0,
              marginBottom: variant === 'underline' ? -1 : 0,
              ...(variant === 'pills' ? pillStyle : underlineStyle),
            }}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className="tabular-nums"
                style={{
                  fontSize: 11,
                  opacity: isActive ? 0.9 : 0.7,
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(30,42,114,0.08)',
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
