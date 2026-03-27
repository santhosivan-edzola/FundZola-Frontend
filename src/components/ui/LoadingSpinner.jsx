import React from 'react';

/**
 * Full-page centered loading spinner.
 * Pass `size="sm"` for an inline spinner.
 */
export function LoadingSpinner({ size = 'lg', message = 'Loading...' }) {
  if (size === 'sm') {
    return (
      <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-64 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      {message && <p className="text-sm text-slate-500">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
