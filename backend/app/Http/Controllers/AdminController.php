<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Property;
use App\Models\LandlordVerification;
use App\Models\LandlordVerificationHistory;
use App\Notifications\LandlordApprovedNotification;
use App\Notifications\LandlordRejectedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    /**
     * Get all users
     */
    public function getUsers(Request $request)
    {
        $users = User::where('role', '!=', 'admin')
            ->with([
                // For landlords: their properties and verification
                'properties:id,landlord_id,title',
                'landlordVerification:id,user_id,status',
                // For tenants: their bookings with property and room info, and profile
                'tenantProfile:user_id,gender',
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
            ->map(function (User $user) {
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
                    // Add verification status for landlords
                    $userData['verification_status'] = $user->landlordVerification?->status ?? 'not_submitted';
                }

                // Add property/room info for tenants
                if ($user->role === 'tenant') {
                    $userData['gender'] = $user->tenantProfile->gender ?? null;
                    
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
    // public function createAdmin(Request $request)
    // {
    //     $validated = $request->validate([
    //         'first_name' => 'required|string|max:100',
    //         'last_name' => 'required|string|max:100',
    //         'email' => 'required|email|max:255',
    //         'password' => 'required|string|min:8',
    //     ]);

    //     $user = User::updateOrCreate(
    //         ['email' => $validated['email']],
    //         [
    //             'first_name' => $validated['first_name'],
    //             'last_name' => $validated['last_name'],
    //             'email' => $validated['email'],
    //             'password' => Hash::make($validated['password']),
    //             'role' => 'admin',
    //             'is_verified' => true,
    //             'is_active' => true,
    //         ]
    //     );

    //     return response()->json(['user' => $user, 'message' => 'Admin created/updated'], 201);
    // }

    /**
     * Approve a user (landlord verification)
     */
    public function approveUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->is_verified = true;
        $user->save();

        // Also update the landlord verification record
        $verification = LandlordVerification::where('user_id', $id)->first();
        if ($verification) {
            // Save current state to history before updating
            LandlordVerificationHistory::create([
                'landlord_verification_id' => $verification->id,
                'valid_id_type' => $verification->valid_id_type,
                'valid_id_other' => $verification->valid_id_other,
                'valid_id_path' => $verification->valid_id_path,
                'permit_path' => $verification->permit_path,
                'status' => 'approved',
                'rejection_reason' => null,
                'submitted_at' => $verification->created_at,
                'reviewed_at' => now(),
                'reviewed_by' => Auth::id(),
            ]);

            $verification->status = 'approved';
            $verification->rejection_reason = null;
            $verification->reviewed_at = now();
            $verification->reviewed_by = Auth::id();
            $verification->save();

            // Send approval email notification
            try {
                $user->notify(new LandlordApprovedNotification());
            } catch (\Exception $e) {
                \Log::error('Failed to send approval notification: ' . $e->getMessage());
            }
        }

        return response()->json(['user' => $user, 'message' => 'User approved']);
    }

    /**
     * Reject a landlord verification
     */
    public function rejectVerification(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $verification = LandlordVerification::with('user')->findOrFail($id);
        
        // Save current state to history before updating
        LandlordVerificationHistory::create([
            'landlord_verification_id' => $verification->id,
            'valid_id_type' => $verification->valid_id_type,
            'valid_id_other' => $verification->valid_id_other,
            'valid_id_path' => $verification->valid_id_path,
            'permit_path' => $verification->permit_path,
            'status' => 'rejected',
            'rejection_reason' => $request->reason,
            'submitted_at' => $verification->updated_at ?? $verification->created_at,
            'reviewed_at' => now(),
            'reviewed_by' => Auth::id(),
        ]);

        $verification->status = 'rejected';
        $verification->rejection_reason = $request->reason;
        $verification->reviewed_at = now();
        $verification->reviewed_by = Auth::id();
        $verification->save();

        // Update user verification status
        $user = $verification->user;
        if ($user) {
            $user->is_verified = false;
            $user->save();

            // Send rejection email notification with reason
            try {
                $user->notify(new LandlordRejectedNotification($request->reason));
            } catch (\Exception $e) {
                \Log::error('Failed to send rejection notification: ' . $e->getMessage());
            }
        }

        return response()->json([
            'verification' => $verification,
            'message' => 'Verification rejected successfully'
        ]);
    }

    /**
     * Block a user
     */
    public function blockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->is_blocked = true;
        $user->save();

        return response()->json(['user' => $user, 'message' => 'User blocked']);
    }

    /**
     * Unblock a user
     */
    public function unblockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->is_blocked = false;
        $user->save();

        return response()->json(['user' => $user, 'message' => 'User unblocked']);
    }

    /**
     * Get pending properties
     */
    public function getPendingProperties(Request $request)
    {
        $properties = Property::where('current_status', 'pending')
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->get()
            ->map(function (Property $property) {
                // Transform images with proper URLs
                $property->images->transform(function ($image) {
                    $image->image_url = asset('storage/' . $image->image_url);
                    return $image;
                });

                // Transform credentials to include file_url
                if ($property->relationLoaded('credentials')) {
                    $property->credentials->transform(function ($c) {
                        $c->file_url = asset('storage/' . $c->file_path);
                        return $c;
                    });
                }

                // Convert amenities to array of names
                $amenityNames = $property->amenities->pluck('name')->toArray();

                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                // Map credentials to include file_url in array form
                if (isset($propertyArray['credentials']) && is_array($propertyArray['credentials'])) {
                    $propertyArray['credentials'] = array_map(function ($c) {
                        return array_merge($c, ['file_url' => isset($c['file_path']) ? asset('storage/' . $c['file_path']) : ($c['file_url'] ?? null)]);
                    }, $propertyArray['credentials']);
                }

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
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->get()
            ->map(function (Property $property) {
                // Transform images with proper URLs
                $property->images->transform(function ($image) {
                    $image->image_url = asset('storage/' . $image->image_url);
                    return $image;
                });

                if ($property->relationLoaded('credentials')) {
                    $property->credentials->transform(function ($c) {
                        $c->file_url = asset('storage/' . $c->file_path);
                        return $c;
                    });
                }

                // Convert amenities to array of names
                $amenityNames = $property->amenities->pluck('name')->toArray();

                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                if (isset($propertyArray['credentials']) && is_array($propertyArray['credentials'])) {
                    $propertyArray['credentials'] = array_map(function ($c) {
                        return array_merge($c, ['file_url' => isset($c['file_path']) ? asset('storage/' . $c['file_path']) : ($c['file_url'] ?? null)]);
                    }, $propertyArray['credentials']);
                }

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
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->get()
            ->map(function (Property $property) {
                // Transform images with proper URLs
                $property->images->transform(function ($image) {
                    $image->image_url = asset('storage/' . $image->image_url);
                    return $image;
                });

                if ($property->relationLoaded('credentials')) {
                    $property->credentials->transform(function ($c) {
                        $c->file_url = asset('storage/' . $c->file_path);
                        return $c;
                    });
                }

                // Convert amenities to array of names
                $amenityNames = $property->amenities->pluck('name')->toArray();

                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                if (isset($propertyArray['credentials']) && is_array($propertyArray['credentials'])) {
                    $propertyArray['credentials'] = array_map(function ($c) {
                        return array_merge($c, ['file_url' => isset($c['file_path']) ? asset('storage/' . $c['file_path']) : ($c['file_url'] ?? null)]);
                    }, $propertyArray['credentials']);
                }

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
        $blockedUsers = User::where('role', '!=', 'admin')->where('is_blocked', true)->count();

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
                'description' => $user->first_name . ' ' . $user->last_name . ' registered as ' . $user->role,
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
                'description' => $property->title . ' by ' . $property->landlord->first_name . ' ' . $property->landlord->last_name,
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
