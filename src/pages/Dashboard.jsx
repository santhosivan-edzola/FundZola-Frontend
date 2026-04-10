import React from 'react';
import { Link } from 'react-router-dom';
import { useFundSummary } from '../hooks/useFundSummary';
import { useDonations } from '../hooks/useDonations';
import { useDonors } from '../hooks/useDonors';
import { useExpenses } from '../hooks/useExpenses';
import { StatCard } from '../components/ui/StatCard';
import { FundUtilizationBar } from '../components/dashboard/FundUtilizationBar';
import { DonorSummaryTable } from '../components/dashboard/DonorSummaryTable';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';

export function Dashboard() {
  const { byDonor, byFund, totals, loading: summaryLoading } = useFundSummary();
  const { donations, loading: donationsLoading } = useDonations();
  const { donors, loading: donorsLoading } = useDonors();
  const { expenses, loading: expensesLoading } = useExpenses();

  const isLoading = summaryLoading || donationsLoading || donorsLoading || expensesLoading;

  const recentDonations = [...donations]
    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
    .slice(0, 5);

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
    .slice(0, 5);

  const donorMap = {};
  donors.forEach((d) => { donorMap[d.id] = d; });

  const headerBg = '#1A1A1A';

  if (isLoading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div style={{ background: '#E8E2DB', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero banner */}
      <div className="px-6 py-5 flex items-center justify-between"
        style={{ background: headerBg, borderRadius: 14 }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#fff', opacity: 0.75 }}>
            Fund Management
          </p>
          <h2 className="font-sans text-2xl" style={{ color: '#fff' }}>
            Welcome back
          </h2>
          <p className="text-sm mt-1" style={{ color: '#fff', opacity: 0.75 }}>
            {totals.totalDonors} donors &middot; {totals.totalDonations} donations recorded
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <Link to="/donations"
            className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: '#fff', color: '#E8967A' }}>
            + Add Donation
          </Link>
          <Link to="/donors"
            className="text-xs font-semibold px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}>
            Add Donor
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Donors"
          value={totals.totalDonors}
          subtitle={`${totals.totalDonations} donations`}
          color="coral"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 16a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Donated"
          value={formatCurrency(totals.totalDonated)}
          subtitle={`${totals.totalDonations} donations`}
          color="teal"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Expended"
          value={formatCurrency(totals.totalExpended)}
          subtitle={`${totals.totalExpenses} expenses`}
          color="yellow"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          }
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(totals.balance)}
          subtitle="Available funds"
          color={totals.balance >= 0 ? 'teal' : 'red'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fund utilization */}
        <div className="lg:col-span-2" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: headerBg, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fund Utilization</span>
            <Link to="/donations" style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>View all →</Link>
          </div>
          <div style={{ padding: '20px' }}>
            <FundUtilizationBar byFund={byFund.slice(0, 6)} />
          </div>
        </div>

        {/* Top donors */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: headerBg, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top Donors</span>
            <Link to="/donors" style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>View all →</Link>
          </div>
          <div style={{ padding: '20px' }}>
            {byDonor.length === 0 ? (
              <p className="text-sm text-ez-muted text-center py-8">No donors yet</p>
            ) : (
              <div className="space-y-3">
                {byDonor.slice(0, 5).map((d, i) => (
                  <div key={d.donorId} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: i === 0 ? '#E8967A' : '#F5F0EB', color: i === 0 ? '#fff' : '#6b6b6b' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ez-dark truncate">{d.donorName}</p>
                      <p className="text-xs text-ez-muted">{d.donationCount} donation{d.donationCount !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-ez-dark whitespace-nowrap">
                      {formatCurrency(d.totalDonated)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent donations */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: headerBg, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Donations</span>
            <Link to="/donations" style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>View all →</Link>
          </div>
          {recentDonations.length === 0 ? (
            <p className="text-sm text-ez-muted text-center py-8">No donations yet</p>
          ) : (
            <div className="divide-y divide-cream-200">
              {recentDonations.map((d) => {
                const donor = donorMap[d.donor_id || d.donorId] || { name: d.donor_name };
                return (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-cream-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-ez-dark">{donor ? donor.name : 'Unknown'}</p>
                      <p className="text-xs text-ez-muted mt-0.5">
                        {d.receipt_number || d.receiptNumber} &middot; {formatDate(d.donation_date || d.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ez-dark">{formatCurrency(d.amount)}</p>
                      <Badge variant="info" size="sm">{d.fund_category || d.fundCategory || 'General'}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
          <div style={{ background: headerBg, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Expenses</span>
            <Link to="/expenses" style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>View all →</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-ez-muted text-center py-8">No expenses yet</p>
          ) : (
            <div className="divide-y divide-cream-200">
              {recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-cream-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-ez-dark truncate max-w-[180px]">{e.description}</p>
                    <p className="text-xs text-ez-muted mt-0.5">
                      {e.category} &middot; {formatDate(e.expense_date || e.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-coral-600">&minus;{formatCurrency(e.amount)}</p>
                    <Badge variant="warning" size="sm">{e.fund_category || e.fundCategory || 'General'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donor summary table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', overflow: 'hidden' }}>
        <div style={{ background: headerBg, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Donor Utilization Summary</span>
          <Link to="/donors" style={{ color: '#fff', fontSize: 11, opacity: 0.85 }}>View all donors →</Link>
        </div>
        <DonorSummaryTable byDonor={byDonor} limit={5} />
      </div>
    </div>
  );
}

export default Dashboard;
