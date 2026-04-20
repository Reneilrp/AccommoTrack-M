<x-mail::message>
@php
	$tenant = $invoice->tenant ?? $invoice->booking?->tenant;
	$landlord = $invoice->landlord ?? $invoice->property?->landlord;
	$property = $invoice->property;
	$amountPaidCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);
	$paidAtLabel = $invoice->paid_at?->format('F j, Y g:i A') ?? 'Payment Confirmed';
	$receiptUrl = URL::signedRoute('invoices.receipt', ['id' => $invoice->id]);
	$printReceiptUrl = URL::signedRoute('invoices.receipt', ['id' => $invoice->id, 'print' => 1]);
@endphp

# Payment Receipt
**Receipt Reference:** {{ $invoice->receipt_reference ?? 'Pending assignment' }}

Hi {{ $tenant?->first_name ?? 'Tenant' }},

Thank you for your payment! This email serves as your official receipt.

### Payment Details
- **Description:** {{ $invoice->description }}
- **Amount Paid:** {{ number_format($amountPaidCents / 100, 2) }} {{ $invoice->currency }}
- **Date Paid:** {{ $paidAtLabel }}
- **Invoice Reference:** {{ $invoice->reference }}

### Property Info
- **Landlord:** {{ trim(($landlord?->first_name ?? '').' '.($landlord?->last_name ?? '')) ?: 'AccommoTrack Partner' }}
@if($property)
- **Property:** {{ $property->title ?? $property->name }}
@endif

If you have any questions or concerns regarding this transaction, please do not hesitate to contact your landlord and provide the **Receipt Reference**.

<x-mail::button :url="$receiptUrl">
View Official Receipt
</x-mail::button>

<x-mail::button :url="$printReceiptUrl" color="success">
Print Official Receipt
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
