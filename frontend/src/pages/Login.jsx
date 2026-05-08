import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { authApi } from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function Login() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [loginLoading, setLoginLoading] = useState(false);
  const [mode, setMode] = useState(null);
  const errorParam = searchParams.get('error');

  useEffect(() => {
    authApi.getMode().then((r) => setMode(r.data.mode)).catch(() => setMode('none'));
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    await login();
  };

  const azureNotConfigured = mode === 'none';

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900">
      <header className="px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">MailScanner</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-white">Never miss a client question again</h1>
              <p className="mt-2 text-slate-300">
                AI-powered email triage for client-facing teams. Sign in to scan your Outlook inbox.
              </p>
            </div>

            {errorParam && (
              <div role="alert" className="mt-5 rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">
                {decodeURIComponent(errorParam)}
              </div>
            )}

            {azureNotConfigured && (
              <div role="alert" className="mt-5 rounded-lg bg-amber-500/10 border border-amber-400/30 px-4 py-3 text-sm text-amber-200">
                <p className="font-semibold mb-1">Azure OAuth not configured</p>
                <p className="text-xs leading-relaxed">
                  Add <code className="bg-black/30 px-1 rounded">AZURE_CLIENT_ID</code> and{' '}
                  <code className="bg-black/30 px-1 rounded">AZURE_CLIENT_SECRET</code> to{' '}
                  <code className="bg-black/30 px-1 rounded">backend/.env</code>, then restart.
                  See README for the 5-minute Azure App Registration setup.
                </p>
              </div>
            )}

            <div className="mt-8">
              <button
                onClick={handleLogin}
                disabled={loginLoading || azureNotConfigured}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition-all hover:bg-slate-50 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" aria-hidden="true">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    Sign in with Microsoft 365
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Read-only access (Mail.Read scope). MailScanner never sends, modifies, or stores your emails. Content is processed in-memory only.</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-slate-500">
        Microsoft 365 and Outlook are trademarks of Microsoft Corporation.
      </footer>
    </div>
  );
}
