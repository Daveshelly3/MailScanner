import { useState, useCallback } from 'react';
import { scanApi } from '../services/api.js';

export function useScan() {
  const [results, setResults] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const runScan = useCallback(async ({ timeWindow, folder, maxCount }) => {
    setScanning(true);
    setError(null);

    try {
      const res = await scanApi.run({ timeWindow, folder, maxCount });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, scanning, error, runScan, clearResults };
}
