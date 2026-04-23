/**
 * EthicFlow — Admin Users Page
 * Full CRUD for system users. Admin-only.
 * Features: search, role filter, status filter, impersonation, edit, deactivate, add user.
 * IS 5568 / WCAG 2.2 AA: 44px targets, aria-labels, keyboard navigation.
 * Responsive: Table primitive provides mobile card fallback.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, UserCheck, Search, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  Button, IconButton, Card, Badge, PageHeader, Input, Select, FormField,
  Table, Modal,
} from '../../components/ui'

const ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']

/** Maps a role to a semantic badge tone. */
const ROLE_TONES = {
  RESEARCHER: 'navy',
  SECRETARY:  'purple',
  REVIEWER:   'success',
  CHAIRMAN:   'gold',
  ADMIN:      'danger',
}

/**
 * Returns normalized user roles array with RESEARCHER enforced.
 * @param {string[]|undefined} roles
 * @returns {string[]}
 */
function normalizeRoles(roles) {
  const deduped = [...new Set(Array.isArray(roles) ? roles : ['RESEARCHER'])]
  if (!deduped.includes('RESEARCHER')) deduped.push('RESEARCHER')
  return deduped
}

/**
 * Admin Users management page — list, create, update, deactivate, impersonate.
 * @returns {JSX.Element}
 */
