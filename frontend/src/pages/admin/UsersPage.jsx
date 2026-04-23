/**
 * EthicFlow — Admin Users Page
 * Full CRUD for system users. Admin-only.
 * Features: search, role filter, status filter, impersonation, edit, deactivate, add user.
 * IS 5568 / WCAG 2.2 AA: 44px targets, aria-labels, keyboard navigation.
 * Responsive: card layout on mobile, table on desktop.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']

/** Role badge color map */
const ROLE_COLORS = {
  RESEARCHER: 'bg-blue-100 text-blue-800',
  SECRETARY:  'bg-purple-100 text-purple-800',
  REVIEWER:   'bg-green-100 text-green-800',
  CHAIRMAN:   'bg-amber-100 text-amber-800',
  ADMIN:      'bg-red-100 text-red-800',
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
  const { t }                                    = useTranslation()
  const { startImpersonation, isImpersonating }  = useAuth()
  const navigate                                 = useNavigate()

  const [users, setUsers]           = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  // Filters
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modal state
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

  /* Close modal on Escape */
  useEffect(() => {
    if (!modalOpen) return
    const handler = (e) => { if (e.key === 'Escape') setModalOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [modalOpen])

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

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('admin.usersPage')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} {t('nav.users')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px]
                     hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ background: 'var(--lev-navy)' }}
          aria-label={t('admin.addUser')}
        >
          <span aria-hidden="true">+</span>
          {t('admin.addUser')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder={t('admin.searchUsers')}
          aria-label={t('admin.searchUsers')}
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          aria-label={t('admin.filterRole')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('admin.allRoles')}</option>
          {ROLES.map(r => <option key={r} value={r}>{t(`roles.${r.toLowerCase()}`)}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          aria-label={t('admin.filterStatus')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="active">{t('admin.active')}</option>
          <option value="inactive">{t('admin.inactive')}</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4 mb-4 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div role="status" aria-label={t('common.loading')}
               className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Desktop table */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-right">
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-600">{t('auth.register.fullName')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-600">{t('auth.register.email')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-600">{t('roles.role')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-600">{t('admin.department')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-600">{t('common.status')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">{t('admin.noUsers')}</td>
                  </tr>
                )}
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? [u.role]).map((role) => (
                          <span key={`${u.id}-${role}`} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {t(`roles.${role.toLowerCase()}`)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.department ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? t('admin.active') : t('admin.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!isImpersonating && !(u.roles ?? [u.role]).includes('ADMIN') && u.isActive && (
                          <button
                            onClick={() => handleImpersonate(u)}
                            className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100
                                       min-h-[32px] focus-visible:ring-2 focus-visible:ring-amber-500"
                            aria-label={`${t('admin.impersonate')} ${u.fullName}`}
                          >
                            {t('admin.impersonate')}
                          </button>
                        )}
                        <button
                          onClick={() => openModal(u)}
                          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100
                                     min-h-[32px] focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={`${t('admin.editUser')} ${u.fullName}`}
                        >
                          {t('admin.editUser')}
                        </button>
                        {u.isActive && (
                          <button
                            onClick={() => handleDeactivate(u)}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100
                                       min-h-[32px] focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={`${t('admin.deactivate')} ${u.fullName}`}
                          >
                            {t('admin.deactivate')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {users.length === 0 && (
              <p className="text-center py-12 text-gray-500">{t('admin.noUsers')}</p>
            )}
            {users.map(u => (
              <div key={u.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{u.fullName}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(u.roles ?? [u.role]).map((role) => (
                      <span key={`${u.id}-mobile-${role}`} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'}`}>
                        {t(`roles.${role.toLowerCase()}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {!isImpersonating && !(u.roles ?? [u.role]).includes('ADMIN') && u.isActive && (
                    <button onClick={() => handleImpersonate(u)}
                      aria-label={`${t('admin.impersonate')} ${u.fullName}`}
                      className="text-xs px-3 py-2 rounded bg-amber-50 text-amber-700 min-h-[44px]">
                      {t('admin.impersonate')}
                    </button>
                  )}
                  <button onClick={() => openModal(u)}
                    aria-label={`${t('admin.editUser')} ${u.fullName}`}
                    className="text-xs px-3 py-2 rounded bg-blue-50 text-blue-700 min-h-[44px]">
                    {t('admin.editUser')}
                  </button>
                  {u.isActive && (
                    <button onClick={() => handleDeactivate(u)}
                      aria-label={`${t('admin.deactivate')} ${u.fullName}`}
                      className="text-xs px-3 py-2 rounded bg-red-50 text-red-700 min-h-[44px]">
                      {t('admin.deactivate')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-2 text-sm rounded border border-gray-200 disabled:opacity-40 min-h-[44px]"
            aria-label={t('common.prevPage')}
          >
            ‹
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-2 text-sm rounded border border-gray-200 disabled:opacity-40 min-h-[44px]"
            aria-label={t('common.nextPage')}
          >
            ›
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             role="dialog" aria-modal="true"
             aria-label={editUser ? t('admin.editUser') : t('admin.addUser')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--lev-navy)' }}>
              {editUser ? t('admin.editUser') : t('admin.addUser')}
            </h2>

            {formError && (
              <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">{formError}</div>
            )}

            <div className="space-y-3">
              {[
                { key: 'fullName', label: t('auth.register.fullName'), type: 'text', required: true },
                { key: 'email',    label: t('auth.register.email'),    type: 'email', required: !editUser },
                { key: 'department', label: t('admin.department'), type: 'text' },
                { key: 'phone',    label: t('admin.phone'),            type: 'tel' },
                { key: 'password', label: t('admin.password'),         type: 'password' },
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label htmlFor={`field-${key}`} className="block text-xs font-semibold text-gray-600 mb-1">
                    {label}{required && <span className="text-red-500 ms-0.5" aria-hidden="true">*</span>}
                  </label>
                  <input
                    id={`field-${key}`}
                    type={type}
                    value={formData[key]}
                    onChange={(e) => setFormData(d => ({ ...d, [key]: e.target.value }))}
                    disabled={key === 'email' && !!editUser}
                    aria-required={required}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]
                               focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {t('roles.role')} <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <div className="space-y-2 border border-gray-200 rounded-lg px-3 py-2">
                  {ROLES.map((role) => {
                    const checked = formData.roles.includes(role)
                    const locked = role === 'RESEARCHER'
                    return (
                      <label key={role} className="flex items-center gap-2 text-sm text-gray-700">
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
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-h-[44px]
                           hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold min-h-[44px]
                           hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
                style={{ background: 'var(--lev-navy)' }}
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
