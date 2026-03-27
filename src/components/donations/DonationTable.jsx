import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function DonationTable({ donations = [], donors = [], onEdit, onDelete, onReceipt, onView }) {
  const donorMap = {};
  donors.forEach((d) => { donorMap[d.id] = d; });

  if (donations.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-cream-200 shadow-card">
        <div className="text-4xl mb-3">💰</div>
        <p className="font-semibold text-ez-dark">No donations found</p>
        <p className="text-ez-muted text-sm mt-1">Record your first donation to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-cream-200 overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm ez-table">
          <thead>
            <tr>
              <th className="text-left">Receipt No.</th>
              <th className="text-left">Donor</th>
              <th className="text-left">Amount</th>
              <th className="text-left">Date</th>
              <th className="text-left">Mode</th>
              <th className="text-left">Fund</th>
              <th className="text-left">80G</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation) => {
              const donor = donorMap[donation.donorId || donation.donor_id];
              return (
                <tr key={donation.id}>
                  <td>
                    <button
                      onClick={() => onView && onView(donation)}
                      className="font-mono text-xs font-semibold hover:underline"
                      style={{ color: '#E8967A' }}
                      title="View donation details & expenses"
                    >
                      {donation.receiptNumber || donation.receipt_number || '—'}
                    </button>
                  </td>
                  <td className="font-medium text-ez-dark">
                    {donor ? donor.name : (donation.donorName || donation.donor_name || 'Unknown')}
                  </td>
                  <td className="font-semibold text-ez-dark">{formatCurrency(donation.amount)}</td>
                  <td className="text-ez-muted">{formatDate(donation.date || donation.donation_date)}</td>
                  <td><Badge variant="gray" size="sm">{donation.paymentMode || donation.payment_mode || '—'}</Badge></td>
                  <td><Badge variant="info" size="sm">{donation.fundCategory || donation.fund_category || 'General'}</Badge></td>
                  <td>
                    <Badge variant={donation.is80G || donation.is_80g_eligible ? 'success' : 'gray'} size="sm">
                      {donation.is80G || donation.is_80g_eligible ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onView && onView(donation)}
                        title="View Details"
                        className="p-1.5 rounded-lg hover:bg-cream-100 text-ez-muted hover:text-ez-dark transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {(donation.is80G || donation.is_80g_eligible) && (
                        <button onClick={() => onReceipt && onReceipt(donation)}
                          title="Download 80G Receipt"
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-500 hover:text-teal-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                      <button onClick={() => onEdit && onEdit(donation)}
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors"
                        style={{ color: '#E8967A' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete && onDelete(donation)}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DonationTable;
