<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Booking;
use App\Models\Property;
use App\Models\Room;
use App\Models\RoomImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class RoomService
{
    /**
     * Create a new room.
     */
    public function createRoom(array $validatedData, Property $property): Room
    {
        return DB::transaction(function () use ($validatedData, $property) {
            $this->validateRoomTypeForProperty($property, $validatedData['room_type'] ?? null);

            if ($this->isRoomNumberDuplicate($validatedData['room_number'], $property->id)) {
                throw ValidationException::withMessages(['room_number' => 'Room number already exists for this property.']);
            }

            $capacity = $validatedData['capacity'] ?? 1;
            $pricingModel = $validatedData['pricing_model'] ?? (($validatedData['room_type'] === 'bedSpacer') ? 'per_bed' : 'full_room');

            $propertyGender = strtolower($property->gender_restriction ?? 'mixed');
            $defaultGender = in_array($propertyGender, ['male', 'female', 'boys', 'girls']) 
                ? (in_array($propertyGender, ['male', 'boys']) ? 'male' : 'female') 
                : 'mixed';

            $room = Room::create([
                'property_id' => $property->id,
                'room_number' => $validatedData['room_number'],
                'room_type' => $validatedData['room_type'],
                'gender_restriction' => $validatedData['gender_restriction'] ?? $defaultGender,
                'floor' => $validatedData['floor'],
                'monthly_rate' => $validatedData['monthly_rate'] ?? null,
                'daily_rate' => $validatedData['daily_rate'] ?? null,
                'billing_policy' => $validatedData['billing_policy'] ?? 'monthly',
                'min_stay_days' => $validatedData['min_stay_days'] ?? 1,
                'capacity' => $capacity,
                'pricing_model' => $pricingModel,
                'status' => $validatedData['status'] ?? 'available',
                'description' => $validatedData['description'] ?? null,
                'rules' => $validatedData['rules'] ?? [],
            ]);

            $this->syncAmenities($room, $validatedData['amenities'] ?? []);
            $this->handleImageUploads(app('request'), $room);

            $property->updateTotalRooms();
            $property->updateAvailableRooms();

            return $room;
        });
    }

    /**
     * Update an existing room.
     */
    public function updateRoom(Room $room, array $validatedData): Room
    {
        return DB::transaction(function () use ($room, $validatedData) {
            if (isset($validatedData['room_type'])) {
                $this->validateRoomTypeForProperty($room->property, $validatedData['room_type']);
            }

            if (isset($validatedData['room_number']) && $validatedData['room_number'] !== $room->room_number) {
                if ($this->isRoomNumberDuplicate($validatedData['room_number'], $room->property_id, $room->id)) {
                    throw ValidationException::withMessages(['room_number' => 'Room number already exists for this property.']);
                }
            }

            $oldStatus = $room->status;
            $room->update($validatedData);

            if (array_key_exists('rules', $validatedData)) {
                $room->update(['rules' => $validatedData['rules']]);
            }

            if (array_key_exists('amenities', $validatedData)) {
                $this->syncAmenities($room, $validatedData['amenities']);
            }

            if (isset($validatedData['images'])) {
                $this->syncImagesFromUrls($room, $validatedData['images']);
            }

            if (isset($validatedData['status']) && $validatedData['status'] !== $oldStatus) {
                $room->property->updateAvailableRooms();
            }

            return $room;
        });
    }

    /**
     * Delete a room.
     */
    public function deleteRoom(Room $room): void
    {
        if (Booking::where('room_id', $room->id)->exists()) {
            throw new \Exception('Cannot delete room with existing bookings. Please cancel or complete all bookings first.');
        }

        if ($room->occupied > 0) {
            throw new \Exception('Cannot delete room with active tenants. Please remove all tenants first.');
        }

        DB::transaction(function () use ($room) {
            $property = $room->property;

            $room->amenities()->detach();
            foreach ($room->images as $image) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $image->image_url));
                $image->delete();
            }
            DB::table('room_tenant_assignments')->where('room_id', $room->id)->delete();

            $room->delete();

            $property->updateTotalRooms();
            $property->updateAvailableRooms();
        });
    }

    /**
     * Update a room's status.
     */
    public function updateStatus(Room $room, string $status): Room
    {
        if ($status === 'available') {
            $room->removeTenant(); // This also updates status internally
        } else {
            $room->update(['status' => $status]);
        }

        $room->property->updateAvailableRooms();

        return $room->load('tenants');
    }

    /**
     * Assign a tenant to a room.
     */
    public function assignTenant(Room $room, int $tenantId, ?string $startDate = null, $bedCount = 1): Room
    {
        return DB::transaction(function () use ($room, $tenantId, $startDate, $bedCount) {
            $room->assignTenant($tenantId, $startDate, $bedCount);

            return $room->load('tenants');
        });
    }

    /**
     * Remove a tenant from a room.
     */
    public function removeTenant(Room $room, ?int $tenantId = null): Room
    {
        return DB::transaction(function () use ($room, $tenantId) {
            $room->removeTenant($tenantId);

            return $room->load('tenants');
        });
    }

    /**
     * Extend a tenant's stay manually.
     */
    public function extendStay(Room $room, int $tenantId, string $type, int $value): array
    {
        return DB::transaction(function () use ($room, $tenantId, $type, $value) {
            // 1. Find active booking
            $booking = Booking::where('room_id', $room->id)
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['confirmed', 'active'])
                ->orderBy('end_date', 'desc')
                ->first();

            if (! $booking) {
                throw new \Exception('No active booking found for this tenant in this room.');
            }

            $currentEnd = \Carbon\Carbon::parse($booking->end_date);
            $newEnd = $currentEnd->copy();

            if ($type === 'monthly') {
                $newEnd->addMonths($value);
                $priceResult = $room->calculatePriceForPeriod($currentEnd, $newEnd);
            } else {
                $newEnd->addDays($value);
                $priceResult = $room->calculatePriceForDays($value);
            }

            $extensionAmount = $priceResult['total'] * ($booking->bed_count ?? 1);

            // 2. Update Booking
            $booking->end_date = $newEnd->format('Y-m-d');
            if ($type === 'monthly') {
                $booking->total_months += $value;
            }
            $booking->total_amount += $extensionAmount;
            $booking->save();

            // 3. Create Invoice for the extension
            $reference = 'INV-EXT-MAN-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
            $invoice = \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $room->property->landlord_id,
                'property_id' => $room->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $tenantId,
                'description' => "Stay Extension (+{$value} ".($type === 'monthly' ? 'month' : 'day')."(s)) for Room {$room->room_number}",
                'amount_cents' => (int) round($extensionAmount * 100),
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => now()->addDays(3),
                'metadata' => [
                    'extension_type' => $type,
                    'extension_value' => $value,
                    'previous_end_date' => $currentEnd->format('Y-m-d'),
                    'new_end_date' => $newEnd->format('Y-m-d'),
                ],
            ]);

            return [
                'booking' => $booking,
                'invoice' => $invoice,
                'new_end_date' => $booking->end_date,
                'extension_amount' => $extensionAmount,
            ];
        });
    }

    // --- Private Helper Methods ---

    private function validateRoomTypeForProperty(Property $property, ?string $roomType): void
    {
        if ($roomType === 'bedSpacer' && str_contains(strtolower($property->property_type ?? ''), 'apartment')) {
            throw ValidationException::withMessages(['room_type' => 'Apartment properties cannot have Bed Spacer room type.']);
        }
    }

    private function isRoomNumberDuplicate(string $roomNumber, int $propertyId, ?int $excludeRoomId = null): bool
    {
        $query = Room::where('property_id', $propertyId)->where('room_number', $roomNumber);
        if ($excludeRoomId) {
            $query->where('id', '!=', $excludeRoomId);
        }

        return $query->exists();
    }

    private function syncAmenities(Room $room, array $amenityNames): void
    {
        $amenityIds = [];
        foreach ($amenityNames as $amenityName) {
            $amenity = Amenity::firstOrCreate(['name' => trim($amenityName)]);
            $amenityIds[] = $amenity->id;
        }
        $room->amenities()->sync($amenityIds);
    }

    private function handleImageUploads(Request $request, Room $room): void
    {
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('room_images', 'public');
                RoomImage::create([
                    'room_id' => $room->id,
                    'image_url' => Storage::url($path),
                ]);
            }
        }
    }

    private function syncImagesFromUrls(Room $room, array $imageUrls): void
    {
        $room->images()->delete();
        foreach ($imageUrls as $imageUrl) {
            RoomImage::create([
                'room_id' => $room->id,
                'image_url' => $imageUrl,
            ]);
        }
    }
}
