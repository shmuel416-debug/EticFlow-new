/**
 * EthicFlow — useStatusConfig Hook
 * Loads dynamic status config from backend and exposes mapped helpers.
 */

import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const sharedConfigByKey = new Map()
const sharedLoadedAtByKey = new Map()
const inFlightByKey = new Map()
const CACHE_TTL_MS = 30_000

const FALLBACK_STATUSES = [
  { code: 'DRAFT', labelHe: 'טיוטה', labelEn: 'Draft', color: '#64748b', orderIndex: 10, isInitial: true, isTerminal: false },
  { code: 'SUBMITTED', labelHe: 'הוגש', labelEn: 'Submitted', color: '#2563eb', orderIndex: 20, isInitial: false, isTerminal: false },
  { code: 'IN_TRIAGE', labelHe: 'בבדיקה ראשונית', labelEn: 'In Triage', color: '#ca8a04', orderIndex: 30, isInitial: false, isTerminal: false },
  { code: 'ASSIGNED', labelHe: 'הוקצה לסוקר', labelEn: 'Assigned', color: '#ea580c', orderIndex: 40, isInitial: false, isTerminal: false },
  { code: 'IN_REVIEW', labelHe: 'בביקורת', labelEn: 'In Review', color: '#7c3aed', orderIndex: 50, isInitial: false, isTerminal: false },
  { code: 'PENDING_REVISION', labelHe: 'ממתין לתיקון', labelEn: 'Pending Revision', color: '#dc2626', orderIndex: 60, isInitial: false, isTerminal: false },
  { code: 'APPROVED', labelHe: 'אושר', labelEn: 'Approved', color: '#16a34a', orderIndex: 70, isInitial: false, isTerminal: true },
  { code: 'REJECTED', labelHe: 'נדחה', labelEn: 'Rejected', color: '#b91c1c', orderIndex: 80, isInitial: false, isTerminal: true },
  { code: 'WITHDRAWN', labelHe: 'בוטל', labelEn: 'Withdrawn', color: '#6b7280', orderIndex: 90, isInitial: false, isTerminal: true },
  { code: 'CONTINUED', labelHe: 'המשך', labelEn: 'Continued', color: '#0d9488', orderIndex: 100, isInitial: false, isTerminal: true },
]

const FALLBACK_TRANSITIONS = {
  SUBMITTED: [{ fromCode: 'SUBMITTED', toCode: 'IN_TRIAGE' }],
  IN_TRIAGE: [{ fromCode: 'IN_TRIAGE', toCode: 'ASSIGNED' }],
  ASSIGNED: [{ fromCode: 'ASSIGNED', toCode: 'IN_REVIEW' }],
  IN_REVIEW: [
    { fromCode: 'IN_REVIEW', toCode: 'APPROVED' },
    { fromCode: 'IN_REVIEW', toCode: 'REJECTED' },
    { fromCode: 'IN_REVIEW', toCode: 'PENDING_REVISION' },
  ],
  PENDING_REVISION: [{ fromCode: 'PENDING_REVISION', toCode: 'SUBMITTED' }],
}

/**
 * Fetches status configuration with short-lived cache.
 * @param {{ submissionId?: string|null, status?: string|null }} options
 * @returns {Promise<{ statuses: any[], transitionsByFromCode: Record<string, any[]> }>}
 */
async function fetchConfig(options = {}) {
  const submissionId = options.submissionId || null
  const status = options.status || null
  const cacheKey = `${submissionId || '_'}:${status || '_'}`
  const cachedConfig = sharedConfigByKey.get(cacheKey)
  const loadedAt = sharedLoadedAtByKey.get(cacheKey) || 0
  const cacheFresh = cachedConfig && Date.now() - loadedAt < CACHE_TTL_MS
  if (cacheFresh) return cachedConfig
  const inFlight = inFlightByKey.get(cacheKey)
  if (inFlight) return inFlight

  const params = new URLSearchParams()
  if (submissionId) params.set('submissionId', submissionId)
  if (status) params.set('status', status)
  const query = params.toString()

  const request = api.get(`/statuses/config${query ? `?${query}` : ''}`)
    .then((response) => {
      const config = {
        statuses: response?.data?.data?.statuses || FALLBACK_STATUSES,
        transitionsByFromCode: response?.data?.data?.transitionsByFromCode || FALLBACK_TRANSITIONS,
      }
      sharedConfigByKey.set(cacheKey, config)
      sharedLoadedAtByKey.set(cacheKey, Date.now())
      return config
    })
    .catch(() => ({
      statuses: FALLBACK_STATUSES,
      transitionsByFromCode: FALLBACK_TRANSITIONS,
    }))
    .finally(() => {
      inFlightByKey.delete(cacheKey)
    })

  inFlightByKey.set(cacheKey, request)
  return request
}

/**
 * Clears local in-memory config cache.
 * @returns {void}
 */
export function invalidateStatusConfigCache() {
  sharedConfigByKey.clear()
  sharedLoadedAtByKey.clear()
  inFlightByKey.clear()
}

/**
 * Hook that provides statuses and transition metadata.
 * @param {{ submissionId?: string|null, status?: string|null }} [options]
 * @returns {{ statuses: any[], statusMap: Record<string, any>, transitionsByFromCode: Record<string, any[]>, loading: boolean, reload: () => Promise<void> }}
 */
export default function useStatusConfig(options = {}) {
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES)
  const [transitionsByFromCode, setTransitionsByFromCode] = useState(FALLBACK_TRANSITIONS)
  const [loading, setLoading] = useState(true)
  const submissionId = options.submissionId || null
  const status = options.status || null

  async function load() {
    setLoading(true)
    const config = await fetchConfig({ submissionId, status })
    setStatuses(config.statuses || FALLBACK_STATUSES)
    setTransitionsByFromCode(config.transitionsByFromCode || FALLBACK_TRANSITIONS)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    fetchConfig({ submissionId, status }).then((config) => {
      if (!mounted) return
      setStatuses(config.statuses || FALLBACK_STATUSES)
      setTransitionsByFromCode(config.transitionsByFromCode || FALLBACK_TRANSITIONS)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [submissionId, status])

  const statusMap = useMemo(
    () => Object.fromEntries((statuses || []).map((status) => [status.code, status])),
    [statuses]
  )

  return {
    statuses,
    statusMap,
    transitionsByFromCode,
    loading,
    reload: load,
  }
}
