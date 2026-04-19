<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\ReceiptDispute;
use Illuminate\Http\Request;

class PublicReceiptController extends Controller
{
    /**
     * Publicly verify a receipt by its reference.
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

        // Mask tenant name for privacy (e.g., John Doe -> J*** D***)
        $firstName = $invoice->tenant->first_name ?? '';
        $lastName = $invoice->tenant->last_name ?? '';
        
        $maskedName = $this->maskName($firstName) . ' ' . $this->maskName($lastName);

        return view('invoices.verify', [
            'success' => true,
            'invoice' => $invoice,
            'maskedName' => trim($maskedName) ?: 'Verified Tenant',
            'reference' => $reference
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

        return back()->with('status', 'Dispute reported successfully. Our team will investigate this reference.');
    }

    /**
     * Helper to mask names
     */
    private function maskName($name)
    {
        if (empty($name)) return '';
        $len = strlen($name);
        if ($len <= 1) return $name;
        return substr($name, 0, 1) . str_repeat('*', min(3, $len - 1)) . substr($name, -1, 1);
    }
}
