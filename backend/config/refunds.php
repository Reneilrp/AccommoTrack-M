<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fixed Refund Penalty
    |--------------------------------------------------------------------------
    |
    | Penalty in cents deducted from the prorated refundable amount.
    | Example: 50000 = PHP 500.00
    |
    */
    'fixed_penalty_cents' => (int) env('REFUND_FIXED_PENALTY_CENTS', 0),
];
