import { Decimal } from 'decimal.js';

// Configure Decimal for financial calculations
// Default precision is 20 (plenty for currency)
// Default rounding mode is ROUND_HALF_UP (common for financial)
Decimal.set({ 
  precision: 20, 
  rounding: Decimal.ROUND_HALF_UP 
});

export default Decimal;
