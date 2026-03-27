import React, { useState } from 'react';
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

export function DonorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getDonorById, updateDonor } = useDonors();
  const { getDonationsByDonor } = useDonations();
  const { expenses } = useExpenses();
  const { orgSettings } = useOrg();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);

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
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
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

      {/* Donation History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Donation History ({donorDonations.length})
          </h3>
        </div>
        <div className="p-5">
          <DonationTable
            donations={donorDonations}
            donors={[donor]}
            onReceipt={handleReceipt}
            onEdit={() => {}}
            onDelete={() => {}}
          />
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
