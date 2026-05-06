import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';

const TIME_WINDOWS = [
  { value: '6h', label: '6 hrs' },
  { value: '24h', label: '24 hrs' },
  { value: '48h', label: '48 hrs' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: 'alltime', label: 'All time' },
];

const FOLDERS = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'allmail', label: 'All Mail' },
  { value: 'flagged', label: 'Flagged' },
];

export default function ScanControls({ onScan, scanning }) {
  const [timeWindow, setTimeWindow] = useState('24h');
  const [folder, setFolder] = useState('inbox');
  const [maxCount, setMaxCount] = useState(50);

  const handleScan = () => {
    onScan({ timeWindow, folder, maxCount });
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time window
          </legend>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Time window selection">
            {TIME_WINDOWS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeWindow(value)}
                aria-pressed={timeWindow === value}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 ${
                  timeWindow === value
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="folder-select" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Folder
            </label>
            <select
              id="folder-select"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {FOLDERS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="max-count" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Max emails
            </label>
            <input
              id="max-count"
              type="number"
              min={5}
              max={100}
              value={maxCount}
              onChange={(e) => setMaxCount(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              aria-label="Maximum number of emails to scan"
            />
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className="btn-primary ml-auto"
          aria-label="Start email scan"
        >
          {scanning ? (
            <>
              <LoadingSpinner size="sm" />
              Scanning…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Scan now
            </>
          )}
        </button>
      </div>
    </div>
  );
}
