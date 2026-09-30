import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/require-auth';
import { CreateRequestPage } from './pages/create-request-page';
import { HomePage } from './pages/home-page';
import { LoginPage } from './pages/login-page';

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
        path="/requests/new"
        element={
          <RequireAuth>
            <CreateRequestPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
