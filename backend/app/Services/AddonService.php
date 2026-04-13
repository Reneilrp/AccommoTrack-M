<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AddonService
{
    private function extractSuggestedPriceFromNote(?string $note): ?float
    {
        if (! is_string($note) || trim($note) === '') {
            return null;
        }

        if (! preg_match('/suggested\s*price\s*:\s*₱?\s*([\d,]+(?:\.\d+)?)/i', $note, $matches)) {
            return null;
        }

        $rawValue = str_replace(',', '', $matches[1] ?? '');
        if ($rawValue === '' || ! is_numeric($rawValue)) {
            return null;
        }

        $price = (float) $rawValue;

        return $price > 0 ? $price : null;
    }

    private function resolveApprovedPrice($addonRequest, Addon $addon, ?float $approvedPrice = null): float
    {
        if (is_numeric($approvedPrice) && (float) $approvedPrice > 0) {
            return (float) $approvedPrice;
        }

        $pivotPrice = (float) ($addonRequest->pivot->price_at_booking ?? 0);
        if ($pivotPrice > 0) {
            return $pivotPrice;
        }

        $addonPrice = (float) ($addon->price ?? 0);
        if ($addonPrice > 0) {
            return $addonPrice;
        }

        $suggestedPrice = $this->extractSuggestedPriceFromNote($addonRequest->pivot->request_note ?? null);
        if (! is_null($suggestedPrice) && $suggestedPrice > 0) {
            return $suggestedPrice;
        }

        return 0.0;
    }

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

    public function handleRequest(Booking $booking, int $addonId, string $action, ?string $note, int $userId, ?float $approvedPrice = null): array
    {
        $addonRequest = $booking->addons()
            ->where('addon_id', $addonId)
            ->wherePivot('status', 'pending')
            ->first();

        if (! $addonRequest) {
            throw new \Exception('No pending request found for this addon');
        }

        $addon = Addon::findOrFail($addonId);

        if ($action === 'approve') {
            if ($addon->addon_type === 'rental' && ! $addon->hasStock()) {
                throw new \Exception('Cannot approve - addon is out of stock');
            }

            $newStatus = $addon->price_type === 'monthly' ? 'active' : 'approved';

            DB::beginTransaction();
            try {
                $resolvedPrice = $this->resolveApprovedPrice($addonRequest, $addon, $approvedPrice);
                if ($resolvedPrice <= 0) {
                    throw ValidationException::withMessages([
                        'approved_price' => ['Cannot approve add-on without a valid price. Set an approved price before approving.'],
                    ]);
                }

                $updateData = [
                    'status' => $newStatus,
                    'response_note' => $note,
                    'approved_at' => now(),
                    'approved_by' => $userId,
                    'price_at_booking' => $resolvedPrice,
                    'updated_at' => now(),
                ];

                $booking->addons()->updateExistingPivot($addonId, $updateData);

                if ($addon->addon_type === 'rental' && ! is_null($addon->stock)) {
                    $addon->decrement('stock', $addonRequest->pivot->quantity ?? 1);
                }

                $amountCents = (int) round($resolvedPrice * ($addonRequest->pivot->quantity ?? 1) * 100);

                // Check for existing unpaid rent-like invoice for this booking
                $latestInvoice = $booking->invoices()
                    ->whereIn('status', ['pending', 'partial', 'overdue', 'unpaid'])
                    ->where(function ($query) {
                        $query->whereNull('invoice_type')
                            ->orWhere('invoice_type', 'rent');
                    })
                    ->where(function ($query) {
                        $query->whereNull('reference')
                            ->orWhere('reference', 'not like', 'INV-ADD-%');
                    })
                    ->where(function ($query) {
                        $query->whereNull('description')
                            ->orWhere('description', 'not like', 'Add-on:%');
                    })
                    ->orderBy('due_date', 'desc')
                    ->first();

                if ($latestInvoice) {
                    // Append to existing pending invoice
                    $latestInvoice->amount_cents += $amountCents;

                    $new_metadata = $latestInvoice->metadata ?? [];
                    if (! isset($new_metadata['addons'])) {
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

                    if (! str_contains($latestInvoice->description, 'Includes Add-ons')) {
                        $latestInvoice->description .= "\n+ Includes Add-ons";
                    }

                    $latestInvoice->save();

                    $booking->addons()->updateExistingPivot($addonId, [
                        'invoice_id' => $latestInvoice->id,
                        'invoiced_at' => now(),
                    ]);
                } else {
                    // Create a separate invoice for this immediate addon request
                    $reference = 'INV-ADD-'.date('Ymd').'-'.strtoupper(Str::random(6));

                    $invoice = Invoice::create([
                        'reference' => $reference,
                        'landlord_id' => $booking->landlord_id,
                        'property_id' => $booking->property_id,
                        'booking_id' => $booking->id,
                        'tenant_id' => $booking->tenant_id,
                        'description' => "Add-on: {$addon->name} (".($addon->price_type === 'monthly' ? 'Monthly recurring' : 'One-time fee').')',
                        'invoice_type' => 'addon',
                        'amount_cents' => $amountCents,
                        'currency' => 'PHP',
                        'status' => 'pending',
                        'issued_at' => now(),
                        'due_date' => now()->addDays(3),
                        'metadata' => [
                            'addons' => [
                                [
                                    'addon_id' => $addon->id,
                                    'addon_name' => $addon->name,
                                    'quantity' => $addonRequest->pivot->quantity ?? 1,
                                    'price' => $amountCents,
                                    'price_type' => $addon->price_type,
                                ],
                            ],
                        ],
                    ]);

                    // Link invoice back to the addon request
                    $booking->addons()->updateExistingPivot($addonId, [
                        'invoice_id' => $invoice->id,
                        'invoiced_at' => now(),
                    ]);
                }

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
                'updated_at' => now(),
            ]);

            return ['status' => 'rejected', 'message' => 'Addon request rejected'];
        }
    }
}
