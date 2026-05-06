import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { actionsApi } from '../services/api.js';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function ThreadSummary({ email, onClose }) {
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

    loadSummary();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await actionsApi.summarise(email);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to summarise thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thread summary"
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
            <h2 className="text-base font-semibold text-slate-900">Thread summary</h2>
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
              <span className="text-sm">Summarising thread…</span>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : data ? (
            <>
              {data.participants?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Participants</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.participants.map((p, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {data.dateRange && (
                <div className="mb-4 text-xs text-slate-400">
                  {format(new Date(data.dateRange.from), 'dd MMM yyyy')}
                  {data.dateRange.from !== data.dateRange.to && (
                    <> – {format(new Date(data.dateRange.to), 'dd MMM yyyy')}</>
                  )}
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Summary</h3>
                <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
              </div>

              {data.outstandingItems?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Outstanding items</h3>
                  <ul className="space-y-2">
                    {data.outstandingItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
