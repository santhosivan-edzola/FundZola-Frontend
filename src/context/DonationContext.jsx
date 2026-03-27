import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export const DonationContext = createContext(null);

/** Normalize DB snake_case columns to the camelCase shape the components expect */
function normalizeDonation(d) {
  return {
    ...d,
    donorId: d.donor_id ?? d.donorId,
    receiptNumber: d.receipt_number ?? d.receiptNumber,
    paymentMode: d.payment_mode ?? d.paymentMode,
    chequeNumber: d.cheque_number ?? d.chequeNumber,
    bankName: d.bank_name ?? d.bankName,
    transactionRef: d.transaction_ref ?? d.transactionRef,
    fundCategory: d.fund_category ?? d.fundCategory,
    is80G: d.is_80g_eligible !== undefined ? Boolean(d.is_80g_eligible) : Boolean(d.is80G),
    donorName: d.donor_name ?? d.donorName,
    donorCode: d.donor_code ?? d.donorCode,
    panNumber: d.pan_number ?? d.panNumber,
    date: d.donation_date ?? d.date,
    createdAt: d.created_at ?? d.createdAt,
    updatedAt: d.updated_at ?? d.updatedAt,
  };
}

export function DonationProvider({ children }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/donations');
      if (res.success) {
        setDonations(res.data.map(normalizeDonation));
      } else {
        setError(res.message || 'Failed to load donations.');
      }
    } catch (err) {
      setError('Network error: could not reach the server.');
      console.error('[DonationContext] fetchDonations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load donations on mount
  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  /** Map camelCase form fields → snake_case API fields */
  const toApiPayload = (data) => ({
    donor_id:        data.donor_id        ?? data.donorId,
    amount:          data.amount,
    donation_date:   data.donation_date   ?? data.date,
    payment_mode:    data.payment_mode    ?? data.paymentMode,
    cheque_number:   data.cheque_number   ?? data.chequeNumber   ?? null,
    bank_name:       data.bank_name       ?? data.bankName       ?? null,
    transaction_ref: data.transaction_ref ?? data.transactionRef ?? null,
    fund_category:   data.fund_category   ?? data.fundCategory,
    purpose:         data.purpose         ?? null,
    is_80g_eligible: data.is_80g_eligible !== undefined
                       ? data.is_80g_eligible
                       : (data.is80G ? 1 : 0),
    notes:           data.notes           ?? null,
  });

  const addDonation = useCallback(async (data) => {
    const res = await api.post('/donations', toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to add donation.');
    await fetchDonations();
    return res.data;
  }, [fetchDonations]);

  const addDonationAndReturn = useCallback(async (data) => {
    return addDonation(data);
  }, [addDonation]);

  const updateDonation = useCallback(async (id, data) => {
    const res = await api.put(`/donations/${id}`, toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to update donation.');
    await fetchDonations();
    return res.data;
  }, [fetchDonations]);

  const deleteDonation = useCallback(async (id) => {
    const res = await api.delete(`/donations/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete donation.');
    await fetchDonations();
  }, [fetchDonations]);

  const getDonationById = useCallback((id) => {
    return donations.find((d) => d.id === id) || null;
  }, [donations]);

  const getDonationsByDonor = useCallback((donorId) => {
    return donations.filter((d) => d.donor_id === donorId || d.donorId === donorId);
  }, [donations]);

  return (
    <DonationContext.Provider
      value={{
        donations,
        loading,
        error,
        addDonation,
        addDonationAndReturn,
        updateDonation,
        deleteDonation,
        getDonationById,
        getDonationsByDonor,
        fetchDonations,
      }}
    >
      {children}
    </DonationContext.Provider>
  );
}
