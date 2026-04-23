import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { PipelineProvider } from './context/PipelineContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProspectsPage from './pages/ProspectsPage'
import ProspectDetailPage from './pages/ProspectDetailPage'
import PipelinePage from './pages/PipelinePage'
import EmailsPage from './pages/EmailsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import LeadMagnetsPage from './pages/LeadMagnetsPage'
import WhatsAppPage from './pages/WhatsAppPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PipelineProvider>
          <Toaster position="top-right" />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="prospects" element={<ProspectsPage />} />
              <Route path="prospects/:id" element={<ProspectDetailPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="emails" element={<EmailsPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
              <Route path="lead-magnets" element={<LeadMagnetsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </PipelineProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
