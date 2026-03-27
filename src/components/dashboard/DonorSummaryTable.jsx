import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../ui/Badge';

export function DonorSummaryTable({ byDonor = [], limit = 10 }) {
  const data = byDonor.slice(0, limit);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No donor data available yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Donor Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PAN</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Donated</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Expended</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Donations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, idx) => (
            <tr key={row.donorId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{row.donorName}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.donorPAN || '-'}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                {formatCurrency(row.totalDonated)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {formatCurrency(row.totalExpended)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={row.balance >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {formatCurrency(row.balance)}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <Badge variant="info" size="sm">{row.donationCount}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DonorSummaryTable;
