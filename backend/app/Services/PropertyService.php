<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;

class PropertyService
{
    public function createProperty(array $validated, User $user): Property
    {
        return DB::transaction(function () use ($validated, $user) {
            $isVerified = $user->is_verified ?? false;

            $currentStatus = Property::STATUS_DRAFT;
            $isPublished = false;

            if ($isVerified) {
                $currentStatus = ($validated['is_draft'] ?? false) ? Property::STATUS_DRAFT : ($validated['current_status'] ?? Property::STATUS_PENDING);
                $isPublished = $validated['is_published'] ?? false;
            }

            $property = Property::create([
                'landlord_id' => $user->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'property_type' => $validated['property_type'],
                'current_status' => $currentStatus,
                'street_address' => $validated['street_address'],
                'city' => $validated['city'],
                'province' => $validated['province'],
                'barangay' => $validated['barangay'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'nearby_landmarks' => $validated['nearby_landmarks'] ?? null,
                'property_rules' => $validated['property_rules'] ?? null,
                'total_rooms' => 0,
                'available_rooms' => 0,
                'is_published' => $isPublished,
                'is_available' => $validated['is_available'] ?? false,
                'is_eligible' => $validated['is_eligible'] ?? false,
                'accepted_payments' => $validated['accepted_payments'] ?? null,
            ]);

            $this->handleFileUploads($property, app('request'));

            if (isset($validated['amenities']) && is_array($validated['amenities'])) {
                $this->syncAmenities($property, $validated['amenities']);
            }

            return $property;
        });
    }

    public function updateProperty(Property $property, array $validated, Request $request): Property
    {
        return DB::transaction(function () use ($property, $validated, $request) {
            $user = Auth::user();
            $isVerified = $user->is_verified ?? false;

            if (isset($validated['is_draft']) && $validated['is_draft']) {
                $validated['current_status'] = Property::STATUS_DRAFT;
            }

            if (!$isVerified) {
                $validated['current_status'] = Property::STATUS_DRAFT;
                $validated['is_published'] = false;
            }
            
            // Prevent changing status from pending to active/inactive by landlord
            if ($property->current_status === Property::STATUS_PENDING && isset($validated['current_status'])) {
                if (in_array($validated['current_status'], [Property::STATUS_ACTIVE, Property::STATUS_INACTIVE])) {
                    unset($validated['current_status']);
                }
            }

            $property->update($validated);

            if ($request->has('is_eligible')) {
                $property->is_eligible = (bool)$request->input('is_eligible');
                $property->save();
            }

            if (isset($validated['amenities'])) {
                $this->syncAmenities($property, $validated['amenities']);
            }

            $this->handleFileUploads($property, $request, true);

            return $property;
        });
    }
    
    public function getPublicProperties(Request $request)
    {
        $query = Property::where('is_published', true)->where('is_available', true);

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('street_address', 'like', "%{$search}%")
                  ->orWhere('barangay', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('province', 'like', "%{$search}%");
            });
        }

        if ($request->has('type') && !empty($request->type) && $request->type !== 'All') {
            $type = $request->type;
            $allowed = ['dormitory', 'apartment', 'boardingHouse', 'bedSpacer', 'others'];
            if (!in_array($type, $allowed)) {
                 $normalized = strtolower(str_replace([' ', '_'], '', $type));
                 foreach($allowed as $a) {
                     if (strtolower($a) === $normalized) {
                         $type = $a;
                         break;
                     }
                 }
            }
            $query->where('property_type', $type);
        }

        if ($request->has('min_price') || $request->has('max_price')) {
            $query->whereHas('rooms', function($q) use ($request) {
                $q->where('status', 'available');
                if ($request->has('min_price') && !empty($request->min_price)) {
                    $q->where('monthly_rate', '>=', $request->min_price);
                }
                if ($request->has('max_price') && !empty($request->max_price)) {
                    $q->where('monthly_rate', '<=', $request->max_price);
                }
            });
        }

        return $query->with([
                'rooms.images', 'rooms.amenities', 'images', 'landlord:id,first_name,last_name',
                'reviews' => function($q) { $q->where('is_published', true); }
            ])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function deleteProperty(Property $property): void
    {
        DB::transaction(function () use ($property) {
            $activeBookings = $property->bookings()->whereIn('status', ['pending', 'confirmed'])->count();
            if ($activeBookings > 0) {
                throw new \Exception('Cannot delete property with active bookings. Please cancel or complete all bookings first.');
            }

            foreach ($property->images as $image) {
                Storage::disk('public')->delete($image->image_url);
            }

            foreach ($property->rooms as $room) {
                foreach($room->images as $roomImage) {
                    Storage::disk('public')->delete($roomImage->image_url);
                }
            }

            $property->delete();
        });
    }

