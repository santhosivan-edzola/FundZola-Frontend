import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export function useFundSummary() {
  const [byDonor, setByDonor] = useState([]);
  const [byFund, setByFund] = useState([]);
  const [totals, setTotals] = useState({
    totalDonors: 0,
    totalDonated: 0,
    totalExpended: 0,
    balance: 0,
    totalDonations: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [totalsRes, fundsRes, donorsRes] = await Promise.all([
        api.get('/summary/totals'),
        api.get('/summary/funds'),
        api.get('/summary/donors'),
      ]);

      if (totalsRes.success) setTotals(totalsRes.data);

      if (fundsRes.success) {
        // Normalize snake_case from DB to camelCase expected by components
        setByFund(
          fundsRes.data.map((row) => ({
            fundCategory: row.fund_category ?? row.fundCategory,
            totalDonated: parseFloat(row.total_donated ?? row.totalDonated) || 0,
            totalExpended: parseFloat(row.total_expended ?? row.totalExpended) || 0,
            balance: parseFloat(row.balance) || 0,
            utilizationPct: parseFloat(row.utilization_pct ?? row.utilizationPct) || 0,
            donationCount: row.donation_count ?? row.donationCount ?? 0,
            expenseCount: row.expense_count ?? row.expenseCount ?? 0,
          }))
        );
      }

      if (donorsRes.success) {
        // Normalize snake_case from DB to camelCase expected by components
        setByDonor(
          donorsRes.data.map((row) => ({
            donorId: row.donor_id ?? row.donorId,
            donorName: row.donor_name ?? row.donorName,
            donorPAN: row.pan_number ?? row.donorPAN,
            totalDonated: parseFloat(row.total_donated ?? row.totalDonated) || 0,
            totalExpended: parseFloat(row.total_expended ?? row.totalExpended) || 0,
            balance: parseFloat(row.balance) || 0,
            donationCount: row.donation_count ?? row.donationCount ?? 0,
            lastDonationDate: row.last_donation_date ?? row.lastDonationDate ?? null,
          }))
        );
      }
    } catch (err) {
      setError('Network error: could not reach the server.');
      console.error('[useFundSummary] fetchSummary error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { byDonor, byFund, totals, loading, error, fetchSummary };
}

export default useFundSummary;
