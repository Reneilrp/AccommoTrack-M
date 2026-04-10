import React from 'react';

export default function RouteLoadingFallback({ fullScreen = false, label = 'Loading module' }) {
  const wrapperClass = fullScreen
    ? 'min-h-screen'
    : 'min-h-[70vh]';

  return (
    <div className={`w-full ${wrapperClass} flex items-center justify-center px-4 py-6`} role="status" aria-live="polite">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 shadow-sm min-h-[48vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}...</p>
      </div>
    </div>
  );
}
