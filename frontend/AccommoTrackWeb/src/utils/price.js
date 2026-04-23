import Decimal from './decimal';

/**
 * Formats a standard decimal value into Philippine Peso.
 * Expects base units (e.g., 150.50), NOT cents!
 */
export const formatPrice = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '₱0.00';
    }

    // Wrap in Decimal.js for safe precision math, NO multiplication/division here
    const safeAmount = new Decimal(amount);

    return `₱${safeAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};