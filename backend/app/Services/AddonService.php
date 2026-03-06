<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Support\Facades\DB;

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

            return ['status' => $newStatus, 'message' => 'Addon request approved successfully'];
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
