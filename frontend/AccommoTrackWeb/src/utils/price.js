import Decimal from './decimal';

export function formatPrice(value, { currency = 'PHP', locale = 'en-PH', minimumFractionDigits = 2 } = {}) {
  let num;
  try {
    num = new Decimal(value || 0).toNumber();
  } catch (__e) {
    num = 0;
  }

  if (!Number.isFinite(num)) return formatZero(currency);

  // For financial decimals, we usually want at least 2 decimal places.
  const digits = minimumFractionDigits;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 2)
    }).format(num);
  } catch (__e) {
    // Fallback: simple formatted number with currency symbol
    return (currency === 'PHP' ? '₱' : '') + num.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 2)
    });
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
