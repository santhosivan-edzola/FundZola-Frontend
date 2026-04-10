import React from 'react';

const variantClasses = {
  primary:   'border-transparent text-white shadow-sm',
  secondary: 'bg-white hover:bg-cream-100 text-ez-dark border-cream-300 focus:ring-coral-200',
  danger:    'bg-red-500 hover:bg-red-600 text-white border-transparent focus:ring-red-300 shadow-sm',
  success:   'border-transparent text-white shadow-sm',
  ghost:     'bg-transparent hover:bg-cream-100 text-ez-muted border-transparent focus:ring-cream-300',
  teal:      'border-transparent text-white shadow-sm',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  children,
  icon,
}) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const darkStyle = ['primary', 'success', 'teal'].includes(variant)
    ? { background: '#1A1A1A', color: '#fff' }
    : {};

  const hoverClass = ['primary', 'success', 'teal'].includes(variant)
    ? 'hover:opacity-85'
    : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={darkStyle}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${hoverClass} ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
