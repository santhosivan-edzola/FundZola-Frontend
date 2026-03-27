import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const allNavItems = [
  {
    to: '/', label: 'Dashboard', module: null, end: true,
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    to: '/donors', label: 'Donors', module: 'donors',
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 16a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    to: '/programs', label: 'Programs', module: 'programs',
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  },
  {
    to: '/deals', label: 'Deals', module: 'deals',
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    to: '/donations', label: 'Donations', module: 'donations',
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    to: '/expenses', label: 'Expenses', module: 'expenses',
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
  },
  {
    to: '/settings', label: 'Settings', module: null,
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  // Admin only
  {
    to: '/users', label: 'Users', module: '__admin__',
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
];

export function Sidebar() {
  const { user, isAdmin, hasPermission, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = allNavItems.filter(item => {
    if (item.module === '__admin__') return isAdmin;
    if (item.module === null) return true; // dashboard + settings always visible
    return hasPermission(item.module, 'can_view');
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-48 flex flex-col z-30" style={{ backgroundColor: '#1A1A1A' }}>

      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
        <div className="flex items-center gap-2">
          <img src="/edzola-logo.png" alt="EdZola" className="h-6 w-auto object-contain"
            onError={e => { e.target.style.display = 'none'; }} />
          <div>
            <p className="font-serif text-sm leading-tight" style={{ color: '#E8967A' }}>Fundzola</p>
            <p className="text-xs" style={{ color: '#8ECFCA', letterSpacing: '0.04em', fontSize: '10px' }}>by EdZola</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold uppercase px-2 mb-2" style={{ color: '#555', letterSpacing: '0.08em', fontSize: '10px' }}>Menu</p>
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${isActive ? '' : 'hover:bg-ez-dark2'}`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: '#E8967A', color: '#1A1A1A' }
                : { color: '#b0b0b0' }
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer — user info + logout */}
      <div className="px-3 py-3 border-t" style={{ borderColor: '#2a2a2a' }}>
        {user && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E8967A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A1A1A', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                {user.name?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#ddd', fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                <p style={{ color: '#555', fontSize: 10, margin: 0 }}>{isAdmin ? 'Admin' : 'User'}</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{ width: '100%', background: 'none', border: '1px solid #333', color: '#777', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
