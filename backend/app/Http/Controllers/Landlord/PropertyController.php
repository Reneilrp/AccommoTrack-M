<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Services\PropertyService;
use App\Http\Requests\StorePropertyRequest;
use App\Http\Requests\UpdatePropertyRequest;
use App\Http\Resources\PropertyResource;
use App\Http\Resources\RoomResource;
use App\Models\Room;

class PropertyController extends Controller
{
    use ResolvesLandlordAccess;

    protected PropertyService $propertyService;

    public function __construct(PropertyService $propertyService)
    {
        $this->propertyService = $propertyService;
    }

    // ====================================================================
    // PUBLIC ROUTES
    // ====================================================================

    public function getAllProperties(Request $request)
    {
        try {
            $properties = $this->propertyService->getPublicProperties($request);
            return response()->json(PropertyResource::collection($properties)->resolve());
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch properties', 'error' => $e->getMessage()], 500);
        }
    }

    public function getPropertyDetails($id)
    {
        try {
            $property = Property::where('is_published', true)
                ->where('is_available', true)
                ->with([
                    'rooms' => function ($q) { $q->with('amenities', 'images'); },
                    'images', 'landlord:id,first_name,last_name,email,phone,payment_methods_settings',
                    'reviews' => function($q) { $q->where('is_published', true); }
                ])
                ->findOrFail($id);

            return response()->json((new PropertyResource($property))->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found or not available'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    // ====================================================================
    // PROTECTED ROUTES
    // ====================================================================

    public function getAccessibleProperties(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'caretaker') {
            $assignment = $user->caretakerAssignment;
            if (!$assignment) return response()->json([], 200);
            $propertyIds = $assignment->properties()->pluck('properties.id')->toArray();
            $properties = Property::whereIn('id', $propertyIds);
        } else {
            $properties = Property::where('landlord_id', $user->id);
        }
        $data = $properties->withCount(['rooms', 'rooms as available_rooms' => fn($q) => $q->where('status', 'available')])
            ->with(['images', 'amenities', 'credentials'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        // Use the resource for consistent output, but manually map since it's a specific query
        $formattedData = $data->map(function ($property) {
            $propertyArray = (new PropertyResource($property))->resolve();
            // Add credentials back in for the landlord view
            if ($property->relationLoaded('credentials')) {
                 $propertyArray['credentials'] = $property->credentials->map(function($c) {
                    return ['id' => $c->id, 'file_url' => asset('storage/' . $c->file_path), 'original_name' => $c->original_name];
                 })->toArray();
            }
            return $propertyArray;
        });

        return response()->json($formattedData, 200);
    }

    public function index(Request $request)
    {
        return $this->getAccessibleProperties($request);
    }

    public function store(StorePropertyRequest $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            $property = $this->propertyService->createProperty($request->validated(), $context['user']);

            return response()->json((new PropertyResource($property->load(['images', 'amenities', 'credentials', 'rooms'])))->resolve());
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create property', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $property = Property::where('landlord_id', Auth::id())
            ->with(['rooms', 'images', 'amenities', 'credentials'])
            ->findOrFail($id);
        
        return response()->json((new PropertyResource($property))->resolve());
    }

    public function update(UpdatePropertyRequest $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);
            $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);

            if (!$context['user']->is_verified) {
                if ($request->has('current_status') && $request->current_status !== 'draft') {
                    return response()->json(['message' => 'Your account is pending verification. Properties can only be saved as drafts.', 'verification_required' => true], 403);
                }
                if ($request->has('is_published') && $request->boolean('is_published')) {
                    return response()->json(['message' => 'Your account is pending verification. You cannot publish properties.', 'verification_required' => true], 403);
                }
            }

            $property = $this->propertyService->updateProperty($property, $request->validated(), $request);
            
            return response()->json((new PropertyResource($property->load(['images', 'amenities', 'credentials', 'rooms'])))->resolve());
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update property', 'error' => $e->getMessage()], 500);
        }
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            if ($request->has('password')) {
                if (!Hash::check($request->password, $context['user']->password)) {
                    return response()->json(['message' => 'Incorrect password.', 'error' => 'password_incorrect'], 422);
                }
            } else {
                 return response()->json(['message' => 'Password is required for deletion.'], 422);
            }

            $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);
            $this->propertyService->deleteProperty($property);

            return response()->json(['message' => 'Property and all associated rooms deleted successfully'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete property', 'error' => $e->getMessage()], 500);
        }
    }

    public function verifyPassword(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);
        $request->validate(['password' => 'required|string']);
        if (!Hash::check($request->password, $context['user']->password)) {
            return response()->json(['message' => 'Incorrect password', 'verified' => false], 422);
        }
        return response()->json(['message' => 'Password verified', 'verified' => true], 200);
    }
    
    public function getRoomDetails($roomId)
    {
        $room = Room::with([
            'property' => function ($query) {
                $query->select('id', 'landlord_id', 'title', 'address', 'city')
                    ->with('landlord:id,first_name,last_name,email,phone,payment_methods_settings');
            }, 'images', 'amenities'
        ])->findOrFail($roomId);

        return new RoomResource($room);
    }

    public function addAmenity(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);
        $request->validate(['amenity' => 'required|string|max:255']);
        $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);
        $amenity = \App\Models\Amenity::firstOrCreate(['name' => trim($request->amenity)]);
        if (!$property->amenities->contains($amenity->id)) {
            $property->amenities()->attach($amenity->id);
        }
        return response()->json(['message' => 'Amenity added successfully', 'amenity' => $amenity->name], 200);
    }

    public function addRule(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);
        $request->validate(['rule' => 'required|string|max:255']);
        $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);
        $rules = $property->property_rules ?? [];
        $newRule = trim($request->rule);
        if (!in_array($newRule, $rules)) {
            $rules[] = $newRule;
            $property->property_rules = $rules;
            $property->save();
        }
        return response()->json(['message' => 'Rule added successfully', 'rule' => $newRule, 'rules' => $rules], 200);
    }
}
