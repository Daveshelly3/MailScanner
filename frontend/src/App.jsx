import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Dashboard /> : <Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
