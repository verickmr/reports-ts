import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/require-auth';
import { EditRequestPage } from './pages/edit-request-page';
import { HomePage } from './pages/home-page';
import { LoginPage } from './pages/login-page';
import { RequestDetailPage } from './pages/request-detail-page';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <RequireAuth>
            <RequestDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/requests/:id/edit"
        element={
          <RequireAuth>
            <EditRequestPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
