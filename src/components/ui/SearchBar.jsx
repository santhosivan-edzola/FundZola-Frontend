import React from 'react';

export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-ez-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 border border-cream-300 rounded-lg text-sm bg-white text-ez-dark placeholder-ez-muted focus:outline-none focus:ring-2 focus:ring-coral-300 focus:border-coral-400 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: '' } })}
          className="absolute inset-y-0 right-3 flex items-center text-ez-muted hover:text-ez-dark transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchBar;
