const PRIORITY_CONFIG = {
  high: { label: 'Urgent', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { label: 'Medium', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { label: 'Low', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
};

export default function PriorityBadge({ level }) {
  const config = PRIORITY_CONFIG[level] || PRIORITY_CONFIG.low;

  return (
    <span className={`badge ${config.bg} ${config.text} gap-1.5`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
