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
            width: 50vw;
            height: 85vh;
            margin: 5vh auto;
            background: #fff;
            padding: 20px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -6px rgba(0, 0, 0, 0.04);
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow-y: auto;
            box-sizing: border-box;
            position: relative;
        }
        @media (min-width: 1024px) {
            .receipt-container {
                width: 50vw;
                height: 80vh;
                margin: 10vh auto;
                padding: 40px;
                border-radius: 16px;
            }
        }
        .receipt-container h1 {
            font-size: 24px;
            line-height: 1.15;
        }
        .receipt-container .logo {
            font-size: 20px;
        }
        .receipt-container h3,
        .receipt-container .status-badge,
        .receipt-container th {
            font-size: 10px;
        }
        .receipt-container p,
        .receipt-container td,
        .receipt-container .total-row {
            font-size: 12px !important;
            line-height: 1.3;
        }
        .receipt-container .total-row.grand-total {
            font-size: 16px !important;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 14px;
        }
        .logo {
            font-size: 24px;
            font-weight: 800;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        .info-section h3 {
            font-size: 10px;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        .info-section p {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        th {
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            background: #f9fafb;
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        td {
            padding: 12px;
            font-size: 14px;
            border-bottom: 1px solid #f3f4f6;
        }
        .total-section {
            margin-left: auto;
            width: 300px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        .total-row.grand-total {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            border-top: 2px solid #e5e7eb;
            margin-top: 8px;
            padding-top: 16px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-paid { background: #d1fae5; color: #065f46; }
        .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 12px;
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

    <div class="receipt-container">
        <div class="header">
            <div>
                <div class="logo">AccommoTrack</div>
                <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Premium Rental Management</p>
            </div>
            <div style="text-align: right;">
                <h1 style="margin: 0; color: #111827;">OFFICIAL RECEIPT</h1>
                <p style="color: #6b7280; font-size: 14px;">#{{ $invoice->reference }}</p>
                <div class="status-badge status-paid">Paid</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-section">
                <h3>Billed To</h3>
                <p>{{ $invoice->tenant?->first_name }} {{ $invoice->tenant?->last_name }}</p>
                <p style="font-weight: 400; color: #6b7280;">{{ $invoice->tenant?->email }}</p>
                <p style="font-weight: 400; color: #6b7280; margin-top: 8px;">
                    {{ $invoice->property?->title }}<br>
                    {{ $invoice->property?->address }}
                </p>
            </div>
            <div class="info-section" style="text-align: right;">
                <h3>Payment Details</h3>
                <p>Date Issued: {{ $invoice->issued_at?->format('F d, Y') ?? $invoice->created_at->format('F d, Y') }}</p>
                <p>Payment Date: {{ $invoice->paid_at?->format('F d, Y') ?? 'Confirmed' }}</p>
                @if($invoice->billing_period_start && $invoice->billing_period_end)
                <p style="color: #059669; margin-top: 4px;">Period: {{ $invoice->billing_period_start->format('M d') }} — {{ $invoice->billing_period_end->format('M d, Y') }}</p>
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
                <span>{{ number_format($invoice->subtotal_cents / 100, 2) }}</span>
            </div>
            @if($invoice->tax_cents > 0)
            <div class="total-row">
                <span>Tax ({{ $invoice->tax_percent }}%)</span>
                <span>{{ number_format($invoice->tax_cents / 100, 2) }}</span>
            </div>
            @endif
            <div class="total-row grand-total">
                <span>Total Paid</span>
                <span>₱{{ number_format($invoice->total_cents / 100, 2) }}</span>
            </div>
        </div>

        @if($invoice->transactions->where('status', 'succeeded')->count() > 0)
        <div style="margin-top: 40px;">
            <h3 style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Transaction Breakdown</h3>
            @foreach($invoice->transactions->where('status', 'succeeded') as $tx)
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #f3f4f6; padding: 12px 0;">
                <div style="font-size: 13px;">
                    <strong>{{ strtoupper($tx->method) }} Payment</strong><br>
                    <span style="color: #6b7280; font-size: 11px;">Ref: {{ $tx->reference ?? 'SYSTEM' }} • {{ $tx->created_at->format('M d, H:i') }}</span>
                </div>
                <div style="font-size: 14px; font-weight: 700;">
                    ₱{{ number_format($tx->amount_cents / 100, 2) }}
                </div>
            </div>
            @endforeach
        </div>
        @endif

        <div class="footer" style="display: flex; align-items: flex-end; justify-content: space-between; text-align: left; padding-top: 40px; border-top: 1px solid #f3f4f6; margin-top: 60px;">
            <div style="flex: 1;">
                <p style="font-weight: 800; color: #111827; margin-bottom: 4px;">Thank you for your prompt payment.</p>
                <p style="margin-top: 0; color: #6b7280;">This is an official computer-generated receipt from the AccommoTrack Management System. All records are secured and verifiable.</p>
                
                @if($invoice->receipt_reference)
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 20px;">
                    <div style="background: #ecfdf5; padding: 10px; border-radius: 12px; border: 1px solid #d1fae5;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data={{ urlencode(route('public.receipt.verify', ['reference' => $invoice->receipt_reference])) }}" alt="QR Code" style="width: 80px; height: 80px; display: block;">
                    </div>
                    <div style="max-width: 250px;">
                        <p style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Scan to Verify Authenticity</p>
                        <p style="font-size: 11px; color: #6b7280; line-height: 1.3;">Use any smartphone camera to verify this document's official status in our secure registry.</p>
                        <p style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-family: monospace;">REF: {{ $invoice->receipt_reference }}</p>
                    </div>
                </div>
                @else
                <div style="margin-top: 20px; color: #9ca3af; font-size: 11px;">
                    Verification QR code is unavailable for this legacy record.
                </div>
                @endif
            </div>
            <div style="text-align: right; min-width: 150px;">
                <div style="display: inline-block; border: 2px solid #059669; color: #059669; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 14px; transform: rotate(-5deg); opacity: 0.6;">
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
