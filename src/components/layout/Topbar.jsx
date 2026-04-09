import React from 'react';
import { useLocation } from 'react-router-dom';
import { useOrg } from '../../hooks/useOrg';
import { useDeals } from '../../hooks/useDeals';
import { useDonors } from '../../hooks/useDonors';
import { useDonations } from '../../hooks/useDonations';
import { useExpenses } from '../../hooks/useExpenses';
import { usePrograms } from '../../hooks/usePrograms';

const pageTitles = {
  '/': 'Dashboard',
  '/donors': 'Donors',
  '/donations': 'Donations',
  '/expenses': 'Expenses',
  '/deals': 'Deals',
  '/programs': 'Programs',
  '/settings': 'Settings',
};

export function Topbar({ onMenuToggle }) {
  const location = useLocation();
  const { orgSettings } = useOrg();
  const { deals } = useDeals();
  const { donors } = useDonors();
  const { donations } = useDonations();
  const { expenses } = useExpenses();
  const { programs } = usePrograms();

  const getTitle = () => {
    if (location.pathname.startsWith('/donors/')) return 'Donor Details';
    return pageTitles[location.pathname] || 'Fundzola';
  };

  const getCount = () => {
    const path = location.pathname;
    if (path === '/deals') return deals?.length ?? null;
    if (path === '/donors') return donors?.length ?? null;
    if (path === '/donations') return donations?.length ?? null;
    if (path === '/expenses') return expenses?.length ?? null;
    if (path === '/programs') return programs?.length ?? null;
    return null;
  };

  const count = getCount();

  const initials = (orgSettings.orgName || 'F')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-cream-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-lg text-ez-muted hover:text-ez-dark hover:bg-cream-100 transition-colors mr-1"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="font-serif text-lg text-ez-dark">{getTitle()}</h1>
        {count !== null && (
          <span style={{ background: '#E8967A', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>
            {count}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Org pill */}
        <div className="hidden sm:flex items-center gap-2 bg-cream-100 rounded-full px-3 py-1.5 border border-cream-200">
          <span className="text-xs text-ez-muted">
            {orgSettings.orgName || 'Your Organization'}
          </span>
        </div>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: '#E8967A', color: '#1A1A1A' }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
