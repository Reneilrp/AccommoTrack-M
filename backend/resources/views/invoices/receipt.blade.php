<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - {{ $invoice->reference }}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1f2937;
            background: #f3f4f6; /* Gray background for better contrast */
            margin: 0;
            padding: 0;
            line-height: 1.5;
            min-height: 100vh;
        }
        .receipt-container {
            width: 46vw;
            height: 85vh;
            margin: 3.5vh auto;
            background: #fff;
            padding: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -6px rgba(0, 0, 0, 0.04);
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow-y: auto;
            box-sizing: border-box;
            position: relative;
        }
        @media (min-width: 1024px) {
            .receipt-container {
                width: 42vw;
                height: 80vh;
                margin: 8vh auto;
                padding: 28px;
                border-radius: 16px;
            }
        }
        .receipt-container h1 {
            font-size: 20px;
            line-height: 1.15;
        }
        .receipt-container .logo {
            font-size: 17px;
        }
        .receipt-container h3,
        .receipt-container .status-badge,
        .receipt-container th {
            font-size: 9px;
        }
        .receipt-container p,
        .receipt-container td,
        .receipt-container .total-row {
            font-size: 11px !important;
            line-height: 1.22;
        }
        .receipt-container .total-row.grand-total {
            font-size: 14px !important;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 14px;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 10px;
        }
        .logo {
            font-size: 20px;
            font-weight: 800;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 14px;
        }
        .info-section h3 {
            font-size: 9px;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        .info-section p {
            margin: 0;
            font-size: 12px;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        th {
            text-align: left;
            font-size: 10px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            background: #f9fafb;
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        td {
            padding: 8px;
            font-size: 12px;
            border-bottom: 1px solid #f3f4f6;
        }
        .total-section {
            margin-left: auto;
            width: 250px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 12px;
        }
        .total-row.grand-total {
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            border-top: 2px solid #e5e7eb;
            margin-top: 6px;
            padding-top: 10px;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-partially-refunded { background: #fef3c7; color: #92400e; }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
        }
        @media print {
            body { background: #fff; padding: 0; min-height: auto; }
            .receipt-container { 
                width: 100%; 
                height: auto; 
                margin: 0; 
                padding: 0; 
                box-shadow: none; 
                border: none; 
                border-radius: 0;
                overflow: visible;
            }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            Print / Save as PDF
        </button>
    </div>

    @php
        $settledStatuses = ['succeeded', 'paid', 'partially_refunded', 'refunded'];
        $settledTransactions = $invoice->transactions
            ->filter(function ($tx) use ($settledStatuses) {
                return in_array(strtolower((string) $tx->status), $settledStatuses, true)
                    && (int) ($tx->amount_cents ?? 0) > 0;
            })
            ->values();

        $subtotalCents = (int) ($invoice->subtotal_cents ?? $invoice->amount_cents ?? 0);
        $taxCents = (int) ($invoice->tax_cents ?? 0);
        $totalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);
        $netPaidCents = (int) $settledTransactions->sum(function ($tx) {
            $amountCents = (int) ($tx->amount_cents ?? 0);
            $refundedCents = max(0, (int) ($tx->refunded_amount_cents ?? 0));

            return max(0, $amountCents - $refundedCents);
        });
        $displayPaidCents = $netPaidCents > 0 ? $netPaidCents : $totalCents;
        $isPartiallyRefunded = strtolower((string) ($invoice->status ?? '')) === 'partially_refunded';
        
        // CRYPTOGRAPHIC ASSURANCE:
        // We point the QR code to the FRONTEND React app, passing an HMAC signature.
        // This signature proves the reference was not tampered with.
        $reference = (string) $invoice->receipt_reference;
        $signature = hash_hmac('sha256', $reference, config('app.key'));
        $frontendUrl = rtrim((string) (config('app.frontend_url') ?: config('app.url') ?: 'https://accommotrack.me'), '/');
        
        // Use http_build_query for clean URL generation
        $query = http_build_query(['sig' => $signature]);
        $verificationUrl = "{$frontendUrl}/verify-receipt/{$reference}?{$query}";
    @endphp

    <div class="receipt-container">
        <div class="header">
            <div>
                <div class="logo">AccommoTrack</div>
                <p style="font-size: 11px; color: #6b7280; margin-top: 3px;">Premium Rental Management</p>
            </div>
            <div style="text-align: right;">
                <h1 style="margin: 0; color: #111827;">OFFICIAL RECEIPT</h1>
                <p style="color: #6b7280; font-size: 12px; margin: 2px 0 6px;">#{{ $invoice->reference }}</p>
                <div class="status-badge {{ $isPartiallyRefunded ? 'status-partially-refunded' : 'status-paid' }}">
                    {{ $isPartiallyRefunded ? 'Partially Refunded' : 'Paid' }}
                </div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-section">
                <h3>Billed To</h3>
                <p>{{ $invoice->tenant?->first_name }} {{ $invoice->tenant?->last_name }}</p>
                <p style="font-weight: 400; color: #6b7280;">{{ $invoice->tenant?->email }}</p>
                <p style="font-weight: 400; color: #6b7280; margin-top: 5px;">
                    {{ $invoice->property?->title }}<br>
                    {{ $invoice->property?->address }}
                </p>
            </div>
            <div class="info-section" style="text-align: right;">
                <h3>Payment Details</h3>
                <p>Date Issued: {{ $invoice->issued_at?->format('F d, Y') ?? $invoice->created_at->format('F d, Y') }}</p>
                <p>Payment Date: {{ $invoice->paid_at?->format('F d, Y') ?? 'Confirmed' }}</p>
                @if($invoice->billing_period_start && $invoice->billing_period_end)
                <p style="color: #059669; margin-top: 2px;">Period: {{ $invoice->billing_period_start->format('M d') }} — {{ $invoice->billing_period_end->format('M d, Y') }}</p>
                @endif
                <p>Currency: {{ strtoupper($invoice->currency) }}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $invoice->description ?? 'Rental Payment' }}</td>
                    <td style="text-align: right;">{{ number_format($invoice->amount_cents / 100, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span>Subtotal</span>
                <span>{{ number_format($subtotalCents / 100, 2) }}</span>
            </div>
            @if($taxCents > 0)
            <div class="total-row">
                <span>Tax ({{ $invoice->tax_percent }}%)</span>
                <span>{{ number_format($taxCents / 100, 2) }}</span>
            </div>
            @endif
            <div class="total-row grand-total">
                <span>Total Paid</span>
                <span>₱{{ number_format($displayPaidCents / 100, 2) }}</span>
            </div>
        </div>

        @if($settledTransactions->count() > 0)
        <div style="margin-top: 22px;">
            <h3 style="font-size: 10px; color: #9ca3af; text-transform: uppercase; margin-bottom: 2px;">Transaction Breakdown</h3>
            @foreach($settledTransactions as $tx)
            @php
                $txAmountCents = (int) ($tx->amount_cents ?? 0);
                $txRefundedCents = max(0, (int) ($tx->refunded_amount_cents ?? 0));
                $txNetCents = max(0, $txAmountCents - $txRefundedCents);
            @endphp
            @if($txNetCents <= 0)
                @continue
            @endif
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #f3f4f6; padding: 8px 0;">
                <div style="font-size: 12px;">
                    <strong>{{ strtoupper((string) ($tx->method ?? 'payment')) }} Payment</strong><br>
                    <span style="color: #6b7280; font-size: 10px;">Ref: {{ $tx->gateway_reference ?? $tx->reference ?? 'SYSTEM' }} • {{ $tx->created_at->format('M d, H:i') }}</span>
                    @if($txRefundedCents > 0)
                        <br><span style="color: #9ca3af; font-size: 9px;">Refund applied: -₱{{ number_format($txRefundedCents / 100, 2) }}</span>
                    @endif
                </div>
                <div style="font-size: 12px; font-weight: 700;">
                    ₱{{ number_format($txNetCents / 100, 2) }}
                </div>
            </div>
            @endforeach
        </div>
        @endif

        <div class="footer" style="display: flex; align-items: flex-end; justify-content: space-between; text-align: left; padding-top: 22px; border-top: 1px solid #f3f4f6; margin-top: 30px; gap: 10px;">
            <div style="flex: 1;">
                <p style="font-weight: 800; color: #111827; margin-bottom: 4px;">Thank you for your prompt payment.</p>
                <p style="margin-top: 0; color: #6b7280;">This is an official computer-generated receipt from the AccommoTrack Management System. All records are secured and verifiable.</p>
                
                @if($invoice->receipt_reference && $verificationUrl)
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
                    <div data-qr-wrapper style="background: #ecfdf5; padding: 6px; border-radius: 10px; border: 1px solid #d1fae5; width: 70px; min-height: 70px; display: flex; align-items: center; justify-content: center;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{ rawurlencode($verificationUrl) }}" alt="QR Code" style="width: 70px; height: 70px; display: block;" onerror="this.style.display='none'; var fallback=this.parentElement.querySelector('[data-qr-fallback]'); if (fallback) { fallback.style.display='block'; }">
                        <p data-qr-fallback style="display: none; font-size: 10px; color: #6b7280; line-height: 1.25; text-align: center; word-break: break-all; margin: 0;">Open verify link</p>
                    </div>
                    <div style="max-width: 220px;">
                        <p style="font-size: 9px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px;">Scan to Verify Authenticity</p>
                        <p style="font-size: 10px; color: #6b7280; line-height: 1.2;">Use any smartphone camera to verify this document's official status in our secure registry.</p>
                        <p style="font-size: 9px; color: #9ca3af; margin-top: 3px; font-family: monospace;">REF: {{ $invoice->receipt_reference }}</p>
                        <p style="font-size: 9px; color: #9ca3af; margin-top: 3px;">Verify URL: {{ $verificationUrl }}</p>
                    </div>
                </div>
                @else
                <div style="margin-top: 20px; color: #9ca3af; font-size: 11px;">
                    Verification QR code is unavailable for this legacy record.
                </div>
                @endif
            </div>
            <div style="text-align: right; min-width: 118px;">
                <div style="display: inline-block; border: 2px solid #059669; color: #059669; padding: 6px 10px; border-radius: 8px; font-weight: 800; font-size: 11px; transform: rotate(-5deg); opacity: 0.6;">
                    CERTIFIED<br>SYSTEM RECORD
                </div>
            </div>
        </div>
    </div>

    <script>
        // Auto-open print dialog if query param 'print=1' is present
        if (window.location.search.includes('print=1')) {
            window.onload = () => {
                setTimeout(() => window.print(), 500);
            };
        }
    </script>
</body>
</html>
