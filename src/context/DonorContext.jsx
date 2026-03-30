import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export const DonorContext = createContext(null);

/** Normalize DB snake_case columns to the camelCase shape the components expect */
function normalizeDonor(d) {
  return {
    ...d,
    // preserve original snake_case too, for API calls
    donorCode: d.donor_code ?? d.donorCode,
    donorType: d.donor_type ?? d.donorType,
    panNumber: d.pan_number ?? d.panNumber,
    pan: d.pan_number ?? d.pan,
    aadhaar: d.aadhaar_number ?? d.aadhaar,
    aadhaarNumber: d.aadhaar_number ?? d.aadhaarNumber,
    isActive: d.is_active !== undefined ? Boolean(d.is_active) : (d.isActive !== false),
    createdAt: d.created_at ?? d.createdAt,
    updatedAt: d.updated_at ?? d.updatedAt,
  };
}

export function DonorProvider({ children }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/donors');
      if (res.success) {
        setDonors(res.data.map(normalizeDonor));
      } else {
        setError(res.message || 'Failed to load donors.');
      }
    } catch (err) {
      setError('Network error: could not reach the server.');
      console.error('[DonorContext] fetchDonors error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load donors on mount
  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  /** Map camelCase form fields → snake_case API fields */
  const toApiPayload = (data) => ({
    name:       data.name,
    email:      data.email,
    phone:      data.phone,
    address:    data.address,
    pan_number:     data.pan_number     ?? data.panNumber     ?? data.pan,
    aadhaar_number: data.aadhaar_number ?? data.aadhaarNumber ?? data.aadhaar,
    donor_type:     data.donor_type     ?? data.donorType,
  });

  const addDonor = useCallback(async (data) => {
    const res = await api.post('/donors', toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to add donor.');
    await fetchDonors();
    return res.data;
  }, [fetchDonors]);

  const updateDonor = useCallback(async (id, data) => {
    const res = await api.put(`/donors/${id}`, toApiPayload(data));
    if (!res.success) throw new Error(res.message || 'Failed to update donor.');
    await fetchDonors();
    return res.data;
  }, [fetchDonors]);

  const deleteDonor = useCallback(async (id) => {
    const res = await api.delete(`/donors/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete donor.');
    await fetchDonors();
  }, [fetchDonors]);

  const getDonorById = useCallback((id) => {
    return donors.find((d) => d.id === id) || null;
  }, [donors]);

  return (
    <DonorContext.Provider
      value={{ donors, loading, error, addDonor, updateDonor, deleteDonor, getDonorById, fetchDonors }}
    >
      {children}
    </DonorContext.Provider>
  );
}
