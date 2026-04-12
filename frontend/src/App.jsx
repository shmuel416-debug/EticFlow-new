/**
 * EthicFlow — App Router
 * Public routes: /login, /forgot-password, /reset-password
 * Protected routes: /dashboard, /submissions, /meetings, /users, /reports, /settings
 * Role-based access enforced by ProtectedRoute.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from './context/AuthContext'

import AppLayout         from './components/layout/AppLayout'
import ProtectedRoute    from './components/layout/ProtectedRoute'

import LoginPage           from './pages/LoginPage'
import ForgotPasswordPage  from './pages/ForgotPasswordPage'
import ResetPasswordPage   from './pages/ResetPasswordPage'
import DashboardPage       from './pages/DashboardPage'
import FormBuilderPage     from './pages/secretary/FormBuilderPage'
import FormPreviewPage     from './pages/secretary/FormPreviewPage'
import FormLibraryPage     from './pages/secretary/FormLibraryPage'
import SubmitPage          from './pages/researcher/SubmitPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />

          {/* ── Protected (all authenticated roles) ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/submissions"     element={<PlaceholderPage pageKey="submissions" />} />
              <Route path="/submissions/new" element={<SubmitPage />} />
              <Route path="/meetings"        element={<PlaceholderPage pageKey="meetings" />} />
              <Route path="/settings"        element={<PlaceholderPage pageKey="settings" />} />

              {/* Secretary + Admin */}
              <Route element={<ProtectedRoute roles={['SECRETARY', 'ADMIN']} />}>
                <Route path="/secretary/forms"             element={<FormLibraryPage />} />
                <Route path="/secretary/forms/new"         element={<FormBuilderPage />} />
                <Route path="/secretary/forms/:id"         element={<FormBuilderPage />} />
                <Route path="/secretary/forms/:id/preview" element={<FormPreviewPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/users"    element={<PlaceholderPage pageKey="users" />} />
              </Route>

              {/* Chairman + Admin */}
              <Route element={<ProtectedRoute roles={['CHAIRMAN', 'ADMIN']} />}>
                <Route path="/reports"  element={<PlaceholderPage pageKey="reports" />} />
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
