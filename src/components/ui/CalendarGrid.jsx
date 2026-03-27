import React, { useState, useMemo } from 'react';

/**
 * Reusable monthly calendar grid.
 *
 * Props:
 *  items       – array of records
 *  getDate     – fn(item) → 'YYYY-MM-DD' string or falsy
 *  renderDot   – fn(item) → { label, color, bg }
 *  onItemClick – fn(item)  — click an existing event chip
 *  onDayClick  – fn(dateStr) — click the "+" to add new record on that date
 */
export function CalendarGrid({ items = [], getDate, renderDot, onItemClick, onDayClick }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel  = new Date(viewYear, viewMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const byDate = useMemo(() => {
    const map = {};
    items.forEach(item => {
      const raw = getDate(item);
      if (!raw) return;
      const key = String(raw).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [items, getDate]);

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = n => String(n).padStart(2, '0');

  return (
    <div className="bg-white rounded-xl border border-cream-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-cream-100 text-ez-muted transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-serif text-base text-ez-dark">{monthLabel}</h3>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-cream-100 text-ez-muted transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-cream-200 bg-cream-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-ez-muted py-2">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return (
            <div key={`e-${i}`} className="min-h-24 border-b border-r border-cream-100 bg-cream-50 opacity-40" />
          );
          const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
          const dayItems = byDate[key] || [];
          const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

          return (
            <div key={day} className="min-h-24 p-1.5 border-b border-r border-cream-100 hover:bg-cream-50 transition-colors group relative">
              {/* Date number + add button row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'text-white' : 'text-ez-muted'}`}
                  style={isToday ? { backgroundColor: '#E8967A' } : {}}>
                  {day}
                </span>
                {onDayClick && (
                  <button
                    onClick={() => onDayClick(key)}
                    title={`Add on ${key}`}
                    className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center text-white text-xs font-bold transition-opacity flex-shrink-0"
                    style={{ backgroundColor: '#E8967A' }}>
                    +
                  </button>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item, idx) => {
                  const dot = renderDot(item);
                  return (
                    <button key={idx} onClick={() => onItemClick && onItemClick(item)}
                      className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium transition-opacity hover:opacity-75"
                      style={{ backgroundColor: dot.bg, color: dot.color }}>
                      {dot.label}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <p className="text-xs text-ez-muted pl-1">+{dayItems.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarGrid;
