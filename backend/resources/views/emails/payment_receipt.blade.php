<x-mail::message>
# Payment Receipt
**Receipt Reference:** {{ $invoice->receipt_reference }}

Hi {{ $invoice->tenant->first_name ?? 'Tenant' }},

Thank you for your payment! This email serves as your official receipt.

### Payment Details
- **Description:** {{ $invoice->description }}
- **Amount Paid:** {{ number_format($invoice->amount_cents / 100, 2) }} {{ $invoice->currency }}
- **Date Paid:** {{ \Carbon\Carbon::parse($invoice->paid_at)->format('F j, Y g:i A') }}
- **Invoice Reference:** {{ $invoice->reference }}

### Property Info
- **Landlord:** {{ $invoice->landlord->first_name ?? '' }} {{ $invoice->landlord->last_name ?? '' }}
@if($invoice->property)
- **Property:** {{ $invoice->property->name }}
@endif

If you have any questions or concerns regarding this transaction, please do not hesitate to contact your landlord and provide the **Receipt Reference**.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
