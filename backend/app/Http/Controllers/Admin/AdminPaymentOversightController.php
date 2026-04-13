<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Services\AuditLogService;
use App\Services\PaymentLedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPaymentOversightController extends Controller
{
    private const OVERSIGHT_MANUAL_METHODS = [
        'cash',
        'gcash',
        'bank_transfer',
        'paymaya',
        'maya',
    ];

    public function __construct(
        protected AuditLogService $auditLogService,
        private readonly PaymentLedgerService $paymentLedgerService,
    )
    {
    }

    public function queue(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:all,pending,denied,approved',
            'property_id' => 'nullable|integer',
            'landlord_id' => 'nullable|integer',
            'tenant_id' => 'nullable|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'risk_flag' => 'nullable|in:all,high_denial_rate,multiple_denials',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $statusMap = [
            'pending' => 'pending_offline',
            'denied' => 'voided',
            'approved' => 'succeeded',
        ];

        $perPage = (int) ($validated['per_page'] ?? 50);
        $riskFlag = $validated['risk_flag'] ?? 'all';

        $highRiskLandlordIds = AuditLog::query()
            ->where('event', 'payment.denied')
            ->where('created_at', '>=', now()->subDays(7))
            ->whereNotNull('landlord_id')
            ->selectRaw('landlord_id, COUNT(*) as denial_count')
            ->groupBy('landlord_id')
            ->having('denial_count', '>=', 5)
            ->pluck('landlord_id')
            ->filter()
            ->values()
            ->all();

        $highRiskTenantIds = AuditLog::query()
            ->where('event', 'payment.denied')
            ->where('created_at', '>=', now()->subDays(30))
            ->whereNotNull('tenant_id')
            ->selectRaw('tenant_id, COUNT(*) as denial_count')
            ->groupBy('tenant_id')
            ->having('denial_count', '>=', 3)
            ->pluck('tenant_id')
            ->filter()
            ->values()
            ->all();

        $query = PaymentTransaction::query()
            ->with([
                'tenant:id,first_name,last_name,email',
                'invoice:id,reference,landlord_id,property_id,booking_id,tenant_id,status,amount_cents,total_cents,created_at,updated_at',
                'invoice.property:id,title',
                'invoice.booking:id,booking_reference,room_id',
                'invoice.booking.room:id,room_number',
            ])
            ->whereIn(DB::raw($this->normalizedMethodSqlExpression()), self::OVERSIGHT_MANUAL_METHODS)
            ->whereIn('status', ['pending_offline', 'voided', 'succeeded'])
            ->when(
                isset($validated['status']) && $validated['status'] !== 'all',
                fn ($q) => $q->where('status', $statusMap[$validated['status']])
            )
            ->when(isset($validated['tenant_id']), fn ($q) => $q->where('tenant_id', $validated['tenant_id']))
            ->when(isset($validated['date_from']), fn ($q) => $q->whereDate('created_at', '>=', $validated['date_from']))
            ->when(isset($validated['date_to']), fn ($q) => $q->whereDate('created_at', '<=', $validated['date_to']))
            ->when(isset($validated['property_id']), function ($q) use ($validated) {
                $q->whereHas('invoice', fn ($invoiceQuery) => $invoiceQuery->where('property_id', $validated['property_id']));
            })
            ->when(isset($validated['landlord_id']), function ($q) use ($validated) {
                $q->whereHas('invoice', fn ($invoiceQuery) => $invoiceQuery->where('landlord_id', $validated['landlord_id']));
            })
            ->when($riskFlag === 'high_denial_rate', function ($q) use ($highRiskLandlordIds) {
                $q->whereHas('invoice', fn ($invoiceQuery) => $invoiceQuery->whereIn('landlord_id', $highRiskLandlordIds));
            })
            ->when($riskFlag === 'multiple_denials', fn ($q) => $q->whereIn('tenant_id', $highRiskTenantIds))
            ->orderByDesc('created_at');

        $records = $query->paginate($perPage);

        $records->getCollection()->transform(function (PaymentTransaction $transaction) use ($highRiskLandlordIds, $highRiskTenantIds) {
            $invoice = $transaction->invoice;

            $derivedStatus = match ($transaction->status) {
                'pending_offline' => 'pending',
                'voided' => 'denied',
                'succeeded' => 'approved',
                default => $transaction->status,
            };

            $gatewayResponse = is_array($transaction->gateway_response) ? $transaction->gateway_response : [];

            $riskFlags = [];
            if ($invoice && in_array($invoice->landlord_id, $highRiskLandlordIds, true)) {
                $riskFlags[] = 'high_denial_rate_landlord';
            }
            if (in_array($transaction->tenant_id, $highRiskTenantIds, true)) {
                $riskFlags[] = 'multiple_denials_tenant';
            }

            return [
                'id' => $transaction->id,
                'invoice_id' => $invoice?->id,
                'invoice_reference' => $invoice?->reference,
                'booking_id' => $invoice?->booking_id,
                'booking_reference' => $invoice?->booking?->booking_reference,
                'room_number' => $invoice?->booking?->room?->room_number,
                'property_id' => $invoice?->property_id,
                'property_title' => $invoice?->property?->title,
                'landlord_id' => $invoice?->landlord_id,
                'tenant_id' => $transaction->tenant_id,
                'tenant_name' => $transaction->tenant
                    ? trim(($transaction->tenant->first_name ?? '').' '.($transaction->tenant->last_name ?? ''))
                    : null,
                'amount_cents' => $transaction->amount_cents,
                'method' => $this->normalizeManualPaymentMethod($transaction->method) ?? $transaction->method,
                'reference' => $transaction->gateway_reference,
                'proof_image_url' => $gatewayResponse['proof_image_url'] ?? null,
                'proof_image_path' => $gatewayResponse['proof_image_path'] ?? null,
                'status' => $derivedStatus,
                'transaction_status' => $transaction->status,
                'denial_reason_code' => $gatewayResponse['denial_reason_code'] ?? null,
                'denial_reason' => $gatewayResponse['denial_reason'] ?? null,
                'risk_flags' => $riskFlags,
                'submitted_at' => optional($transaction->created_at)->toISOString(),
                'updated_at' => optional($transaction->updated_at)->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $records,
            'message' => '',
        ]);
    }

    public function overrideApprove(Request $request, int $invoiceId)
    {
        $validated = $request->validate([
            'note' => 'required|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            $invoice = Invoice::with(['booking'])
                ->whereKey($invoiceId)
                ->lockForUpdate()
                ->firstOrFail();

            $voidedTx = $invoice->transactions()
                ->whereIn(DB::raw($this->normalizedMethodSqlExpression()), self::OVERSIGHT_MANUAL_METHODS)
                ->where('status', 'voided')
                ->lockForUpdate()
                ->latest('updated_at')
                ->first();

            if (! $voidedTx) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'No denied manual payment found for this invoice.',
                ], 422);
            }

            $previousInvoiceStatus = $invoice->status;
            $previousTxStatus = $voidedTx->status;

            $gatewayResponse = is_array($voidedTx->gateway_response) ? $voidedTx->gateway_response : [];
            $gatewayResponse['admin_override_note'] = $validated['note'];
            $gatewayResponse['admin_override_at'] = now()->toISOString();
            $gatewayResponse['admin_override_by'] = auth()->id();

            $voidedTx->status = 'succeeded';
            $voidedTx->gateway_response = $gatewayResponse;
            $voidedTx->save();

            $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, auth()->id());

            $this->auditLogService->paymentEvent('payment.admin_overridden', [
                'severity' => 'info',
                'subject_type' => 'invoice',
                'subject_id' => $invoice->id,
                'booking_id' => $invoice->booking_id,
                'invoice_id' => $invoice->id,
                'payment_transaction_id' => $voidedTx->id,
                'property_id' => $invoice->property_id,
                'tenant_id' => $invoice->tenant_id,
                'landlord_id' => $invoice->landlord_id,
                'status_before' => $previousTxStatus,
                'status_after' => $voidedTx->status,
                'summary' => 'Admin overrode denied manual payment to approved.',
                'metadata' => [
                    'note' => $validated['note'],
                    'invoice_status_before' => $previousInvoiceStatus,
                    'invoice_status_after' => $invoice->status,
                ],
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $invoice->fresh(['transactions']),
                ],
                'message' => 'Payment override applied successfully.',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to override payment: '.$e->getMessage(),
            ], 500);
        }
    }

    private function normalizedMethodSqlExpression(): string
    {
        return "LOWER(REPLACE(REPLACE(method, '-', '_'), ' ', '_'))";
    }

    private function normalizeManualPaymentMethod(?string $method): ?string
    {
        if ($method === null) {
            return null;
        }

        $normalized = strtolower(trim($method));
        $normalized = str_replace(['-', ' '], '_', $normalized);

        return match ($normalized) {
            'maya' => 'paymaya',
            default => $normalized,
        };
    }
}
