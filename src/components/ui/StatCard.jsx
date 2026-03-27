import React from 'react';

const colorMap = {
  coral:  { bg: 'bg-coral-50',  icon: 'bg-coral-500',  text: 'text-coral-600',  border: 'border-coral-100'  },
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-300',   text: 'text-teal-600',   border: 'border-teal-100'   },
  peach:  { bg: 'bg-peach',     icon: 'bg-coral-400',  text: 'text-coral-600',  border: 'border-coral-100'  },
  green:  { bg: 'bg-teal-50',   icon: 'bg-teal-300',   text: 'text-teal-600',   border: 'border-teal-100'   },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-400',    text: 'text-red-600',    border: 'border-red-100'    },
  yellow: { bg: 'bg-amber-50',  icon: 'bg-amber-400',  text: 'text-amber-600',  border: 'border-amber-100'  },
  blue:   { bg: 'bg-coral-50',  icon: 'bg-coral-500',  text: 'text-coral-600',  border: 'border-coral-100'  },
  gray:   { bg: 'bg-cream-100', icon: 'bg-ez-dark3',   text: 'text-ez-muted',   border: 'border-cream-200'  },
};

const trendStyles = {
  up:      'text-teal-600 bg-teal-50',
  down:    'text-red-500 bg-red-50',
  neutral: 'text-ez-muted bg-cream-100',
};

export function StatCard({ title, value, subtitle, icon, trend, trendValue, color = 'coral' }) {
  const colors = colorMap[color] || colorMap.coral;

  return (
    <div className={`bg-white rounded-xl2 shadow-card border ${colors.border} p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center text-white`}>
          {icon}
        </div>
        {trend && trendValue && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trendStyles[trend]}`}>
            {trend === 'up' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-ez-dark leading-tight">{value}</p>
        <p className="text-xs font-semibold text-ez-muted mt-0.5 uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-xs text-ez-muted mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default StatCard;
