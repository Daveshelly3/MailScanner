import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import ScanControls from '../components/ScanControls.jsx';
import SummaryStats from '../components/SummaryStats.jsx';
import EmailCard from '../components/EmailCard.jsx';
import ReplyComposer from '../components/ReplyComposer.jsx';
import ThreadSummary from '../components/ThreadSummary.jsx';
import AdvicePanel from '../components/AdvicePanel.jsx';
import { useScan } from '../hooks/useScan.js';

const PRIORITY_ORDER = ['high', 'medium', 'low'];

const PRIORITY_LABELS = {
  high: 'Urgent',
  medium: 'Needs response',
  low: 'Worth acknowledging',
};

function groupByPriority(emails) {
  const flagged = emails.filter((e) => e.needsAttention);
  const groups = {};

  for (const email of flagged) {
    const p = email.priority || 'low';
    if (!groups[p]) groups[p] = [];
    groups[p].push(email);
  }

  return PRIORITY_ORDER.filter((p) => groups[p]?.length > 0).map((p) => ({
    priority: p,
    label: PRIORITY_LABELS[p],
    emails: groups[p],
  }));
}

export default function Dashboard() {
  const { results, scanning, error, runScan } = useScan();
  const [activeModal, setActiveModal] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const openModal = (type, email) => {
    setActiveModal(type);
    setSelectedEmail(email);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedEmail(null);
  };

  const groups = results ? groupByPriority(results.emails || []) : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Scanner</h1>
          <p className="mt-1 text-sm text-slate-500">
            Scan your Outlook inbox to surface unanswered client questions and feedback.
          </p>
        </div>

        <ScanControls onScan={runScan} scanning={scanning} />

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <strong className="font-semibold">Scan failed: </strong>{error}
          </div>
        )}

        {scanning && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-slate-500">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" role="status" aria-label="Scanning emails" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Scanning your inbox…</p>
              <p className="text-xs text-slate-400 mt-1">This usually takes less than 30 seconds</p>
            </div>
          </div>
        )}

        {results && !scanning && (
          <>
            <SummaryStats
              scanned={results.scanned}
              flagged={results.flagged}
              urgent={results.urgent}
              noAction={results.noAction}
            />

            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">All clear!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    No unanswered client questions in this window.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map(({ priority, label, emails }) => (
                  <section key={priority} aria-labelledby={`group-${priority}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <h2
                        id={`group-${priority}`}
                        className="text-sm font-semibold text-slate-700"
                      >
                        {label}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {emails.length}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                      {emails.map((email) => (
                        <EmailCard
                          key={email.id}
                          email={email}
                          onDraftReply={(e) => openModal('reply', e)}
                          onSummarise={(e) => openModal('summary', e)}
                          onAdvise={(e) => openModal('advice', e)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {activeModal === 'reply' && selectedEmail && (
        <ReplyComposer email={selectedEmail} onClose={closeModal} />
      )}
      {activeModal === 'summary' && selectedEmail && (
        <ThreadSummary email={selectedEmail} onClose={closeModal} />
      )}
      {activeModal === 'advice' && selectedEmail && (
        <AdvicePanel email={selectedEmail} onClose={closeModal} />
      )}
    </Layout>
  );
}
