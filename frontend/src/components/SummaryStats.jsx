const StatCard = ({ label, value, color }) => (
  <div className="card p-4 text-center">
    <p className={`text-3xl font-bold ${color}`}>{value ?? '-'}</p>
    <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
  </div>
);

export default function SummaryStats({ scanned, flagged, urgent, noAction }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Scanned" value={scanned} color="text-slate-900" />
      <StatCard label="Need attention" value={flagged} color="text-amber-600" />
      <StatCard label="Urgent" value={urgent} color="text-red-600" />
      <StatCard label="No action" value={noAction} color="text-green-600" />
    </div>
  );
}