export default function UsersPage() {
  const { t, i18n }                              = useTranslation()
  const { startImpersonation, isImpersonating }  = useAuth()
  const navigate                                 = useNavigate()
  const isRtl = i18n.dir() === 'rtl'

  const [users, setUsers]           = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalOpen, setModalOpen]   = useState(false)
  const [editUser, setEditUser]     = useState(null) // null = create mode
  const [formData, setFormData]     = useState({ fullName: '', email: '', roles: ['RESEARCHER'], department: '', phone: '', password: '' })
  const [formError, setFormError]   = useState(null)
  const [saving, setSaving]         = useState(false)

  const LIMIT = 20

  /**
   * Fetches users from API with current filters and pagination.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (search)       params.set('search', search)
      if (roleFilter)   params.set('role', roleFilter)
      if (statusFilter) params.set('status', statusFilter)

      const { data } = await api.get(`/users/admin/users?${params}`)
      setUsers(data.data)
      setTotal(data.pagination.total)
    } catch (err) {
      setError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter, t])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  /**
   * Opens the create/edit modal.
   * @param {object|null} user - null for create mode
   */
  function openModal(user = null) {
    setEditUser(user)
    const initialRoles = normalizeRoles(user?.roles ?? (user?.role ? [user.role] : ['RESEARCHER']))
    setFormData(user
      ? { fullName: user.fullName, email: user.email, roles: initialRoles, department: user.department ?? '', phone: user.phone ?? '', password: '' }
      : { fullName: '', email: '', roles: ['RESEARCHER'], department: '', phone: '', password: '' }
    )
    setFormError(null)
    setModalOpen(true)
  }

  /**
   * Saves user (create or update).
   */
  async function handleSave() {
    setSaving(true)
    setFormError(null)
    try {
      const payload = { ...formData }
      if (!payload.password) delete payload.password
      payload.roles = normalizeRoles(payload.roles)
      if (editUser) {
        await api.put(`/users/admin/users/${editUser.id}`, { fullName: payload.fullName, roles: payload.roles, department: payload.department, phone: payload.phone })
      } else {
        await api.post('/users/admin/users', payload)
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      setFormError(err.message || t('errors.SERVER_ERROR'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Deactivates a user after confirmation.
   * @param {object} user
   */
  async function handleDeactivate(user) {
    if (!window.confirm(t('admin.confirmDeactivate'))) return
    try {
      await api.patch(`/users/admin/users/${user.id}/deactivate`)
      fetchUsers()
    } catch (err) {
      alert(err.message || t('errors.SERVER_ERROR'))
    }
  }

  /**
   * Starts impersonation for the given user.
   * @param {object} user
   */
  async function handleImpersonate(user) {
    try {
      await startImpersonation(user.id)
      navigate('/dashboard')
    } catch (err) {
      alert(err.message || t('errors.SERVER_ERROR'))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft  : ChevronRight

  const columns = [
    {
      key: 'fullName',
      header: t('auth.register.fullName'),
      render: (u) => <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.fullName}</span>,
    },
    {
      key: 'email',
      header: t('auth.register.email'),
      render: (u) => <span style={{ color: 'var(--text-secondary)' }}>{u.email}</span>,
      hideOnMobile: false,
    },
    {
      key: 'roles',
      header: t('roles.role'),
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles ?? [u.role]).map((role) => (
            <Badge key={`${u.id}-${role}`} tone={ROLE_TONES[role] ?? 'neutral'} size="sm">
              {t(`roles.${role.toLowerCase()}`)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'department',
      header: t('admin.department'),
      render: (u) => u.department ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (u) => (
        <Badge tone={u.isActive ? 'success' : 'neutral'} size="sm">
          {u.isActive ? t('admin.active') : t('admin.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'end',
      render: (u) => (
        <div className="flex items-center gap-1 justify-end">
          {!isImpersonating && !(u.roles ?? [u.role]).includes('ADMIN') && u.isActive && (
            <IconButton
              icon={UserCheck}
              label={`${t('admin.impersonate')} ${u.fullName}`}
              onClick={() => handleImpersonate(u)}
            />
          )}
          <IconButton
            icon={Pencil}
            label={`${t('admin.editUser')} ${u.fullName}`}
            onClick={() => openModal(u)}
          />
          {u.isActive && (
            <IconButton
              icon={Trash2}
              label={`${t('admin.deactivate')} ${u.fullName}`}
              onClick={() => handleDeactivate(u)}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={t('admin.usersPage')}
        subtitle={`${total} ${t('nav.users')}`}
        backTo="/dashboard"
        actions={
          <Button
            variant="gold"
            leftIcon={<Plus size={18} strokeWidth={2} aria-hidden="true" focusable="false" />}
            onClick={() => openModal()}
            aria-label={t('admin.addUser')}
          >
            {t('admin.addUser')}
          </Button>
        }
      />

      {/* Filter toolbar */}
      <Card className="mb-4">
        <div className="p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              icon={Search}
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={t('admin.searchUsers')}
              aria-label={t('admin.searchUsers')}
            />
          </div>
          <div className="min-w-[160px]">
            <Select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              aria-label={t('admin.filterRole')}
            >
              <option value="">{t('admin.allRoles')}</option>
              {ROLES.map(r => <option key={r} value={r}>{t(`roles.${r.toLowerCase()}`)}</option>)}
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              aria-label={t('admin.filterStatus')}
            >
              <option value="">{t('admin.allStatuses')}</option>
              <option value="active">{t('admin.active')}</option>
              <option value="inactive">{t('admin.inactive')}</option>
            </Select>
          </div>
        </div>
      </Card>

      {error && (
        <div
          role="alert"
          className="mb-4 text-sm font-medium"
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

      <Card>
        <Table
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={loading}
          caption={t('admin.usersPage')}
          emptyTitle={t('admin.noUsers')}
        />
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <IconButton
            icon={PrevIcon}
            label={t('common.prevPage')}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          />
          <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <IconButton
            icon={NextIcon}
            label={t('common.nextPage')}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          />
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? t('admin.editUser') : t('admin.addUser')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button variant="gold" onClick={handleSave} loading={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </>
        }
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 text-sm font-medium"
            style={{
              background: 'var(--status-danger-50)',
              color: 'var(--status-danger)',
              border: '1px solid var(--status-danger)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 12px',
            }}
          >
            {formError}
          </div>
        )}

        <div className="space-y-4">
          {[
            { key: 'fullName',   label: t('auth.register.fullName'), type: 'text',     required: true },
            { key: 'email',      label: t('auth.register.email'),    type: 'email',    required: !editUser },
            { key: 'department', label: t('admin.department'),       type: 'text' },
            { key: 'phone',      label: t('admin.phone'),            type: 'tel' },
            { key: 'password',   label: t('admin.password'),         type: 'password' },
          ].map(({ key, label, type, required }) => (
            <FormField
              key={key}
              label={label}
              required={required}
              render={({ inputId, describedBy, required: req, invalid }) => (
                <Input
                  id={inputId}
                  type={type}
                  value={formData[key]}
                  onChange={(e) => setFormData(d => ({ ...d, [key]: e.target.value }))}
                  disabled={key === 'email' && !!editUser}
                  aria-required={req || undefined}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  dir={type === 'email' || type === 'tel' ? 'ltr' : undefined}
                />
              )}
            />
          ))}

          <FormField
            label={t('roles.role')}
            required
            render={() => (
              <div
                className="space-y-2 px-3 py-2"
                style={{
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface-raised)',
                }}
              >
                {ROLES.map((role) => {
                  const checked = formData.roles.includes(role)
                  const locked = role === 'RESEARCHER'
                  return (
                    <label key={role} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.roles, role]
                            : formData.roles.filter((r) => r !== role)
                          setFormData((d) => ({ ...d, roles: normalizeRoles(next) }))
                        }}
                        className="w-4 h-4"
                      />
                      <span>{t(`roles.${role.toLowerCase()}`)}</span>
                    </label>
                  )
                })}
              </div>
            )}
          />
        </div>
      </Modal>
    </div>
  )
}
