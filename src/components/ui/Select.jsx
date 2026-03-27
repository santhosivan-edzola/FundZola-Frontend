import React from 'react';

export function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
  placeholder = 'Select...',
  className = '',
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="ez-label">
          {label}
          {required && <span className="text-coral-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`ez-input ${
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400'
            : ''
        } ${disabled ? 'bg-cream-100 text-ez-muted cursor-not-allowed opacity-70' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default Select;
