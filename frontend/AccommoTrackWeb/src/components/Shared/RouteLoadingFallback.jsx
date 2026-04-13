import React from 'react';

export default function RouteLoadingFallback({
  fullScreen = false,
  label = 'Loading module',
  showSpinner = true,
  blurBackground = true,
}) {
  const wrapperClass = fullScreen
    ? 'min-h-screen'
    : 'min-h-[70vh]';
  const backdropClass = blurBackground
    ? 'bg-slate-100/40 dark:bg-slate-800/25 backdrop-blur-sm'
    : '';

  return (
    <div
      className={`w-full ${wrapperClass} flex items-center justify-center px-4 py-6 ${backdropClass}`}
      role="status"
      aria-live="polite"
    >
      {showSpinner && (
        <div
          className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">{label}...</span>
    </div>
  );
}
