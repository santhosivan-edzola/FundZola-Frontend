import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export const DealContext = createContext(null);

function normalizeDeal(d) {
  return {
    ...d,
    donorId: d.donor_id ?? d.donorId,
    donorName: d.donor_name ?? d.donorName,
    donorEmail: d.donor_email ?? d.donorEmail,
    donorPhone: d.donor_phone ?? d.donorPhone,
    programId: d.program_id ?? d.programId ?? null,
    programTitle: d.program_title ?? d.programTitle ?? null,
    dealType: d.deal_type ?? d.dealType ?? 'Full',
    expectedDate: d.expected_date ?? d.expectedDate,
    actualDate: d.actual_date ?? d.actualDate,
    createdAt: d.created_at ?? d.createdAt,
    updatedAt: d.updated_at ?? d.updatedAt,
    allocations: d.allocations ?? [],
  };
}

export function DealProvider({ children }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/deals');
      if (res.success) {
        setDeals(res.data.map(normalizeDeal));
      } else {
        setError(res.message || 'Failed to load deals.');
      }
    } catch (err) {
      setError('Network error: could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const toApiPayload = (data) => ({
    donor_id:      data.donor_id      ?? data.donorId,
    program_id:    data.program_id    ?? data.programId    ?? null,
    deal_type:     data.deal_type     ?? data.dealType     ?? 'Full',
    title:         data.title,
    amount:        data.amount        ?? 0,
    stage:         data.stage         ?? 'Prospect',
    priority:      data.priority      ?? 'Medium',
    notes:         data.notes         ?? null,
    expected_date: data.expected_date ?? data.expectedDate ?? null,
    actual_date:   data.actual_date   ?? data.actualDate   ?? null,
    allocations:   data.allocations   ?? [],
  });

  const addDeal = useCallback(async (data) => {
    const res = await api.post('/deals', toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to add deal.');
    await fetchDeals();
    return res.data;
  }, [fetchDeals]);

  const updateDeal = useCallback(async (id, data) => {
    const res = await api.put(`/deals/${id}`, toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to update deal.');
    await fetchDeals();
    return res.data;
  }, [fetchDeals]);

  const updateDealStage = useCallback(async (id, stage) => {
    const actualDate = stage === 'Received' ? new Date().toISOString().slice(0, 10) : null;
    // optimistic update first
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage, actualDate } : d));
    try {
      await api.put(`/deals/${id}`, { ...deals.find(d => d.id === id), stage, actual_date: actualDate });
    } catch {
      await fetchDeals(); // revert on error
    }
  }, [fetchDeals, deals]);

  const deleteDeal = useCallback(async (id) => {
    const res = await api.delete(`/deals/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete deal.');
    await fetchDeals();
  }, [fetchDeals]);

  // Full deal: auto-create donation + mark Received
  const receiveDeal = useCallback(async (id, data = {}) => {
    const res = await api.post(`/deals/${id}/receive`, data);
    if (!res.success) throw new Error(res.message || 'Failed to receive deal.');
    await fetchDeals();
    return res.data;
  }, [fetchDeals]);

  // Partial deal: add a tranche donation
  const addDealDonation = useCallback(async (dealId, data) => {
    const res = await api.post(`/deals/${dealId}/donations`, data);
    if (!res.success) throw new Error(res.message || 'Failed to add donation.');
    await fetchDeals();
    return res.data;
  }, [fetchDeals]);

  // Get all donations linked to a deal
  const getDealDonations = useCallback(async (dealId) => {
    const res = await api.get(`/deals/${dealId}/donations`);
    if (!res.success) throw new Error(res.message || 'Failed to load donations.');
    return res.data;
  }, []);

  return (
    <DealContext.Provider value={{ deals, loading, error, addDeal, updateDeal, updateDealStage, deleteDeal, fetchDeals, receiveDeal, addDealDonation, getDealDonations }}>
      {children}
    </DealContext.Provider>
  );
}
