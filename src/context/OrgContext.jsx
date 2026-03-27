import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { DEFAULT_ORG } from '../constants';

export const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgSettings, setOrgSettings] = useState(DEFAULT_ORG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrg = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/organizations');
      if (res.success && res.data) {
        // Map DB column names to the shape the rest of the app expects
        const d = res.data;
        setOrgSettings({
          id: d.id,
          orgName: d.org_name,
          address: d.address,
          city: d.city,
          state: d.state,
          pincode: d.pincode,
          phone: d.phone,
          email: d.email,
          registrationNumber: d.registration_number,
          pan80G: d.pan_80g,
          signatory: d.signatory,
          signatoryDesignation: d.signatory_designation,
        });
      }
      // If not found (404) silently fall back to DEFAULT_ORG already in state
    } catch (err) {
      setError('Network error: could not reach the server.');
      console.error('[OrgContext] fetchOrg error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch org settings on mount
  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const updateOrgSettings = useCallback(async (data) => {
    const orgId = orgSettings.id || 1;
    // Map camelCase keys back to DB column names
    const payload = {
      org_name: data.orgName,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      phone: data.phone,
      email: data.email,
      registration_number: data.registrationNumber,
      pan_80g: data.pan80G,
      signatory: data.signatory,
      signatory_designation: data.signatoryDesignation,
    };

    const res = await api.put(`/organizations/${orgId}`, payload);
    if (!res.success) throw new Error(res.message || 'Failed to update organisation settings.');

    // Re-fetch to keep local state in sync
    await fetchOrg();
  }, [orgSettings.id, fetchOrg]);

  return (
    <OrgContext.Provider value={{ orgSettings, loading, error, updateOrgSettings }}>
      {children}
    </OrgContext.Provider>
  );
}
