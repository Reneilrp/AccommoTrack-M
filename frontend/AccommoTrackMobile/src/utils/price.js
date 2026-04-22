import Decimal from './decimal.js';

/**
 * Format price for React Native with Decimal.js support for precision.
 * 
 * @param {string|number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted price (e.g., ₱1,234.56)
 */
export function formatPrice(value, { 
  currency = 'PHP', 
  locale = 'en-PH', 
  minimumFractionDigits = 2 
} = {}) {
  let num;
  try {
    // Ensure accurate precision before formatting
    num = new Decimal(value || 0).toNumber();
  } catch (err) {
    num = 0;
  }

  if (!Number.isFinite(num)) return formatZero(currency);

  const digits = minimumFractionDigits;

  try {
    // Note: Some older Android versions might have limited Intl support in React Native
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 2)
    }).format(num);
  } catch (err) {
    // Fallback formatting for React Native environments without full Intl support
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
  } catch (err) {
    return formatPrice(0, opts);
  }
}

export default formatPrice;
