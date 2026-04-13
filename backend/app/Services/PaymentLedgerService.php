<?php

namespace App\Services;

use App\Models\Invoice;
use App\Services\Subscription\SubscriptionCheckoutService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PaymentLedgerService
{
    public function __construct(private readonly SubscriptionCheckoutService $subscriptionCheckoutService)
    {
    }

    public function recomputeInvoiceAndBookingStatus(Invoice $invoice, ?int $actorUserId = null): Invoice
    {
        $netPaidCents = $this->calculateInvoiceNetPaidCents($invoice);
        $resolvedStatus = $this->resolveInvoiceStatus($invoice, $netPaidCents);

        $invoice->status = $resolvedStatus;
        if ($resolvedStatus === 'paid') {
            $invoice->paid_at = $invoice->paid_at ?? now();
        } else {
            $invoice->paid_at = null;
        }
        $invoice->save();

        $booking = $invoice->booking ?: ($invoice->booking_id ? $invoice->booking()->first() : null);
        if ($booking) {
            $booking->payment_status = $this->mapInvoiceStatusToBookingPaymentStatus($resolvedStatus);
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
        }

        return $invoice;
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
