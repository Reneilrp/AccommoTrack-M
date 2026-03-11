<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\Property;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AddonService
{
    public function createAddon(int $propertyId, array $data): Addon
    {
        return Addon::create(array_merge($data, ['property_id' => $propertyId]));
    }

    public function updateAddon(Addon $addon, array $data): Addon
    {
        $addon->update($data);
        return $addon;
    }

    public function deleteAddon(Addon $addon): void
    {
        // Check if addon has active bookings
        $activeRequests = DB::table('booking_addons')
            ->where('addon_id', $addon->id)
            ->whereIn('status', ['pending', 'approved', 'active'])
            ->count();

        if ($activeRequests > 0) {
            throw new \Exception('Cannot delete addon with active requests. Deactivate it instead.');
        }

        $addon->delete();
    }

    public function handleRequest(Booking $booking, int $addonId, string $action, ?string $note, int $userId): array
    {
        $addonRequest = $booking->addons()
            ->where('addon_id', $addonId)
            ->wherePivot('status', 'pending')
            ->first();

        if (!$addonRequest) {
            throw new \Exception('No pending request found for this addon');
        }

        $addon = Addon::findOrFail($addonId);

        if ($action === 'approve') {
            if ($addon->addon_type === 'rental' && !$addon->hasStock()) {
                throw new \Exception('Cannot approve - addon is out of stock');
            }

            $newStatus = $addon->price_type === 'monthly' ? 'active' : 'approved';

            DB::beginTransaction();
            try {
                $booking->addons()->updateExistingPivot($addonId, [
                    'status' => $newStatus,
                    'response_note' => $note,
                    'approved_at' => now(),
                    'approved_by' => $userId,
                    'updated_at' => now()
                ]);

                if ($addon->addon_type === 'rental' && !is_null($addon->stock)) {
                    $addon->decrement('stock', $addonRequest->pivot->quantity ?? 1);
                }

                // New logic: Find the latest unpaid invoice and add the addon cost to it.
                $latestInvoice = $booking->invoices()
                    ->whereIn('status', ['pending', 'partially_paid'])
                    ->orderBy('due_date', 'desc')
                    ->first();

                $amountCents = (int) round(($addonRequest->pivot->price_at_booking ?? $addon->price) * ($addonRequest->pivot->quantity ?? 1) * 100);

                if ($latestInvoice) {
                    $latestInvoice->amount_cents += $amountCents;
                    
                    $new_metadata = $latestInvoice->metadata ?? [];
                    if (!isset($new_metadata['addons'])) {
                        $new_metadata['addons'] = [];
                    }
                    $new_metadata['addons'][] = [
                        'addon_id' => $addon->id,
                        'addon_name' => $addon->name,
                        'quantity' => $addonRequest->pivot->quantity ?? 1,
                        'price' => $amountCents,
                        'price_type' => $addon->price_type,
                    ];
                    
                    $latestInvoice->metadata = $new_metadata;
                    
                    // Append to description if it's not already about addons
                    if (!str_contains($latestInvoice->description, 'Add-on:')) {
                         $latestInvoice->description .= "\n+ Includes Add-ons";
                    }

                    $latestInvoice->save();
                    
                    $booking->addons()->updateExistingPivot($addonId, [
                        'invoice_id' => $latestInvoice->id,
                        'invoiced_at' => now(),
                    ]);
                } else {
                    // Fallback or a more robust solution for future invoice generation would be needed here.
                    // For now, this addresses the primary case of updating an existing pending invoice.
                }

                /*
                // OLD LOGIC: Create automatic invoice for the addon
                $reference = 'INV-ADD-' . date('Ymd') . '-' . strtoupper(Str::random(6));
                $amountCents = (int) round(($addonRequest->pivot->price_at_booking ?? $addon->price) * ($addonRequest->pivot->quantity ?? 1) * 100);

                $invoice = Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $booking->landlord_id,
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'description' => "Add-on: {$addon->name} (" . ($addon->price_type === 'monthly' ? 'Monthly recurring' : 'One-time fee') . ")",
                    'amount_cents' => $amountCents,
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addDays(3),
                    'metadata' => [
                        'addon_id' => $addon->id,
                        'addon_name' => $addon->name,
                        'quantity' => $addonRequest->pivot->quantity ?? 1,
                        'price_type' => $addon->price_type,
                    ]
                ]);

                // Link invoice back to the addon request
                $booking->addons()->updateExistingPivot($addonId, [
                    'invoice_id' => $invoice->id,
                    'invoiced_at' => now(),
                ]);
                */

                DB::commit();
                return ['status' => $newStatus, 'message' => 'Addon request approved and invoice updated successfully'];
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } else {
            $booking->addons()->updateExistingPivot($addonId, [
                'status' => 'rejected',
                'response_note' => $note,
                'updated_at' => now()
            ]);

            return ['status' => 'rejected', 'message' => 'Addon request rejected'];
        }
    }
}
