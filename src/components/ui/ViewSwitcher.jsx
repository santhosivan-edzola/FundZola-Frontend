import React from 'react';

const VIEW_ICONS = {
  list: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  kanban: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

const VIEW_LABELS = { list: 'List', kanban: 'Kanban', calendar: 'Calendar' };

export function ViewSwitcher({ view, onChange, views = ['list', 'kanban', 'calendar'] }) {
  return (
    <div className="flex rounded-lg border border-cream-300 overflow-hidden flex-shrink-0">
      {views.map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          title={VIEW_LABELS[v]}
          className="p-2 transition-colors"
          style={{
            backgroundColor: view === v ? '#E8967A' : '#fff',
            color: view === v ? '#1A1A1A' : '#888',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={VIEW_ICONS[v]} />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default ViewSwitcher;
