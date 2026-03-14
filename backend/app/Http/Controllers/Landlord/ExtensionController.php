<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\ExtensionRequest;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExtensionController extends Controller
{
    use ResolvesLandlordAccess;

    public function index(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $requests = ExtensionRequest::where('landlord_id', $context['landlord_id'])
            ->with(['tenant', 'booking.room.property'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($requests);
    }

    public function handle(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $ext = ExtensionRequest::where('landlord_id', $context['landlord_id'])->findOrFail($id);

        $validated = $request->validate([
            'action' => 'required|in:approve,reject,modify',
            'requested_end_date' => 'nullable|date|after:today',
            'proposed_amount' => 'nullable|numeric|min:0',
            'landlord_notes' => 'nullable|string|max:500'
        ]);

        if ($ext->status !== 'pending') {
            return response()->json(['message' => 'Request already handled'], 422);
        }

        return DB::transaction(function() use ($ext, $validated) {
            $action = $validated['action'];
            $ext->status = $action === 'modify' ? 'modified' : ($action === 'approve' ? 'approved' : 'rejected');
            $ext->landlord_notes = $validated['landlord_notes'] ?? null;
            $ext->handled_at = now();

            if ($action === 'approve' || $action === 'modify') {
                $finalDate = $action === 'modify' ? $validated['requested_end_date'] : $ext->requested_end_date;
                $finalAmount = $action === 'modify' ? $validated['proposed_amount'] : $ext->proposed_amount;

                // 1. Update Booking
                $booking = $ext->booking;
                $booking->end_date = $finalDate;
                $booking->save();

                // 2. Create Invoice for the extension
                $reference = 'INV-EXT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
                Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $ext->landlord_id,
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $ext->tenant_id,
                    'description' => "Stay Extension until {$finalDate} (" . ($ext->extension_type) . ")",
                    'amount_cents' => (int) round($finalAmount * 100),
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addDays(3),
                    'metadata' => [
                        'extension_request_id' => $ext->id,
                        'type' => $ext->extension_type,
                        'days' => \Carbon\Carbon::parse($ext->current_end_date)->diffInDays(\Carbon\Carbon::parse($finalDate))
                    ]
                ]);
            }

            $ext->save();
            return response()->json($ext->load('booking'));
        });
    }
}
