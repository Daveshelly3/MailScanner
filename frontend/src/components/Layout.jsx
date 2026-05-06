import { useAuth } from '../hooks/useAuth.js';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">MailScanner</span>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">{user.displayName}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
                aria-hidden="true"
              >
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="btn-ghost text-xs"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
