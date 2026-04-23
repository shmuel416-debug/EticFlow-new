/**
 * EthicFlow — Dashboard Router
 * Renders the correct dashboard based on the authenticated user's role.
 */

import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ResearcherDashboard from './dashboards/ResearcherDashboard'
import SecretaryDashboard  from './dashboards/SecretaryDashboard'
import ReviewerDashboard   from './dashboards/ReviewerDashboard'
import ChairmanDashboard   from './dashboards/ChairmanDashboard'
import AdminDashboard      from './dashboards/AdminDashboard'

const ROLE_DASHBOARDS = {
  RESEARCHER: ResearcherDashboard,
  SECRETARY:  SecretaryDashboard,
  REVIEWER:   ReviewerDashboard,
  CHAIRMAN:   ChairmanDashboard,
  ADMIN:      AdminDashboard,
}

/**
 * Selects and renders the dashboard for the current user's role.
 */
export default function DashboardPage() {
  const { user }   = useAuth()
  const { t }      = useTranslation()
  const Dashboard  = ROLE_DASHBOARDS[user?.activeRole || user?.role]

  if (!Dashboard) {
    return (
      <div className="text-center py-20 text-gray-600">
        {t('common.error')} — {t('errors.UNAUTHORIZED')}
      </div>
    )
  }

  return <Dashboard />
}