    private function syncAmenities(Property $property, array $amenityNames): void
    {
        $amenityIds = [];
        foreach ($amenityNames as $amenityName) {
            if (!empty($amenityName)) {
                $amenity = \App\Models\Amenity::firstOrCreate(['name' => $amenityName]);
                $amenityIds[] = $amenity->id;
            }
        }
        $property->amenities()->sync($amenityIds);
    }

    private function handleFileUploads(Property $property, Request $request, bool $isUpdate = false): void
    {
        if ($request->hasFile('images')) {
            $manager = new ImageManager(new Driver());
            foreach ($request->file('images') as $index => $file) {
                $image = $manager->read($file->getRealPath());
                $image->scaleDown(width: 1920);
                $encoded = $image->toWebp(80);
                $filename = 'property_' . time() . '_' . uniqid() . '.webp';
                $path = 'property_images/' . $filename;
                Storage::disk('public')->put($path, (string) $encoded);
                PropertyImage::create([
                    'property_id' => $property->id,
                    'image_url' => $path,
                    'is_primary' => $isUpdate ? ($index === 0 && $property->images()->where('is_primary', true)->doesntExist()) : ($index === 0),
                    'display_order' => $property->images()->count() + $index,
                    'media_type' => 'image',
                ]);
            }
        }

        if ($request->hasFile('video')) {
            $this->deleteExistingVideos($property);
            $this->uploadVideo($property, $request->file('video'));
        }

        if ($isUpdate && !$request->hasFile('video') && $request->boolean('delete_video')) {
            $this->deleteExistingVideos($property);
        }

        if ($request->hasFile('credentials')) {
            foreach ($request->file('credentials') as $file) {
                $path = $file->store('property_credentials', 'public');
                \App\Models\PropertyCredential::create([
                    'property_id' => $property->id,
                    'file_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                ]);
            }
        }
        
        if ($isUpdate) {
            $this->handleDeletions($property, $request);
            $this->handlePrimaryImageUpdate($property, $request);
            $this->handleImageReordering($property, $request);
        }
    }

    private function deleteExistingVideos(Property $property): void
    {
        $existingVideos = $property->images()->where('media_type', 'video')->get();
        foreach ($existingVideos as $ev) {
            Storage::disk('public')->delete($ev->image_url);
            $ev->delete();
        }
    }

    private function uploadVideo(Property $property, $videoFile): void
    {
        $path = $videoFile->store('property_videos', 'public');
        try {
            $duration = FFMpeg::fromDisk('public')->open($path)->getDurationInSeconds();
            if ($duration > 45) {
                Storage::disk('public')->delete($path);
                throw new \Exception('Video duration must not exceed 45 seconds.');
            }
            PropertyImage::create([
                'property_id' => $property->id, 'image_url' => $path, 'is_primary' => false, 
                'display_order' => 99, 'media_type' => 'video',
            ]);
        } catch (\Exception $e) {
            Storage::disk('public')->delete($path);
            throw new \Exception('Could not process video file: ' . $e->getMessage());
        }
    }
    
    private function handleDeletions(Property $property, Request $request): void
    {
        if ($request->has('deleted_credentials')) {
            $deletedIds = is_array($request->input('deleted_credentials')) ? $request->input('deleted_credentials') : [$request->input('deleted_credentials')];
            $credentials = \App\Models\PropertyCredential::where('property_id', $property->id)->whereIn('id', $deletedIds)->get();
            foreach ($credentials as $cred) {
                Storage::disk('public')->delete($cred->file_path);
                $cred->delete();
            }
        }

        if ($request->has('deleted_images')) {
            $deletedImageIds = is_array($request->input('deleted_images')) ? $request->input('deleted_images') : [$request->input('deleted_images')];
            if ($property->images()->count() - count($deletedImageIds) >= 1) {
                $images = PropertyImage::where('property_id', $property->id)->whereIn('id', $deletedImageIds)->get();
                foreach ($images as $image) {
                    Storage::disk('public')->delete($image->image_url);
                    $image->delete();
                }
            }
        }
    }
    
    private function handlePrimaryImageUpdate(Property $property, Request $request): void
    {
        if ($request->has('primary_image_id')) {
            $property->images()->update(['is_primary' => false]);
            PropertyImage::where('id', $request->input('primary_image_id'))
                ->where('property_id', $property->id)
                ->update(['is_primary' => true]);
        }
    }

    private function handleImageReordering(Property $property, Request $request): void
    {
        if ($request->has('image_order')) {
            $imageOrder = is_string($request->input('image_order')) ? json_decode($request->input('image_order'), true) : $request->input('image_order');
            if (is_array($imageOrder)) {
                foreach ($imageOrder as $orderItem) {
                    if (isset($orderItem['id'], $orderItem['display_order'])) {
                        PropertyImage::where('id', $orderItem['id'])
                            ->where('property_id', $property->id)
                            ->update(['display_order' => $orderItem['display_order']]);
                    }
                }
            }
        }
    }
}
