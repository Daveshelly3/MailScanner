import { useState, useEffect, useRef } from 'react';
import { actionsApi } from '../services/api.js';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function AdvicePanel({ email, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    loadAdvice();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await actionsApi.advise(email);
      setData(res.data.advice);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate advice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Strategic advice"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-2xl rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Strategic advice</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{email.subject}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-3 text-slate-500">
              <LoadingSpinner />
              <span className="text-sm">Analysing email…</span>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : data ? (
            <>
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recommended approach</h3>
                <p className="text-sm leading-relaxed text-slate-700">{data.approach}</p>
              </div>

              {data.keyPoints?.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Key points to address</h3>
                  <ul className="space-y-2">
                    {data.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700" aria-hidden="true">
                          {i + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.avoid && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">What to avoid</h3>
                  <p className="text-sm text-amber-800">{data.avoid}</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
