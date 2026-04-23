/**
 * EthicFlow — Status Management Page
 * Admin UI for statuses, transitions, and role-action permissions.
 * Refactored to use design-system primitives. DnD reorder preserved via up/down.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus, Check, Trash2, ArrowUp, ArrowDown, MousePointerClick, ArrowRight,
} from 'lucide-react'
import api from '../../services/api'
import useStatusConfig, { invalidateStatusConfigCache } from '../../hooks/useStatusConfig'
import {
  Button, IconButton, Card, CardHeader, CardBody,
  Badge, PageHeader, Input, Tabs,
} from '../../components/ui'

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

  const tabItems = TABS.map((tab) => ({ key: tab, label: t(`statusManagement.tabs.${tab}`) }))

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={t('statusManagement.title')}
        subtitle={t('statusManagement.subtitle')}
        backTo="/dashboard"
      />

      <div className="space-y-4">
        <Card>
          <div className="p-2">
            <Tabs
              items={tabItems}
              value={activeTab}
              onChange={setActiveTab}
              variant="pills"
              ariaLabel={t('statusManagement.tabsLabel')}
            />
          </div>
        </Card>

        {error && (
          <div
            role="alert"
            className="text-sm"
            style={{
              background: 'var(--status-danger-50)',
              color: 'var(--status-danger)',
              border: '1px solid var(--status-danger)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
            }}
          >
            {error}
          </div>
        )}

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="text-sm"
            style={{
              background: 'var(--status-success-50)',
              color: 'var(--status-success)',
              border: '1px solid var(--status-success)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
            }}
          >
            {toast}
          </div>
        )}

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="flex justify-center py-16 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('common.loading')}
          </div>
        )}

        {!loading && activeTab === 'statuses' && (
          <Card>
            <CardHeader title={t('statusManagement.tabs.statuses')} />
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                  <Input
                    data-testid="status-mgmt-add-code"
                    value={newStatus.code}
                    onChange={(e) => setNewStatus((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder={t('statusManagement.fields.code')}
                    aria-label={t('statusManagement.fields.code')}
                  />
                  <Input
                    data-testid="status-mgmt-add-label-he"
                    value={newStatus.labelHe}
                    onChange={(e) => setNewStatus((prev) => ({ ...prev, labelHe: e.target.value }))}
                    placeholder={t('statusManagement.fields.labelHe')}
                    aria-label={t('statusManagement.fields.labelHe')}
                  />
                  <Input
                    data-testid="status-mgmt-add-label-en"
                    value={newStatus.labelEn}
                    onChange={(e) => setNewStatus((prev) => ({ ...prev, labelEn: e.target.value }))}
                    placeholder={t('statusManagement.fields.labelEn')}
                    aria-label={t('statusManagement.fields.labelEn')}
                  />
                  <input
                    data-testid="status-mgmt-add-color"
                    type="color"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus((prev) => ({ ...prev, color: e.target.value }))}
                    aria-label={t('statusManagement.fields.color')}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      padding: 2,
                      cursor: 'pointer',
                    }}
                  />
                  <label className="text-xs inline-flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={newStatus.isInitial}
                      onChange={(e) => setNewStatus((prev) => ({ ...prev, isInitial: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    {t('statusManagement.fields.isInitial')}
                  </label>
                  <label className="text-xs inline-flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={newStatus.isTerminal}
                      onChange={(e) => setNewStatus((prev) => ({ ...prev, isTerminal: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    {t('statusManagement.fields.isTerminal')}
                  </label>
                  <Button
                    variant="gold"
                    data-testid="status-mgmt-add-submit"
                    onClick={handleCreateStatus}
                    disabled={saving}
                    leftIcon={<Plus size={18} strokeWidth={2} aria-hidden="true" focusable="false" />}
                  >
                    {t('statusManagement.addStatus')}
                  </Button>
                </div>

                <div
                  className="overflow-x-auto"
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--surface-sunken)' }}>
                        <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('statusManagement.fields.code')}</th>
                        <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('statusManagement.fields.labelHe')}</th>
                        <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('statusManagement.fields.labelEn')}</th>
                        <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('statusManagement.fields.color')}</th>
                        <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('statusManagement.fields.isTerminal')}</th>
                        <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('statusManagement.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statuses.map((status, index) => (
                        <tr
                          key={status.id}
                          data-testid={`status-row-${status.code}`}
                          style={{ borderTop: '1px solid var(--border-subtle)' }}
                        >
                          <td className="px-3 py-2">
                            <Badge tone="navy" size="sm" className="font-mono">{status.code}</Badge>
                          </td>
                          <td className="px-3 py-2">{status.labelHe}</td>
                          <td className="px-3 py-2">{status.labelEn}</td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-block"
                              aria-label={status.color}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 'var(--radius-full)',
                                background: status.color,
                                border: '1px solid var(--border-default)',
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {status.isTerminal ? (
                              <Badge tone="success" size="sm">{t('common.yes')}</Badge>
                            ) : (
                              <Badge tone="neutral" size="sm">{t('common.no')}</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              <IconButton
                                icon={MousePointerClick}
                                label={`${t('statusManagement.select')} ${status.code}`}
                                onClick={() => setSelectedStatusId(status.id)}
                                data-testid={`status-select-${status.code}`}
                              />
                              <IconButton
                                icon={Check}
                                label={`${t('common.save')} ${status.code}`}
                                onClick={() => handleUpdateStatus(status.id, { ...status, code: status.code })}
                              />
                              <IconButton
                                icon={Trash2}
                                label={`${t('common.delete')} ${status.code}`}
                                onClick={() => handleDeleteStatus(status.id)}
                                disabled={status.isSystem}
                                data-testid={`status-delete-${status.code}`}
                              />
                              <IconButton
                                icon={ArrowUp}
                                label={`${t('common.prev')} ${status.code}`}
                                onClick={() => index > 0 && handleReorder(swapStatusRows(statuses, index, index - 1))}
                                disabled={index === 0}
                              />
                              <IconButton
                                icon={ArrowDown}
                                label={`${t('common.next')} ${status.code}`}
                                onClick={() => index < statuses.length - 1 && handleReorder(swapStatusRows(statuses, index, index + 1))}
                                disabled={index === statuses.length - 1}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {!loading && activeTab === 'transitions' && selectedStatus && (
          <Card>
            <CardHeader title={t('statusManagement.transitionsFor', { status: selectedStatus.code })} />
            <CardBody>
              <div className="space-y-3">
                {statuses.filter((status) => status.id !== selectedStatus.id).map((target) => {
                  const draft = transitionDraft[target.code] || { enabled: false, allowedRoles: [], requireReviewerAssigned: false }
                  return (
                    <div
                      key={target.id}
                      className="p-3 space-y-2"
                      style={{
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(e) => setTransitionDraft((prev) => ({
                            ...prev,
                            [target.code]: { ...draft, enabled: e.target.checked },
                          }))}
                          className="w-4 h-4"
                        />
                        <span className="inline-flex items-center gap-2">
                          <Badge tone="navy" size="sm">{selectedStatus.code}</Badge>
                          <ArrowRight
                            size={14}
                            strokeWidth={2}
                            aria-hidden="true"
                            focusable="false"
                            className="shrink-0 rtl:rotate-180"
                            style={{ color: 'var(--text-muted)' }}
                          />
                          <Badge tone="purple" size="sm">{target.code}</Badge>
                        </span>
                      </label>
                      {draft.enabled && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {ROLES.map((role) => {
                              const checked = draft.allowedRoles.includes(role)
                              return (
                                <label
                                  key={role}
                                  className="text-xs flex items-center gap-1 px-2 py-1"
                                  style={{
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
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
                                    className="w-4 h-4"
                                  />
                                  {t(`roles.${role}`)}
                                </label>
                              )
                            })}
                          </div>
                          <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
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
                              className="w-4 h-4"
                            />
                            {t('statusManagement.requireReviewerAssigned')}
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button variant="gold" onClick={saveTransitions} loading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {!loading && activeTab === 'permissions' && selectedStatus && (
          <Card>
            <CardHeader title={t('statusManagement.permissionsFor', { status: selectedStatus.code })} />
            <CardBody>
              <div className="space-y-3 overflow-x-auto">
                <table
                  className="w-full text-sm"
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                  }}
                >
                  <thead>
                    <tr style={{ background: 'var(--surface-sunken)' }}>
                      <th scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {t('statusManagement.action')}
                      </th>
                      {ROLES.map((role) => (
                        <th key={role} scope="col" className="px-3 py-2 text-start text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {t(`roles.${role}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ACTIONS.map((action) => (
                      <tr key={action} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <td className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {t(`statusManagement.actionsMap.${action}`)}
                        </td>
                        {ROLES.map((role) => (
                          <td key={`${action}-${role}`} className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(permissionDraft[`${role}:${action}`])}
                              onChange={(e) => setPermissionDraft((prev) => ({
                                ...prev,
                                [`${role}:${action}`]: e.target.checked,
                              }))}
                              aria-label={`${t(`roles.${role}`)} — ${t(`statusManagement.actionsMap.${action}`)}`}
                              className="w-4 h-4"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button variant="gold" onClick={savePermissions} loading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
