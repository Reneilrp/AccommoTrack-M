import React from 'react';

export default function PricingHelp({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 z-10">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Pricing formula help</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mt-4 text-sm text-gray-700 space-y-3">
          <p>
            This explains how room charges are calculated depending on the billing policy.
          </p>

          <div>
            <strong>monthly_rate</strong>: fixed price for a full month (e.g. ₱5,000 / month).
          </div>

          <div>
            <strong>monthly</strong>: Charge a fixed price per full month using the landlord-entered <em>Monthly Rate</em>.
            This policy is intended for month-based stays. For stays that include extra days beyond whole months,
            use <strong>Monthly + Daily</strong> (below) or select <strong>Daily</strong> when renting strictly by day.
            <div className="mt-2 p-3 bg-gray-50 rounded border text-xs">
              Example: monthly_rate = ₱5,000
              <div className="mt-1 font-medium">A 30-day booking → ₱5,000</div>
              <div className="mt-1 text-gray-500">(If the booking includes extra days, use Monthly + Daily to bill leftover days.)</div>
            </div>
          </div>

          <div>
            <strong>monthly_with_daily</strong>: Charge full months at the Monthly Rate, and charge any leftover days at the landlord-entered Daily Rate.
            This requires the Daily Rate to be set when choosing this policy.
            <div className="mt-2 p-3 bg-gray-50 rounded border text-xs">
              Example: monthly_rate = ₱5,000, daily_rate = ₱300, stay = 35 days
              <div className="mt-1">months = 1 → ₱5,000</div>
              <div>remaining = 5 → 5 × ₱300 = ₱1,500</div>
              <div className="mt-1 font-medium">Total = ₱6,500</div>
            </div>
          </div>

          <div>
            <strong>daily</strong>: Charge every day using the landlord-entered Daily Rate (suitable for short stays and daily rentals).
            <div className="mt-2 p-3 bg-gray-50 rounded border text-xs">
              Example: daily_rate = ₱300, stay = 5 days → 5 × ₱300 = ₱1,500
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Notes: calculations round to 2 decimals. The server-side calculation is authoritative; use the preview endpoint for booking estimates.
          </div>
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-green-600 text-white rounded">Got it</button>
        </div>
      </div>
    </div>
  );
}
