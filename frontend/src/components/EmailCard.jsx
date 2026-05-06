import { format } from 'date-fns';
import IntentBadge from './IntentBadge.jsx';
import PriorityBadge from './PriorityBadge.jsx';

export default function EmailCard({ email, onDraftReply, onSummarise, onAdvise }) {
  const receivedDate = email.receivedAt ? format(new Date(email.receivedAt), 'dd MMM yyyy, HH:mm') : '';

  return (
    <article className="card p-5 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <PriorityBadge level={email.priority} />
            <IntentBadge type={email.intentType} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {email.subject}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{email.sender.name}</span>
            {email.sender.email && (
              <span className="ml-1 text-slate-400">&lt;{email.sender.email}&gt;</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{receivedDate}</p>
        </div>
      </div>

      {email.insight && (
        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">AI insight: </span>
            {email.insight}
          </p>
        </div>
      )}

      {email.replyOpener && (
        <div className="mt-2 rounded-lg bg-brand-50 border border-brand-100 px-3 py-2.5">
          <p className="text-sm text-brand-800">
            <span className="font-medium">Suggested opener: </span>
            <em>"{email.replyOpener}"</em>
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onDraftReply(email)}
          className="btn-primary text-xs py-1.5 px-3"
          aria-label={`Draft reply to ${email.subject}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          Draft reply
        </button>
        <button
          onClick={() => onSummarise(email)}
          className="btn-secondary text-xs py-1.5 px-3"
          aria-label={`Summarise thread for ${email.subject}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Summarise thread
        </button>
        <button
          onClick={() => onAdvise(email)}
          className="btn-ghost text-xs py-1.5 px-3"
          aria-label={`Get advice on ${email.subject}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Advise me
        </button>
      </div>
    </article>
  );
}
