import React from 'react';
import formatPrice from '../../utils/price';

export default function PriceRow({ amount = 0, currency = 'PHP', locale = 'en-PH', suffix = '', className = '', small = false }) {
  const formatted = formatPrice(amount, { currency, locale });
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}> 
      <span className={small ? 'text-sm font-medium' : 'text-base font-semibold'}>{formatted}</span>
      {suffix ? <span className="text-xs text-gray-500">{suffix}</span> : null}
    </span>
  );
}
