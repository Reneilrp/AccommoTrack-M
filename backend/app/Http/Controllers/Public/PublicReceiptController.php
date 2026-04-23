<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\ReceiptDispute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicReceiptController extends Controller
{
    /**
     * Publicly verify a receipt by its reference (Blade view - Legacy).
     */
    public function verify(Request $request, $reference)
    {
        $invoice = Invoice::with(['tenant', 'property', 'transactions'])
            ->where('receipt_reference', $reference)
            ->first();

        if (!$invoice) {
            return view('invoices.verify', [
                'success' => false,
                'message' => 'Invalid Receipt. This reference does not exist in our records.',
                'reference' => $reference
            ]);
        }

        // Check HMAC if signature is present (Optional enforcement for Blade, but recommended)
        $signature = $request->query('sig');
        $expectedSignature = hash_hmac('sha256', (string) $reference, config('app.key'));
        
        $isAuthentic = $signature && hash_equals($expectedSignature, strtolower($signature));

        // Mask tenant name for privacy (e.g., John Doe -> J*** D***)
        $firstName = $invoice->tenant->first_name ?? '';
        $lastName = $invoice->tenant->last_name ?? '';
        
        $maskedName = $this->maskName($firstName) . ' ' . $this->maskName($lastName);

        return view('invoices.verify', [
            'success' => true,
            'invoice' => $invoice,
            'maskedName' => trim($maskedName) ?: 'Verified Tenant',
            'reference' => $reference,
            'isAuthentic' => $isAuthentic
        ]);
    }

    /**
     * API: Verify receipt with HMAC signature for Frontend Assurance.
     */
    public function verifyApi(Request $request, $reference)
    {
        $signature = $request->query('sig');
        if (!$signature) {
            return response()->json(['success' => false, 'message' => 'Missing cryptographic signature.'], 403);
        }

        $expectedSignature = hash_hmac('sha256', (string) $reference, config('app.key'));
        if (!hash_equals($expectedSignature, strtolower($signature))) {
            return response()->json(['success' => false, 'message' => 'Forged or tampered document detected.'], 403);
        }

        $invoice = Invoice::with(['tenant', 'property'])
            ->where('receipt_reference', $reference)
            ->first();

        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Receipt reference not found.'], 404);
        }

        $firstName = $invoice->tenant->first_name ?? '';
        $lastName = $invoice->tenant->last_name ?? '';
        $maskedName = $this->maskName($firstName) . ' ' . $this->maskName($lastName);

        return response()->json([
            'success' => true,
            'data' => [
                'reference' => $invoice->receipt_reference,
                'invoice_ref' => $invoice->reference,
                'amount' => (float) (($invoice->total_cents ?? $invoice->amount_cents) / 100),
                'status' => $invoice->status,
                'paid_at' => $invoice->paid_at,
                'tenant_name' => trim($maskedName) ?: 'Verified Tenant',
                'property_title' => $invoice->property?->title ?? 'AccommoTrack Partner',
                'period_start' => $invoice->billing_period_start,
                'period_end' => $invoice->billing_period_end,
                'is_authentic' => true,
                'certified_at' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * Submit a dispute for a receipt.
     */
    public function report(Request $request)
    {
        $validated = $request->validate([
            'receipt_reference' => 'required|string',
            'reporter_name' => 'required|string|max:255',
            'reporter_email' => 'required|email|max:255',
            'message' => 'required|string|max:1000',
        ]);

        $invoice = Invoice::where('receipt_reference', $validated['receipt_reference'])->first();

        ReceiptDispute::create([
            'invoice_id' => $invoice?->id,
            'receipt_reference' => $validated['receipt_reference'],
            'reporter_name' => $validated['reporter_name'],
            'reporter_email' => $validated['reporter_email'],
            'message' => $validated['message'],
            'status' => 'pending',
        ]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Dispute reported successfully.']);
        }

        return back()->with('status', 'Dispute reported successfully. Our team will investigate this reference.');
    }

    /**
     * Helper to mask names
     */
    private function maskName($name)
    {
        if (empty($name)) return '';
        $name = trim($name);
        $len = strlen($name);
        if ($len <= 1) return $name;
        if ($len <= 3) return substr($name, 0, 1) . '*';
        return substr($name, 0, 1) . str_repeat('*', min(4, $len - 2)) . substr($name, -1, 1);
    }
}
