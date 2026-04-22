/**
 * EthicFlow — Status Management Page
 * Admin UI for statuses, transitions, and role-action permissions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import useStatusConfig, { invalidateStatusConfigCache } from '../../hooks/useStatusConfig'

const ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']
const ACTIONS = ['VIEW', 'EDIT', 'COMMENT', 'UPLOAD_DOC', 'DELETE_DOC', 'VIEW_INTERNAL', 'TRANSITION', 'ASSIGN', 'SUBMIT_REVIEW', 'RECORD_DECISION']
const TABS = ['statuses', 'transitions', 'permissions']

/**
 * Builds an empty status form object.
 * @returns {any}
 */
function createEmptyStatusForm() {
  return {
    code: '',
    labelHe: '',
    labelEn: '',
    color: '#64748b',
    orderIndex: 0,
    isInitial: false,
    isTerminal: false,
    slaPhase: null,
    notificationType: null,
  }
}

/**
 * Swaps two status rows by index.
 * @param {any[]} list
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {any[]}
 */
function swapStatusRows(list, fromIndex, toIndex) {
  const next = [...list]
  const temp = next[fromIndex]
  next[fromIndex] = next[toIndex]
  next[toIndex] = temp
  return next
}

export default function StatusManagementPage() {
  const { t } = useTranslation()
  const statusConfig = useStatusConfig()
  const [activeTab, setActiveTab] = useState('statuses')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [statuses, setStatuses] = useState([])
  const [selectedStatusId, setSelectedStatusId] = useState('')
  const [newStatus, setNewStatus] = useState(createEmptyStatusForm())
  const [transitionDraft, setTransitionDraft] = useState({})
  const [permissionDraft, setPermissionDraft] = useState({})

  const selectedStatus = useMemo(
    () => statuses.find((item) => item.id === selectedStatusId) || null,
    [statuses, selectedStatusId]
  )

  const loadStatuses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/admin/statuses')
      const rows = response.data?.data || []
      setStatuses(rows)
      setSelectedStatusId((prev) => prev || rows[0]?.id || '')
    } catch {
      setError(t('statusManagement.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadStatuses()
  }, [loadStatuses])

  useEffect(() => {
    if (!selectedStatus) return
    const transitionMap = {}
    const transitions = selectedStatus.transitionsFrom || []
    for (const transition of transitions) {
      transitionMap[transition.toStatus.code] = {
        enabled: true,
        allowedRoles: transition.allowedRoles || [],
        requireReviewerAssigned: Boolean(transition.requireReviewerAssigned),
      }
    }
    setTransitionDraft(transitionMap)

    const permissions = selectedStatus.permissions || []
    const map = {}
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        map[`${role}:${action}`] = false
      }
    }
    for (const permission of permissions) {
      map[`${permission.role}:${permission.action}`] = Boolean(permission.allowed)
    }
    setPermissionDraft(map)
  }, [selectedStatus])

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }

  async function refreshAll() {
    await loadStatuses()
    invalidateStatusConfigCache()
    await statusConfig.reload()
  }

  async function handleCreateStatus() {
    setSaving(true)
    setError('')
    try {
      await api.post('/admin/statuses', {
        ...newStatus,
        code: newStatus.code.trim().toUpperCase(),
      })
      setNewStatus(createEmptyStatusForm())
      await refreshAll()
      showToast(t('statusManagement.saved'))
    } catch {
      setError(t('statusManagement.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateStatus(statusId, patch) {
    setSaving(true)
    setError('')
    try {
      await api.put(`/admin/statuses/${statusId}`, patch)
      await refreshAll()
      showToast(t('statusManagement.saved'))
    } catch {
      setError(t('statusManagement.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteStatus(statusId) {
    setSaving(true)
    setError('')
    try {
      await api.delete(`/admin/statuses/${statusId}`)
      await refreshAll()
      showToast(t('statusManagement.deleted'))
    } catch {
      setError(t('statusManagement.deleteError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleReorder(nextStatuses) {
    setSaving(true)
    setError('')
    try {
      const items = nextStatuses.map((status, index) => ({
        id: status.id,
        orderIndex: (index + 1) * 10,
      }))
      await api.put('/admin/statuses/reorder', { items })
      await refreshAll()
      showToast(t('statusManagement.saved'))
    } catch {
      setError(t('statusManagement.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function saveTransitions() {
    if (!selectedStatus) return
    setSaving(true)
    setError('')
    try {
      const transitions = Object.entries(transitionDraft)
        .filter(([, value]) => value.enabled)
        .map(([toCode, value]) => ({
          toCode,
          allowedRoles: value.allowedRoles,
          requireReviewerAssigned: Boolean(value.requireReviewerAssigned),
        }))
      await api.put(`/admin/statuses/${selectedStatus.id}/transitions`, { transitions })
      await refreshAll()
      showToast(t('statusManagement.saved'))
    } catch {
      setError(t('statusManagement.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function savePermissions() {
    if (!selectedStatus) return
    setSaving(true)
    setError('')
    try {
      const permissions = []
      for (const role of ROLES) {
        for (const action of ACTIONS) {
          permissions.push({
            role,
            action,
            allowed: Boolean(permissionDraft[`${role}:${action}`]),
          })
        }
      }
      await api.put(`/admin/statuses/${selectedStatus.id}/permissions`, { permissions })
      await refreshAll()
      showToast(t('statusManagement.saved'))
    } catch {
      setError(t('statusManagement.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5" style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, #2d4db5 100%)' }}>
        <h1 className="text-xl font-bold text-white">{t('statusManagement.title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('statusManagement.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-2 flex gap-2 overflow-auto" role="tablist" aria-label={t('statusManagement.tabsLabel')}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              >
                {t(`statusManagement.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm" role="alert">{error}</div>}
          {toast && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm" aria-live="polite">{toast}</div>}

          {loading && (
            <div className="flex justify-center py-16 text-sm text-gray-500">{t('common.loading')}</div>
          )}

          {!loading && activeTab === 'statuses' && (
            <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--lev-navy)' }}>{t('statusManagement.tabs.statuses')}</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  <input data-testid="status-mgmt-add-code" value={newStatus.code} onChange={(e) => setNewStatus((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder={t('statusManagement.fields.code')} className="border rounded-lg px-3 py-2 text-sm" />
                  <input data-testid="status-mgmt-add-label-he" value={newStatus.labelHe} onChange={(e) => setNewStatus((prev) => ({ ...prev, labelHe: e.target.value }))}
                    placeholder={t('statusManagement.fields.labelHe')} className="border rounded-lg px-3 py-2 text-sm" />
                  <input data-testid="status-mgmt-add-label-en" value={newStatus.labelEn} onChange={(e) => setNewStatus((prev) => ({ ...prev, labelEn: e.target.value }))}
                    placeholder={t('statusManagement.fields.labelEn')} className="border rounded-lg px-3 py-2 text-sm" />
                  <input data-testid="status-mgmt-add-color" type="color" value={newStatus.color} onChange={(e) => setNewStatus((prev) => ({ ...prev, color: e.target.value }))}
                    className="border rounded-lg px-1 py-1 h-[44px]" />
                  <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={newStatus.isInitial} onChange={(e) => setNewStatus((prev) => ({ ...prev, isInitial: e.target.checked }))} />{t('statusManagement.fields.isInitial')}</label>
                  <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={newStatus.isTerminal} onChange={(e) => setNewStatus((prev) => ({ ...prev, isTerminal: e.target.checked }))} />{t('statusManagement.fields.isTerminal')}</label>
                  <button data-testid="status-mgmt-add-submit" type="button" onClick={handleCreateStatus} disabled={saving} className="rounded-lg bg-blue-700 text-white text-sm px-3 py-2 min-h-[44px]">
                    {t('statusManagement.addStatus')}
                  </button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-start">{t('statusManagement.fields.code')}</th>
                        <th className="px-3 py-2 text-start">{t('statusManagement.fields.labelHe')}</th>
                        <th className="px-3 py-2 text-start">{t('statusManagement.fields.labelEn')}</th>
                        <th className="px-3 py-2 text-start">{t('statusManagement.fields.color')}</th>
                        <th className="px-3 py-2 text-start">{t('statusManagement.fields.isTerminal')}</th>
                        <th className="px-3 py-2 text-start">{t('statusManagement.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statuses.map((status, index) => (
                        <tr key={status.id} className="border-t" data-testid={`status-row-${status.code}`}>
                          <td className="px-3 py-2 font-mono text-xs">{status.code}</td>
                          <td className="px-3 py-2">{status.labelHe}</td>
                          <td className="px-3 py-2">{status.labelEn}</td>
                          <td className="px-3 py-2"><span className="inline-block rounded-full w-6 h-6 border" style={{ backgroundColor: status.color }} /></td>
                          <td className="px-3 py-2">{status.isTerminal ? t('common.yes') : t('common.no')}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              <button data-testid={`status-select-${status.code}`} type="button" onClick={() => setSelectedStatusId(status.id)} className="px-2 py-1 border rounded text-xs min-h-[32px]">{t('statusManagement.select')}</button>
                              <button type="button" onClick={() => handleUpdateStatus(status.id, { ...status, code: status.code })} className="px-2 py-1 border rounded text-xs min-h-[32px]">{t('common.save')}</button>
                              <button data-testid={`status-delete-${status.code}`} type="button" onClick={() => handleDeleteStatus(status.id)} disabled={status.isSystem} className="px-2 py-1 border rounded text-xs min-h-[32px] disabled:opacity-40">{t('common.delete')}</button>
                              <button type="button" onClick={() => index > 0 && handleReorder(swapStatusRows(statuses, index, index - 1))} disabled={index === 0} className="px-2 py-1 border rounded text-xs min-h-[32px] disabled:opacity-40">↑</button>
                              <button type="button" onClick={() => index < statuses.length - 1 && handleReorder(swapStatusRows(statuses, index, index + 1))} disabled={index === statuses.length - 1} className="px-2 py-1 border rounded text-xs min-h-[32px] disabled:opacity-40">↓</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {!loading && activeTab === 'transitions' && selectedStatus && (
            <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--lev-navy)' }}>{t('statusManagement.transitionsFor', { status: selectedStatus.code })}</h2>
              </div>
              <div className="p-4 space-y-3">
                {statuses.filter((status) => status.id !== selectedStatus.id).map((target) => {
                  const draft = transitionDraft[target.code] || { enabled: false, allowedRoles: [], requireReviewerAssigned: false }
                  return (
                    <div key={target.id} className="border rounded-lg p-3 space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(e) => setTransitionDraft((prev) => ({
                            ...prev,
                            [target.code]: { ...draft, enabled: e.target.checked },
                          }))}
                        />
                        {`${selectedStatus.code} → ${target.code}`}
                      </label>
                      {draft.enabled && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {ROLES.map((role) => {
                              const checked = draft.allowedRoles.includes(role)
                              return (
                                <label key={role} className="text-xs border rounded px-2 py-1 flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => setTransitionDraft((prev) => ({
                                      ...prev,
                                      [target.code]: {
                                        ...draft,
                                        allowedRoles: e.target.checked
                                          ? [...draft.allowedRoles, role]
                                          : draft.allowedRoles.filter((item) => item !== role),
                                      },
                                    }))}
                                  />
                                  {t(`roles.${role}`)}
                                </label>
                              )
                            })}
                          </div>
                          <label className="text-xs flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft.requireReviewerAssigned}
                              onChange={(e) => setTransitionDraft((prev) => ({
                                ...prev,
                                [target.code]: {
                                  ...draft,
                                  requireReviewerAssigned: e.target.checked,
                                },
                              }))}
                            />
                            {t('statusManagement.requireReviewerAssigned')}
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button type="button" onClick={saveTransitions} disabled={saving} className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm min-h-[44px]">
                  {t('common.save')}
                </button>
              </div>
            </section>
          )}

          {!loading && activeTab === 'permissions' && selectedStatus && (
            <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--lev-navy)' }}>{t('statusManagement.permissionsFor', { status: selectedStatus.code })}</h2>
              </div>
              <div className="p-4 space-y-3 overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('statusManagement.action')}</th>
                      {ROLES.map((role) => (
                        <th key={role} className="px-3 py-2 text-start">{t(`roles.${role}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ACTIONS.map((action) => (
                      <tr key={action} className="border-t">
                        <td className="px-3 py-2 text-xs font-semibold">{t(`statusManagement.actionsMap.${action}`)}</td>
                        {ROLES.map((role) => (
                          <td key={`${action}-${role}`} className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(permissionDraft[`${role}:${action}`])}
                              onChange={(e) => setPermissionDraft((prev) => ({
                                ...prev,
                                [`${role}:${action}`]: e.target.checked,
                              }))}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={savePermissions} disabled={saving} className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm min-h-[44px]">
                  {t('common.save')}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
