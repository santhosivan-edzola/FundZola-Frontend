import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout() {
  const { pathname } = useLocation();
  const fullHeight   = pathname.startsWith('/copilot');

  return (
    <div className="flex h-screen bg-cream-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-48 min-w-0">
        {!fullHeight && <Topbar />}
        <main className={fullHeight ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-6'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
