<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    /**
     * Get all users
     */
    public function getUsers(Request $request)
    {
        $users = User::where('role', '!=', 'admin')
            ->with([
                // For landlords: their properties
                'properties:id,landlord_id,title',
                // For tenants: their bookings with property and room info
                'bookings' => function ($query) {
                    $query->where('status', 'confirmed')
                        ->orWhere('status', 'active')
                        ->with(['property:id,title', 'room:id,room_number']);
                },
                // For tenants: room assignments as fallback
                'roomAssignments' => function ($query) {
                    $query->with('property:id,title');
                },
                // For caretakers: their assignment with landlord info
                'caretakerAssignment' => function ($query) {
                    $query->with(['landlord:id,first_name,last_name,email', 'landlord.properties:id,landlord_id,title']);
                }
            ])
            ->get()
            ->map(function ($user) {
                $userData = $user->toArray();

                // Add property info for landlords
                if ($user->role === 'landlord') {
                    $userData['properties_count'] = $user->properties->count();
                    $userData['properties_list'] = $user->properties->map(function ($p) {
                        return [
                            'id' => $p->id,
                            'name' => $p->title
                        ];
                    })->toArray();
                }

                // Add property/room info for tenants
                if ($user->role === 'tenant') {
                    $currentProperty = null;

                    // First check bookings (confirmed/active)
                    $activeBooking = $user->bookings->first();
                    if ($activeBooking && $activeBooking->property) {
                        $currentProperty = [
                            'id' => $activeBooking->property->id,
                            'name' => $activeBooking->property->title,
                            'room_number' => $activeBooking->room->room_number ?? null
                        ];
                    }

                    // Fallback to room assignments if no booking
                    if (!$currentProperty && $user->roomAssignments->count() > 0) {
                        $assignment = $user->roomAssignments->first();
                        if ($assignment && $assignment->property) {
                            $currentProperty = [
                                'id' => $assignment->property->id,
                                'name' => $assignment->property->title,
                                'room_number' => $assignment->room_number ?? null
                            ];
                        }
                    }

                    $userData['current_property'] = $currentProperty;
                }

                // Add landlord info for caretakers
                if ($user->role === 'caretaker') {
                    if ($user->caretakerAssignment && $user->caretakerAssignment->landlord) {
                        $landlord = $user->caretakerAssignment->landlord;
                        $userData['assigned_landlord'] = [
                            'id' => $landlord->id,
                            'name' => trim($landlord->first_name . ' ' . $landlord->last_name),
                            'email' => $landlord->email,
                            'properties' => $landlord->properties->map(function ($p) {
                                return [
                                    'id' => $p->id,
                                    'name' => $p->title
                                ];
                            })->toArray()
                        ];
                    } else {
                        $userData['assigned_landlord'] = null;
                    }
                }

                return $userData;
            });

        return response()->json(['data' => $users]);
    }

    /**
     * Create a new admin user. Only callable by authenticated admins.
     */
    public function createAdmin(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:8',
        ]);

        $user = User::updateOrCreate(
            ['email' => $validated['email']],
            [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'admin',
                'is_verified' => true,
                'is_active' => true,
            ]
        );

        return response()->json(['user' => $user, 'message' => 'Admin created/updated'], 201);
    }

    /**
     * Approve a user
     */
    public function approveUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->is_verified = true;
        $user->save();

        return response()->json(['user' => $user, 'message' => 'User approved']);
    }

    /**
     * Block a user
     */
    public function blockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->is_active = false;
        $user->save();

        return response()->json(['user' => $user, 'message' => 'User blocked']);
    }

    /**
     * Unblock a user
     */
    public function unblockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->is_active = true;
        $user->save();

        return response()->json(['user' => $user, 'message' => 'User unblocked']);
    }

    /**
     * Get pending properties
     */
    public function getPendingProperties(Request $request)
    {
        $properties = Property::where('current_status', 'pending')
            ->with(['landlord', 'images', 'amenities'])
            ->get()
            ->map(function ($property) {
                // Transform images with proper URLs
                $property->images->transform(function ($image) {
                    $image->image_url = asset('storage/' . $image->image_url);
                    return $image;
                });

                // Convert amenities to array of names
                $amenityNames = $property->amenities->pluck('name')->toArray();

                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                return $propertyArray;
            });

        return response()->json(['data' => $properties]);
    }


    /**
     * Get approved properties
     */
    public function getApprovedProperties(Request $request)
    {
        $properties = Property::where('current_status', 'active')
            ->with(['landlord', 'images', 'amenities'])
            ->get()
            ->map(function ($property) {
                // Transform images with proper URLs
                $property->images->transform(function ($image) {
                    $image->image_url = asset('storage/' . $image->image_url);
                    return $image;
                });

                // Convert amenities to array of names
                $amenityNames = $property->amenities->pluck('name')->toArray();

                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                return $propertyArray;
            });

        return response()->json(['data' => $properties]);
    }


    /**
     * Get rejected properties
     */
    public function getRejectedProperties(Request $request)
    {
        $properties = Property::where('current_status', 'inactive')
            ->with(['landlord', 'images', 'amenities'])
            ->get()
            ->map(function ($property) {
                // Transform images with proper URLs
                $property->images->transform(function ($image) {
                    $image->image_url = asset('storage/' . $image->image_url);
                    return $image;
                });

                // Convert amenities to array of names
                $amenityNames = $property->amenities->pluck('name')->toArray();

                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                return $propertyArray;
            });

        return response()->json(['data' => $properties]);
    }

    /**
     * Approve a property
     */
    public function approveProperty(Request $request, $id)
    {
        $property = Property::findOrFail($id);
        $property->current_status = 'active';
        $property->is_published = true;
        $property->is_available = true;
        $property->save();

        return response()->json(['property' => $property, 'message' => 'Property approved']);
    }

    /**
     * Reject a property
     */
    public function rejectProperty(Request $request, $id)
    {
        $property = Property::findOrFail($id);
        $property->current_status = 'inactive';
        $property->is_published = false;
        $property->is_available = false;
        $property->save();

        return response()->json(['property' => $property, 'message' => 'Property rejected']);
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats()
    {
        $totalUsers = User::where('role', '!=', 'admin')->count();
        $landlords = User::where('role', 'landlord')->count();
        $tenants = User::where('role', 'tenant')->count();
        $activeUsers = User::where('role', '!=', 'admin')->where('is_active', true)->count();
        $blockedUsers = User::where('role', '!=', 'admin')->where('is_active', false)->count();

        $totalProperties = Property::count();
        $approvedProperties = Property::where('current_status', 'active')->count();
        $pendingProperties = Property::where('current_status', 'pending')->count();

        return response()->json([
            'users' => [
                'total' => $totalUsers,
                'landlords' => $landlords,
                'tenants' => $tenants,
                'active' => $activeUsers,
                'blocked' => $blockedUsers,
            ],
            'properties' => [
                'total' => $totalProperties,
                'approved' => $approvedProperties,
                'pending' => $pendingProperties,
            ],
        ]);
    }

    /**
     * Get recent activities
     */
    public function getRecentActivities()
    {
        $activities = [];

        // Get recent user registrations
        $recentUsers = User::where('role', '!=', 'admin')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        foreach ($recentUsers as $user) {
            $activities[] = [
                'type' => 'user',
                'title' => 'New User Registration',
                'description' => "{$user->first_name} {$user->last_name} registered as {$user->role}",
                'timestamp' => $user->created_at->toISOString(),
                'badge' => ucfirst($user->role),
            ];
        }

        // Get recent property submissions
        $recentProperties = Property::with('landlord')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        foreach ($recentProperties as $property) {
            $statusType = $property->current_status === 'active' ? 'approval' : ($property->current_status === 'inactive' ? 'rejection' : 'property');

            $activities[] = [
                'type' => $statusType,
                'title' => $property->current_status === 'pending' ? 'Property Submitted' : ($property->current_status === 'active' ? 'Property Approved' : 'Property Rejected'),
                'description' => "{$property->title} by {$property->landlord->first_name} {$property->landlord->last_name}",
                'timestamp' => $property->created_at->toISOString(),
                'badge' => ucfirst($property->current_status),
            ];
        }

        // Sort all activities by timestamp
        usort($activities, function ($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });

        // Return only the 10 most recent activities
        return response()->json(array_slice($activities, 0, 10));
    }
}
