<?php

namespace App\Services;

use App\Mail\PaymentReceiptMail;
use App\Models\Invoice;
use App\Services\Subscription\SubscriptionCheckoutService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PaymentLedgerService
{
    public function __construct(private readonly SubscriptionCheckoutService $subscriptionCheckoutService) {}

    public function recomputeInvoiceAndBookingStatus(Invoice $invoice, ?int $actorUserId = null): Invoice
    {
        $netPaidCents = $this->calculateInvoiceNetPaidCents($invoice);
        $resolvedStatus = $this->resolveInvoiceStatus($invoice, $netPaidCents);

        $invoice->status = $resolvedStatus;
        if ($resolvedStatus === 'paid') {
            $invoice->paid_at = $invoice->paid_at ?? now();

            if (! $invoice->receipt_reference) {
                // Generate a unique receipt key
                do {
                    $ref = 'RCPT-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
                } while (Invoice::where('receipt_reference', $ref)->exists());

                $invoice->receipt_reference = $ref;
            }
        } else {
            $invoice->paid_at = null;
            $invoice->receipt_reference = null;
        }
        $invoice->save();

        $booking = $invoice->booking ?: ($invoice->booking_id ? $invoice->booking()->first() : null);
        if ($booking) {
            $booking->payment_status = $this->resolveBookingPaymentStatus($booking);
            $booking->save();
        }

        if ($resolvedStatus === 'paid') {
            try {
                $this->subscriptionCheckoutService->activateCheckoutSubscriptionFromPaidInvoice($invoice, $actorUserId);
            } catch (\Throwable $subscriptionError) {
                Log::warning('Failed to auto-activate subscription after invoice recompute', [
                    'invoice_id' => $invoice->id,
                    'error' => $subscriptionError->getMessage(),
                ]);
            }

            // Dispatch Receipt Email if not sent
            if (! $invoice->receipt_sent_at) {
                $this->dispatchReceiptEmail($invoice);
            }
        }

        return $invoice;
    }

    private function dispatchReceiptEmail(Invoice $invoice): void
    {
        $invoice->loadMissing([
            'tenant',
            'landlord',
            'property.landlord',
            'booking.tenant',
        ]);

        if (! $invoice->tenant && $invoice->booking?->tenant) {
            $invoice->setRelation('tenant', $invoice->booking->tenant);
        }

        if (! $invoice->landlord && $invoice->property?->landlord) {
            $invoice->setRelation('landlord', $invoice->property->landlord);
        }

        $recipientEmail = $this->resolveReceiptRecipientEmail($invoice);
        if (! $recipientEmail) {
            Log::warning('Skipped Payment Receipt Email: no tenant email available', [
                'invoice_id' => $invoice->id,
            ]);

            return;
        }

        try {
            Mail::to($recipientEmail)->send(new PaymentReceiptMail($invoice));
            $invoice->receipt_sent_at = now();
            $invoice->save();
        } catch (\Throwable $e) {
            Log::error('Failed to send Payment Receipt Email', [
                'invoice_id' => $invoice->id,
                'recipient_email' => $recipientEmail,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveReceiptRecipientEmail(Invoice $invoice): ?string
    {
        $email = trim((string) ($invoice->tenant?->email ?? $invoice->booking?->tenant?->email ?? ''));

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }

    public function recomputeInvoiceAndBookingStatusById(?int $invoiceId, ?int $actorUserId = null): ?Invoice
    {
        if (! $invoiceId) {
            return null;
        }

        $invoice = Invoice::with('booking')->find($invoiceId);
        if (! $invoice) {
            return null;
        }

        return $this->recomputeInvoiceAndBookingStatus($invoice, $actorUserId);
    }

    private function calculateInvoiceNetPaidCents(Invoice $invoice): int
    {
        $netPaidCents = $invoice->transactions()
            ->where('amount_cents', '>', 0)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->selectRaw('COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as net_cents')
            ->value('net_cents');

        return max(0, (int) ($netPaidCents ?? 0));
    }

    private function resolveInvoiceStatus(Invoice $invoice, int $netPaidCents): string
    {
        $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);

        if ($invoiceTotalCents > 0 && $netPaidCents >= $invoiceTotalCents) {
            return 'paid';
        }

        if ($netPaidCents > 0) {
            return 'partial';
        }

        if ($this->hasRefundActivity($invoice)) {
            return 'refunded';
        }

        $dueDate = $invoice->due_date ? Carbon::parse($invoice->due_date)->startOfDay() : null;
        if ($dueDate && $dueDate->lt(now()->startOfDay())) {
            return 'overdue';
        }

        return 'pending';
    }

    private function hasRefundActivity(Invoice $invoice): bool
    {
        return $invoice->transactions()
            ->where(function ($query) {
                $query->where(function ($nested) {
                    $nested->where('amount_cents', '<', 0)
                        ->where('status', 'refunded');
                })->orWhere('refunded_amount_cents', '>', 0);
            })
            ->exists();
    }

    public function resolveBookingPaymentStatus(\App\Models\Booking $booking): string
    {
        // Fetch all active, non-archived invoices for this booking
        $invoices = $booking->invoices()
            ->where('is_archived', false)
            ->where('status', '!=', 'cancelled')
            ->get();

        if ($invoices->isEmpty()) {
            return 'unpaid';
        }

        $allStatuses = $invoices->pluck('status')->map(fn($s) => strtolower((string)$s))->toArray();
        $statusSet = new \Illuminate\Support\Collection($allStatuses);

        // Priority 1: If anything is overdue, the booking is overdue
        if ($statusSet->contains('overdue')) {
            return 'overdue';
        }

        // Priority 2: If anything is partial or unpaid/pending, the booking is partial or unpaid
        // We'll return 'partial' if at least one is paid but others are not, or 'unpaid' if none are paid.
        $hasPaid = $statusSet->contains('paid') || $statusSet->contains('settled') || $statusSet->contains('succeeded');
        $hasOpen = $statusSet->contains('pending') || $statusSet->contains('partial') || $statusSet->contains('unpaid') || $statusSet->contains('pending_verification');

        if ($hasOpen) {
            return $hasPaid ? 'partial' : 'unpaid';
        }

        // Priority 3: Only if ALL are paid/settled
        if ($hasPaid) {
            return 'paid';
        }

        if ($statusSet->contains('refunded')) {
            return 'refunded';
        }

        return 'unpaid';
    }

    private function mapInvoiceStatusToBookingPaymentStatus(string $invoiceStatus): string
    {
        return match ($invoiceStatus) {
            'paid' => 'paid',
            'partial' => 'partial',
            'refunded' => 'refunded',
            default => 'unpaid',
        };
    }
}
