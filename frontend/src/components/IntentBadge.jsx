const INTENT_CONFIG = {
  question: { label: 'Question', bg: 'bg-blue-100', text: 'text-blue-800' },
  feedback: { label: 'Feedback', bg: 'bg-purple-100', text: 'text-purple-800' },
  action_required: { label: 'Action Required', bg: 'bg-amber-100', text: 'text-amber-800' },
  complaint: { label: 'Complaint', bg: 'bg-red-100', text: 'text-red-800' },
};

export default function IntentBadge({ type }) {
  const config = INTENT_CONFIG[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700' };

  return (
    <span className={`badge ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
