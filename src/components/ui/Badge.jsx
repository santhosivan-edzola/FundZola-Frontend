import React from 'react';

const variantClasses = {
  success: 'bg-teal-50 text-teal-600 border-teal-200',
  warning: 'bg-amber-50 text-amber-600 border-amber-200',
  danger:  'bg-red-50 text-red-500 border-red-200',
  info:    'bg-coral-50 text-coral-600 border-coral-200',
  teal:    'bg-teal-50 text-teal-600 border-teal-100',
  coral:   'bg-coral-50 text-coral-600 border-coral-100',
  gray:    'bg-cream-100 text-ez-muted border-cream-200',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({ variant = 'gray', children, size = 'md' }) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${
        variantClasses[variant] || variantClasses.gray
      } ${sizeClasses[size] || sizeClasses.md}`}
    >
      {children}
    </span>
  );
}

export default Badge;
