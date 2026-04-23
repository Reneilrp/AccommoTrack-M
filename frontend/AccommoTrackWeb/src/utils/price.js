import Decimal from './decimal';

/**
 * Format price for Web with Decimal.js support for precision.
 * 
 * @param {string|number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted price (e.g., ₱1,234.56)
 */
export function formatPrice(value, { 
  currency = 'PHP', 
  locale = 'en-PH', 
  minimumFractionDigits = 2,
  isCents = false
} = {}) {
  let num;
  try {
    // Ensure accurate precision before formatting
    const d = new Decimal(value || 0);
    num = isCents ? d.div(100).toNumber() : d.toNumber();
  } catch (_err) {
    num = 0;
  }

  if (!Number.isFinite(num)) return formatZero(currency);

  const digits = minimumFractionDigits;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 2)
    }).format(num);
  } catch (_err) {
    // Fallback formatting
    const symbol = currency === 'PHP' ? '₱' : (currency + ' ');
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 2)
    });
    return `${symbol}${formatted}`;
  }
}

/**
 * Fallback for zero values
 */
function formatZero(currency) {
  if (currency === 'PHP') return '₱0.00';
  return '0.00';
}

/**
 * Format per person/per slot cost
 */
export function formatPerPerson(total, capacity, opts) {
  try {
    const t = new Decimal(total || 0);
    const c = new Decimal(capacity || 1);
    const per = c.gt(0) ? t.div(c) : t;
    return formatPrice(per.toNumber(), opts);
  } catch (_err) {
    return formatPrice(0, opts);
  }
}

export default formatPrice;
