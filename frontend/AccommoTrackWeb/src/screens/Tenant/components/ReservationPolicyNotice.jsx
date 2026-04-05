import React from 'react';

export default function ReservationPolicyNotice({ policy, compact = false }) {
  if (!policy || typeof policy.message !== 'string' || policy.message.trim() === '') {
    return null;
  }

  const feeRequired = Boolean(policy.fee_required);

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        feeRequired
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      } ${compact ? 'mt-3' : 'mt-4'}`}
    >
      <p
        className={`text-[11px] font-semibold ${
          feeRequired
            ? 'text-amber-800 dark:text-amber-300'
            : 'text-green-800 dark:text-green-300'
        }`}
      >
        {policy.message}
      </p>
    </div>
  );
}