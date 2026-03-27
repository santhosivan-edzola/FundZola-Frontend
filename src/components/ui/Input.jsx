import React from 'react';

export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  className = '',
  hint,
  ...rest
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="ez-label">
          {label}
          {required && <span className="text-coral-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`ez-input ${
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400'
            : ''
        } ${disabled ? 'bg-cream-100 text-ez-muted cursor-not-allowed opacity-70' : ''}`}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-ez-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default Input;
