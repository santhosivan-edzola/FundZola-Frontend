import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export function useZoho() {
  const [status, setStatus]   = useState(null);   // { config, recentLogs }
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/zoho/status');
      if (res.success) setStatus(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCredentials = useCallback(async (payload) => {
    const res = await api.post('/zoho/credentials', payload);
    if (!res.success) throw new Error(res.message);
    return res;
  }, []);

  const getAuthUrl = useCallback(async () => {
    const res = await api.get('/zoho/auth-url');
    if (!res.success) throw new Error(res.message);
    return res.data.authUrl;
  }, []);

  const exchangeCode = useCallback(async (code) => {
    const res = await api.post('/zoho/exchange-code', { code });
    if (!res.success) throw new Error(res.message);
    await fetchStatus();
    return res;
  }, [fetchStatus]);

  const manualSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await api.post('/zoho/sync', {});
      if (!res.success) throw new Error(res.message);
      await fetchStatus();
      return res.data;
    } finally {
      setSyncing(false);
    }
  }, [fetchStatus]);

  const fetchLogDetails = useCallback(async (logId) => {
    const res = await api.get(`/zoho/logs/${logId}/details`);
    if (!res.success) throw new Error(res.message);
    return res.data;
  }, []);

  const fetchZohoOrgs = useCallback(async () => {
    const res = await api.get('/zoho/organizations');
    if (!res.success) throw new Error(res.message);
    return res.data;
  }, []);

  const saveOrgId = useCallback(async (zoho_org_id) => {
    const res = await api.patch('/zoho/org-id', { zoho_org_id });
    if (!res.success) throw new Error(res.message);
    await fetchStatus();
  }, [fetchStatus]);

  const toggleSync = useCallback(async (enabled) => {
    const res = await api.patch('/zoho/toggle-sync', { sync_enabled: enabled });
    if (!res.success) throw new Error(res.message);
    await fetchStatus();
  }, [fetchStatus]);

  const disconnect = useCallback(async () => {
    const res = await api.delete('/zoho/disconnect');
    if (!res.success) throw new Error(res.message);
    await fetchStatus();
  }, [fetchStatus]);

  return { status, loading, syncing, fetchStatus, saveCredentials, getAuthUrl, exchangeCode, fetchZohoOrgs, saveOrgId, fetchLogDetails, manualSync, toggleSync, disconnect };
}

export default useZoho;
