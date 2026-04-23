import Decimal from './decimal';

/**
 * Formats a currency value into Philippine Peso.
 * @param {number} amount - The amount to format.
 * @param {object} options - Optional configuration.
 * @param {boolean} options.isCents - Whether the amount is in cents (default: false).
 */
export const formatPrice = (amount, options = {}) => {
    const isCents = options.isCents === true;

    if (amount === null || amount === undefined || isNaN(amount)) {
        return '₱0.00';
    }

    // Wrap in Decimal.js for safe precision math
    let safeAmount = new Decimal(amount);

    if (isCents) {
        safeAmount = safeAmount.div(100);
    }

    return `₱${safeAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

export default formatPrice;