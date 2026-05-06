import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data.user);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to load user');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async () => {
    try {
      const res = await authApi.getLoginUrl();
      window.location.href = res.data.authUrl;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate login');
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return { user, loading, error, login, logout, refetch: fetchMe };
}
