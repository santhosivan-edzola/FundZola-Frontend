import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDonors } from '../hooks/useDonors';
import { useDonations } from '../hooks/useDonations';
import { useExpenses } from '../hooks/useExpenses';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DonorForm } from '../components/donors/DonorForm';
import { DonationTable } from '../components/donations/DonationTable';
import { FundUtilizationBar } from '../components/dashboard/FundUtilizationBar';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateReceipt } from '../utils/pdfGenerator';
import { useOrg } from '../hooks/useOrg';
import { api } from '../utils/api';

export function DonorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getDonorById, updateDonor, fetchDonors } = useDonors();
  const { getDonationsByDonor, fetchDonations } = useDonations();
  const { expenses, fetchExpenses } = useExpenses();

  useEffect(() => {
    fetchDonors();
    fetchDonations();
    fetchExpenses();
  }, []);
  const { orgSettings } = useOrg();
  const toast = useToast();
  const [editOpen, setEditOpen]         = useState(false);
  const [expandedDonation, setExpanded] = useState(null);
  const [breakdownData, setBreakdown]   = useState({});
  const [loadingBreakdown, setLoadingBD] = useState(null);

  const handleExpandDonation = useCallback(async (donationId) => {
    if (expandedDonation === donationId) { setExpanded(null); return; }
    setExpanded(donationId);
    if (breakdownData[donationId]) return;
    setLoadingBD(donationId);
    try {
      const res = await api.get(`/donations/${donationId}/category-breakdown`);
      if (res.success) setBreakdown(prev => ({ ...prev, [donationId]: res.data }));
    } finally {
      setLoadingBD(null);
    }
  }, [expandedDonation, breakdownData]);

  const donor = getDonorById(id);
  const donorDonations = getDonationsByDonor(id);

  if (!donor) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg font-medium">Donor not found</p>
        <Button variant="secondary" onClick={() => navigate('/donors')} className="mt-4">
          Back to Donors
        </Button>
      </div>
    );
  }

  const totalDonated = donorDonations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const donationIds = donorDonations.map((d) => d.id);
  const donorExpenses = expenses.filter((e) => donationIds.includes(e.donationId || e.donation_id));
  const totalExpended = donorExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const balance = totalDonated - totalExpended;

  // Build fund summary for this donor
  const fundMap = {};
  donorDonations.forEach((d) => {
    const cat = d.fundCategory || d.fund_category || 'General';
    if (!fundMap[cat]) fundMap[cat] = { totalDonated: 0, totalExpended: 0, donationCount: 0, expenseCount: 0 };
    fundMap[cat].totalDonated += parseFloat(d.amount) || 0;
    fundMap[cat].donationCount += 1;
  });
  donorExpenses.forEach((e) => {
    const cat = e.fundCategory || e.fund_category || 'General';
    if (!fundMap[cat]) fundMap[cat] = { totalDonated: 0, totalExpended: 0, donationCount: 0, expenseCount: 0 };
    fundMap[cat].totalExpended += parseFloat(e.amount) || 0;
    fundMap[cat].expenseCount += 1;
  });
  const byFund = Object.entries(fundMap).map(([fundCategory, data]) => ({
    fundCategory,
    totalDonated: data.totalDonated,
    totalExpended: data.totalExpended,
    balance: data.totalDonated - data.totalExpended,
    utilizationPct: data.totalDonated > 0 ? Math.min(100, (data.totalExpended / data.totalDonated) * 100) : 0,
    donationCount: data.donationCount,
    expenseCount: data.expenseCount,
  }));

  const handleEditSubmit = async (data) => {
    try {
      await updateDonor(donor.id, data);
      toast.success('Donor updated successfully');
      setEditOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update donor.');
    }
  };

  const handleReceipt = (donation) => {
    generateReceipt(donation, donor, orgSettings);
    toast.success('Receipt PDF downloaded');
  };

  const fields = [
    { label: 'Email', value: donor.email },
    { label: 'Phone', value: donor.phone },
    { label: 'Address', value: donor.address },
    { label: 'PAN Number', value: donor.pan || donor.pan_number || donor.panNumber },
    { label: 'Donor Type', value: donor.donorType || donor.donor_type },
    { label: 'Status', value: donor.isActive !== false ? 'Active' : 'Inactive' },
    { label: 'Member Since', value: formatDate(donor.createdAt || donor.created_at) },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/donors')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Donors
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {donor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{donor.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={donor.isActive !== false ? 'success' : 'gray'} size="sm">
                  {donor.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="info" size="sm">{donor.donorType || donor.donor_type}</Badge>
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setEditOpen(true)}>
            Edit Donor
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{f.label}</p>
              <p className="text-sm text-gray-800 font-medium mt-0.5">{f.value || '-'}</p>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDonated)}</p>
            <p className="text-xs text-gray-400 mt-1">Total Donated</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalExpended)}</p>
            <p className="text-xs text-gray-400 mt-1">Expended</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Balance</p>
          </div>
        </div>
      </div>

      {/* Fund Utilization */}
      {byFund.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Fund Utilization</h3>
          <FundUtilizationBar byFund={byFund} />
        </div>
      )}

      {/* Donation History with category breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Donation History ({donorDonations.length})
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Click a donation to see category-wise breakdown</p>
        </div>
        <div>
          {donorDonations.length === 0 && (
            <p className="text-sm text-gray-400 px-5 py-8 text-center">No donations yet.</p>
          )}
          {donorDonations.map((donation) => {
            const isExpanded = expandedDonation === donation.id;
            const breakdown  = breakdownData[donation.id] || [];
            const isLoading  = loadingBreakdown === donation.id;
            return (
              <div key={donation.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                {/* Donation row */}
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleExpandDonation(donation.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-blue-600">{donation.receipt_number}</span>
                      <span className="text-xs text-gray-400">{formatDate(donation.donation_date)}</span>
                      <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '1px 8px' }}>
                        {donation.payment_mode}
                      </span>
                      {donation.fund_category && (
                        <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, padding: '1px 8px' }}>
                          {donation.fund_category}
                        </span>
                      )}
                    </div>
                    {donation.purpose && <p className="text-xs text-gray-400 mt-0.5 truncate">{donation.purpose}</p>}
                  </div>
                  <span className="text-sm font-bold text-green-600 whitespace-nowrap">{formatCurrency(donation.amount)}</span>
                  <svg width="14" height="14" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Category breakdown */}
                {isExpanded && (
                  <div style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', padding: '12px 20px 16px' }}>
                    {isLoading ? (
                      <p className="text-xs text-gray-400">Loading breakdown…</p>
                    ) : breakdown.length === 0 ? (
                      <p className="text-xs text-gray-400">No category allocations recorded for this donation.</p>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Category Breakdown</p>
                        <div className="space-y-3">
                          {breakdown.map((cat) => {
                            const pct = cat.allocated > 0 ? Math.min(100, (cat.spent / cat.allocated) * 100) : 0;
                            return (
                              <div key={cat.id}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || '#6366F1', display: 'inline-block', flexShrink: 0 }} />
                                    <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span className="text-gray-500">Allocated: <strong className="text-gray-800">{formatCurrency(cat.allocated)}</strong></span>
                                    <span className="text-gray-500">Spent: <strong style={{ color: cat.spent > cat.allocated ? '#DC2626' : '#059669' }}>{formatCurrency(cat.spent)}</strong></span>
                                    <span className="text-gray-500">Remaining: <strong style={{ color: cat.remaining >= 0 ? '#2563EB' : '#DC2626' }}>{formatCurrency(cat.remaining)}</strong></span>
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#DC2626' : (cat.color || '#6366F1'), borderRadius: 99, transition: 'width 0.3s' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Totals row */}
                        <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-gray-200 text-xs">
                          <span className="text-gray-500">Total Donated: <strong className="text-green-600">{formatCurrency(donation.amount)}</strong></span>
                          <span className="text-gray-500">Total Spent: <strong className="text-yellow-600">{formatCurrency(breakdown.reduce((s, c) => s + parseFloat(c.spent || 0), 0))}</strong></span>
                          <span className="text-gray-500">Balance: <strong className="text-blue-600">{formatCurrency(parseFloat(donation.amount) - breakdown.reduce((s, c) => s + parseFloat(c.spent || 0), 0))}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Donor" size="lg">
        <DonorForm
          initialData={donor}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default DonorDetail;
