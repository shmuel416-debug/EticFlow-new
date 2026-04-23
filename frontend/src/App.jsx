/**
 * EthicFlow — App Router
 * Public routes: /login, /forgot-password, /reset-password, /sso-callback
 * Protected routes: /dashboard, /submissions, /meetings, /users, /reports, /settings
 * Role-based access enforced by ProtectedRoute.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from './context/AuthContext'

import AppLayout         from './components/layout/AppLayout'
import ProtectedRoute    from './components/layout/ProtectedRoute'

import LoginPage                  from './pages/LoginPage'
import ForgotPasswordPage         from './pages/ForgotPasswordPage'
import ResetPasswordPage          from './pages/ResetPasswordPage'
import SsoCallbackPage            from './pages/auth/SsoCallbackPage'
import DashboardPage              from './pages/DashboardPage'
import NotificationsPage          from './pages/NotificationsPage'
import PrivacyCenterPage          from './pages/PrivacyCenterPage'
import FormBuilderPage            from './pages/secretary/FormBuilderPage'
import FormPreviewPage            from './pages/secretary/FormPreviewPage'
import FormLibraryPage            from './pages/secretary/FormLibraryPage'
import SecretarySubmissionsListPage from './pages/secretary/SubmissionsListPage'
import SubmissionDetailPage       from './pages/secretary/SubmissionDetailPage'
import SubmitPage                 from './pages/researcher/SubmitPage'
import SubmissionStatusPage       from './pages/researcher/SubmissionStatusPage'
import SubmissionsListPage        from './pages/researcher/SubmissionsListPage'
import AssignmentsPage            from './pages/reviewer/AssignmentsPage'
import ReviewDetailPage           from './pages/reviewer/ReviewDetailPage'
import ReviewDiffPage             from './pages/reviewer/ReviewDiffPage'
import ChairmanQueuePage          from './pages/chairman/ChairmanQueuePage'
import ChairmanDecisionPage       from './pages/chairman/SubmissionDecisionPage'
import UsersPage                  from './pages/admin/UsersPage'
import MeetingsPage               from './pages/meetings/MeetingsPage'
import MeetingDetailPage          from './pages/meetings/MeetingDetailPage'
import MeetingsCalendarPage       from './pages/meetings/MeetingsCalendarPage'
import ProtocolsListPage          from './pages/protocols/ProtocolsListPage'
import ProtocolDetailPage         from './pages/protocols/ProtocolDetailPage'
import ProtocolSignPage           from './pages/protocols/ProtocolSignPage'
import StatsPage                  from './pages/reports/StatsPage'
import AuditLogPage               from './pages/reports/AuditLogPage'
import SettingsPage               from './pages/admin/SettingsPage'
import StatusManagementPage       from './pages/admin/StatusManagementPage'
import CoiPage                    from './pages/profile/CoiPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login"                 element={<LoginPage />} />
          <Route path="/forgot-password"       element={<ForgotPasswordPage />} />
          <Route path="/reset-password"        element={<ResetPasswordPage />} />
          <Route path="/sso-callback"          element={<SsoCallbackPage />} />
          <Route path="/protocol/sign/:token"  element={<ProtocolSignPage />} />

          {/* ── Protected (all authenticated roles) ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"       element={<DashboardPage />} />
              <Route path="/submissions/new"      element={<SubmitPage />} />
              <Route path="/submissions/:id/edit" element={<SubmitPage />} />
              <Route path="/submissions/:id"      element={<SubmissionStatusPage />} />
              <Route path="/submissions"     element={<SubmissionsListPage />} />
              <Route element={<ProtectedRoute roles={['SECRETARY', 'CHAIRMAN', 'REVIEWER', 'ADMIN']} />}>
                <Route path="/settings"      element={<SettingsPage />} />
              </Route>
              <Route path="/notifications"   element={<NotificationsPage />} />
              <Route path="/profile/coi"     element={<CoiPage />} />
              <Route path="/privacy"         element={<PrivacyCenterPage />} />

              {/* Meetings — SECRETARY, CHAIRMAN, ADMIN */}
              <Route element={<ProtectedRoute roles={['SECRETARY', 'CHAIRMAN', 'ADMIN']} />}>
                <Route path="/meetings/:id"      element={<MeetingDetailPage />} />
                <Route path="/meetings"          element={<MeetingsPage />} />
                <Route path="/meetings/calendar" element={<MeetingsCalendarPage />} />
              </Route>

              {/* Protocols — SECRETARY, CHAIRMAN, ADMIN */}
              <Route element={<ProtectedRoute roles={['SECRETARY', 'CHAIRMAN', 'ADMIN']} />}>
                <Route path="/protocols"     element={<ProtocolsListPage />} />
                <Route path="/protocols/new" element={<ProtocolDetailPage />} />
                <Route path="/protocols/:id" element={<ProtocolDetailPage />} />
              </Route>

              {/* Secretary + Admin */}
              <Route element={<ProtectedRoute roles={['SECRETARY', 'ADMIN']} />}>
                <Route path="/secretary/forms"                element={<FormLibraryPage />} />
                <Route path="/secretary/forms/new"            element={<FormBuilderPage />} />
                <Route path="/secretary/forms/:id"            element={<FormBuilderPage />} />
                <Route path="/secretary/forms/:id/preview"    element={<FormPreviewPage />} />
                <Route path="/secretary/submissions"          element={<SecretarySubmissionsListPage />} />
                <Route path="/secretary/submissions/:id"      element={<SubmissionDetailPage />} />
              </Route>

              {/* Reviewer */}
              <Route element={<ProtectedRoute roles={['REVIEWER', 'CHAIRMAN']} />}>
                <Route path="/reviewer/assignments"      element={<AssignmentsPage />} />
                <Route path="/reviewer/assignments/:id"  element={<ReviewDetailPage />} />
                <Route path="/reviewer/assignments/:id/diff" element={<ReviewDiffPage />} />
              </Route>

              {/* Secretary + Chairman + Admin */}
              <Route element={<ProtectedRoute roles={['SECRETARY', 'CHAIRMAN', 'ADMIN']} />}>
                <Route path="/chairman/queue"      element={<ChairmanQueuePage />} />
                <Route path="/chairman/queue/:id"  element={<ChairmanDecisionPage />} />
                <Route path="/reports"             element={<StatsPage />} />
              </Route>

              {/* Admin only — Audit Log */}
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/reports/audit-log"   element={<AuditLogPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/admin/statuses" element={<StatusManagementPage />} />
              </Route>
            </Route>
          </Route>

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

/**
 * Temporary placeholder for pages not yet built.
 * @param {{ pageKey: string }} props - key under pages.* in translation files
 */
function PlaceholderPage({ pageKey }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-4xl mb-4" aria-hidden="true">🚧</p>
      <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
        {t(`pages.${pageKey}`)}
      </h1>
      <p className="text-sm text-gray-600">{t('pages.comingSoon')}</p>
    </div>
  )
}
