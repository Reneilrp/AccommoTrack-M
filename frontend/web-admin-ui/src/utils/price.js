export function formatPrice(value, { currency = 'PHP', locale = 'en-PH', minimumFractionDigits = 0 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return formatZero(currency);

  // For PHP show zero decimal places by default, but allow 2 decimals when cents are present
  const digits = Number.isInteger(num) && minimumFractionDigits === 0 ? 0 : Math.max(2, minimumFractionDigits);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(num);
  } catch (e) {
    // Fallback: simple formatted number with currency symbol
    return (currency === 'PHP' ? '₱' : '') + num.toLocaleString();
  }
}

function formatZero(currency) {
  if (currency === 'PHP') return '₱0';
  return '0';
}

export function formatPerPerson(total, capacity, opts) {
  const t = Number(total) || 0;
  const c = Number(capacity) || 1;
  const per = c > 0 ? t / c : t;
  return formatPrice(per, opts);
}

export default formatPrice;
