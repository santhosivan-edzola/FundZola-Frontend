import React from 'react';
import { useLocation } from 'react-router-dom';
import { useOrg } from '../../hooks/useOrg';

const pageTitles = {
  '/': 'Dashboard',
  '/donors': 'Donors',
  '/donations': 'Donations',
  '/expenses': 'Expenses',
  '/settings': 'Settings',
};

export function Topbar() {
  const location = useLocation();
  const { orgSettings } = useOrg();

  const getTitle = () => {
    if (location.pathname.startsWith('/donors/')) return 'Donor Details';
    return pageTitles[location.pathname] || 'Fundzola';
  };

  const initials = (orgSettings.orgName || 'F')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-cream-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
      <h1 className="font-serif text-lg text-ez-dark">{getTitle()}</h1>

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
