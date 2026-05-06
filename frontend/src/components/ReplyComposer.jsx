import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { actionsApi } from '../services/api.js';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function ReplyComposer({ email, onClose }) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    loadDraft();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadDraft = async (instruction = undefined) => {
    setLoading(true);
    setError(null);
    try {
      const res = await actionsApi.draftReply(email, instruction);
      setDraft(res.data.draft);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate draft');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      textareaRef.current?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const outlookUrl = `https://outlook.office.com/mail/`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Draft reply"
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
            <h2 className="text-base font-semibold text-slate-900">Draft reply</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {email.subject}
              {email.receivedAt && (
                <span className="ml-2">· {format(new Date(email.receivedAt), 'dd MMM, HH:mm')}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5"
            aria-label="Close composer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              To: <span className="text-slate-700">{email.sender.name} &lt;{email.sender.email}&gt;</span>
            </p>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center gap-3 text-slate-500">
              <LoadingSpinner />
              <span className="text-sm">Drafting reply…</span>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              aria-label="Draft reply content"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => loadDraft()}
            disabled={loading}
            className="btn-secondary text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Regenerate
          </button>
          <div className="flex gap-2">
            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs"
              aria-label="Open Outlook in a new tab"
            >
              Open in Outlook
            </a>
            <button
              onClick={handleCopy}
              disabled={loading || !!error}
              className="btn-primary text-xs"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy to clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
