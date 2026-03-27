import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function getBarColor(pct) {
  if (pct >= 90) return '#E87A7A';        // red-ish coral
  if (pct >= 70) return '#e8c07a';        // amber
  return '#8ECFCA';                        // brand teal
}

function getTextColor(pct) {
  if (pct >= 90) return 'text-red-500';
  if (pct >= 70) return 'text-amber-600';
  return 'text-teal-500';
}

export function FundUtilizationBar({ byFund = [] }) {
  if (byFund.length === 0) {
    return (
      <div className="text-center py-10 text-ez-muted">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-sm">No fund data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {byFund.map((fund) => {
        const pct = fund.utilizationPct || 0;
        return (
          <div key={fund.fundCategory} className="bg-cream-100 rounded-xl border border-cream-200 p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <p className="font-semibold text-sm text-ez-dark">{fund.fundCategory}</p>
                <p className="text-xs text-ez-muted mt-0.5">
                  {fund.donationCount} donation{fund.donationCount !== 1 ? 's' : ''}
                  &nbsp;&middot;&nbsp;
                  {fund.expenseCount} expense{fund.expenseCount !== 1 ? 's' : ''}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${getTextColor(pct)}`}
                style={{ backgroundColor: getBarColor(pct) + '22' }}>
                {pct.toFixed(1)}%
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full rounded-full h-2 mb-3 overflow-hidden" style={{ backgroundColor: '#e8e0d8' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: getBarColor(pct) }}
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center bg-white rounded-lg p-2 border border-cream-200">
                <p className="text-ez-muted mb-0.5">Donated</p>
                <p className="font-semibold text-ez-dark">{formatCurrency(fund.totalDonated)}</p>
              </div>
              <div className="text-center bg-white rounded-lg p-2 border border-cream-200">
                <p className="text-ez-muted mb-0.5">Expended</p>
                <p className="font-semibold text-ez-dark">{formatCurrency(fund.totalExpended)}</p>
              </div>
              <div className="text-center bg-white rounded-lg p-2 border border-cream-200">
                <p className="text-ez-muted mb-0.5">Balance</p>
                <p className={`font-semibold ${fund.balance >= 0 ? 'text-teal-500' : 'text-red-500'}`}>
                  {formatCurrency(fund.balance)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FundUtilizationBar;
