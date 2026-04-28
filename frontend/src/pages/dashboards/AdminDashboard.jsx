/**
 * EthicFlow — Admin Dashboard
 * Lev palette + design-system primitives. KPIs from API: user count,
 * form library size, health check. Quick links to common admin tasks.
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Users, ShieldCheck, FileText, Workflow, FolderOpen, ArrowRight, ListChecks } from 'lucide-react'
import api from '../../services/api'
import { Card, CardBody, CardHeader, PageHeader, StatCard } from '../../components/ui'

/** Secondary outline style matching design-system Button (for router Links). */
const QUICK_LINK_STYLE = {
  background: '#fff',
  color: 'var(--lev-navy)',
  border: '1px solid var(--border-default)',
  minHeight: 44,
  padding: '0 16px',
  fontSize: 14,
  borderRadius: 'var(--radius-xl)',
  textDecoration: 'none',
  fontWeight: 600,
}

/**
 * Admin dashboard with live KPIs and shortcuts.
 * @returns {JSX.Element}
 */
export default function AdminDashboard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [userTotal, setUserTotal] = useState(null)
  const [formCount, setFormCount] = useState(null)
  const [healthOk, setHealthOk] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      const [usersR, formsR, healthR] = await Promise.allSettled([
        api.get('/users/admin/users?page=1&limit=1'),
        api.get('/forms'),
        api.get('/health'),
      ])
      if (cancelled) return

      if (usersR.status === 'fulfilled') {
        setUserTotal(usersR.value.data.pagination?.total ?? 0)
      } else {
        setUserTotal(null)
      }
      if (formsR.status === 'fulfilled') {
        setFormCount((formsR.value.data.forms ?? []).length)
      } else {
        setFormCount(null)
      }
      if (healthR.status === 'fulfilled' && healthR.value.data?.status === 'ok') {
        setHealthOk(true)
      } else {
        setHealthOk(false)
      }

      const failed = usersR.status === 'rejected' || formsR.status === 'rejected'
      if (failed) {
        setLoadError(t('dashboard.admin.loadError'))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [t])

  const healthLabel = healthOk === true
    ? t('dashboard.admin.healthOk')
    : healthOk === false
      ? t('dashboard.admin.healthError')
      : '—'
  const healthTone = healthOk === true ? 'success' : healthOk === false ? 'danger' : 'muted'

  const fmt = (n) => (loading ? '—' : n === null ? '—' : n)

  return (
    <div className="space-y-5">
      <PageHeader title={t('dashboard.admin.title')} />

      {loadError && (
        <div
          role="alert"
          className="text-sm font-medium"
          style={{
            background: 'var(--status-warning-50)',
            color: 'var(--status-warning)',
            border: '1px solid var(--status-warning)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          value={fmt(userTotal)}
          label={t('dashboard.admin.totalUsers')}
          tone="navy"
          icon={Users}
          aria-busy={loading}
        />
        <StatCard
          value={fmt(formCount)}
          label={t('dashboard.admin.totalForms')}
          tone="teal"
          icon={FileText}
          aria-busy={loading}
        />
        <StatCard
          value={loading ? '—' : healthLabel}
          label={t('dashboard.admin.systemHealth')}
          tone={healthTone}
          icon={ShieldCheck}
          aria-busy={loading}
        />
      </div>

      <Card>
        <CardHeader title={t('dashboard.admin.quickLinks')} />
        <CardBody>
          <ul className="flex flex-col sm:flex-row flex-wrap gap-2 list-none p-0 m-0">
            <li>
              <Link
                to="/users"
                className="inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={QUICK_LINK_STYLE}
              >
                <Users className="w-4 h-4 shrink-0" aria-hidden />
                {t('dashboard.admin.linkUsers')}
                <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                to="/admin/statuses"
                className="inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={QUICK_LINK_STYLE}
              >
                <Workflow className="w-4 h-4 shrink-0" aria-hidden />
                {t('dashboard.admin.linkStatuses')}
                <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                to="/secretary/forms"
                className="inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={QUICK_LINK_STYLE}
              >
                <FolderOpen className="w-4 h-4 shrink-0" aria-hidden />
                {t('dashboard.admin.linkForms')}
                <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                to="/admin/checklist-templates"
                className="inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={QUICK_LINK_STYLE}
              >
                <ListChecks className="w-4 h-4 shrink-0" aria-hidden />
                {t('dashboard.admin.linkChecklistTemplates')}
                <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
