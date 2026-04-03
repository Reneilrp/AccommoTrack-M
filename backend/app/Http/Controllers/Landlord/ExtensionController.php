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
            'landlord_notes' => 'nullable|string|max:500',
        ]);

        if ($ext->status !== 'pending') {
            return response()->json(['message' => 'Request already handled'], 422);
        }

        return DB::transaction(function () use ($ext, $validated) {
            $action = $validated['action'];

            if (($ext->booking->contract_mode ?? 'monthly') === 'monthly' && ! $ext->booking->end_date) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Open-ended monthly bookings do not require extension handling.',
                ], 422);
            }

            $ext->status = $action === 'modify' ? 'modified' : ($action === 'approve' ? 'approved' : 'rejected');
            $ext->landlord_notes = $validated['landlord_notes'] ?? null;
            $ext->handled_at = now();

            if ($action === 'approve' || $action === 'modify') {
                $finalDate = $action === 'modify' ? $validated['requested_end_date'] : $ext->requested_end_date;
                $finalAmount = $action === 'modify' ? $validated['proposed_amount'] : $ext->proposed_amount;

                // 1. Update/Create Booking
                $booking = $ext->booking;

                if ($booking->status === 'completed' || $booking->status === 'partial-completed') {
                    // Create a NEW booking as a renewal
                    $newBooking = $booking->replicate(['id', 'booking_reference', 'created_at', 'updated_at', 'status', 'payment_status', 'cancelled_at', 'cancellation_reason', 'refund_amount', 'refund_processed_at', 'confirmed_at']);

                    $newBooking->previous_booking_id = $booking->id;
                    $newBooking->booking_reference = 'BK-REN-'.strtoupper(Str::random(8));
                    $newBooking->start_date = $booking->end_date;
                    $newBooking->end_date = $finalDate;
                    $newBooking->total_amount = $finalAmount;
                    $newBooking->status = 'confirmed';
                    $newBooking->payment_status = 'unpaid';
                    $newBooking->confirmed_at = now();
                    $newBooking->notes = ($newBooking->notes ? $newBooking->notes."\n" : '').'Renewal of booking #'.$booking->booking_reference;
                    $newBooking->save();

                    // Re-assign tenant if needed (ensure active assignment exists)
                    if (! $newBooking->room->tenants()->where('tenant_id', $ext->tenant_id)->exists()) {
                        $newBooking->room->assignTenant($ext->tenant_id, $newBooking->start_date, $newBooking->bed_count);
                    }

                    $targetBooking = $newBooking;
                } else {
                    // Simply extend the existing one
                    $booking->end_date = $finalDate;
                    $booking->save();
                    $targetBooking = $booking;
                }

                // 2. Create Invoice for the extension/renewal
                $reference = 'INV-EXT-'.date('Ymd').'-'.strtoupper(Str::random(6));
                Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $ext->landlord_id,
                    'property_id' => $targetBooking->property_id,
                    'booking_id' => $targetBooking->id,
                    'tenant_id' => $ext->tenant_id,
                    'description' => "Stay Extension until {$finalDate} (".($ext->extension_type).')',
                    'amount_cents' => (int) round($finalAmount * 100),
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addDays(3),
                    'metadata' => [
                        'extension_request_id' => $ext->id,
                        'type' => $ext->extension_type,
                        'days' => $ext->current_end_date
                            ? \Carbon\Carbon::parse($ext->current_end_date)->diffInDays(\Carbon\Carbon::parse($finalDate))
                            : null,
                    ],
                ]);
            }

            $ext->save();

            return response()->json($ext->load('booking'));
        });
    }
}
