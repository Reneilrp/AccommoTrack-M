<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LandlordVerification;
use App\Models\LandlordVerificationHistory;
use App\Models\Property;
use App\Models\User;
use App\Notifications\LandlordApprovedNotification;
use App\Notifications\LandlordRejectedNotification;
use App\Services\AuditLogService;
use App\Support\SystemToggle;
use App\Jobs\PurgeCloudflareFilesJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function __construct(protected AuditLogService $auditLogService)
    {
    }

    /**
     * Get payment control system settings.
     */
    public function getPaymentControlSettings(Request $request)
    {
        $data = [
            'tenant_payments_disabled' => SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false)),
            'reservation_fee_disabled' => SystemToggle::getBool('reservation_fee_disabled', (bool) config('app.reservation_fee_disabled', false)),
            'mobile_latest_version' => SystemToggle::getString('mobile_latest_version', '1.0.0'),
            'mobile_download_url' => SystemToggle::getString('mobile_download_url', 'https://accommotrack.me/downloads/AccommoTrack.apk'),
            'mobile_force_update' => SystemToggle::getBool('mobile_force_update', true),
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => '',
        ]);
    }

    /**
     * Update payment control system settings.
     */
    public function updatePaymentControlSettings(Request $request)
    {
        $validated = $request->validate([
            'tenant_payments_disabled' => 'required|boolean',
            'reservation_fee_disabled' => 'required|boolean',
            'mobile_latest_version' => 'nullable|string|max:50',
            'mobile_download_url' => 'nullable|url|max:255',
            'mobile_force_update' => 'nullable|boolean',
        ]);

        $actorId = Auth::id();
        SystemToggle::setBool('tenant_payments_disabled', (bool) $validated['tenant_payments_disabled'], $actorId);
        SystemToggle::setBool('reservation_fee_disabled', (bool) $validated['reservation_fee_disabled'], $actorId);
        
        if (isset($validated['mobile_latest_version'])) {
            SystemToggle::setString('mobile_latest_version', $validated['mobile_latest_version'], $actorId);
        }
        if (isset($validated['mobile_download_url'])) {
            SystemToggle::setString('mobile_download_url', $validated['mobile_download_url'], $actorId);
        }
        if (isset($validated['mobile_force_update'])) {
            SystemToggle::setBool('mobile_force_update', (bool) $validated['mobile_force_update'], $actorId);
        }

        // Automatically purge Cloudflare cache for the APK if mobile settings are updated
        if (isset($validated['mobile_download_url']) || isset($validated['mobile_latest_version'])) {
            $urlToPurge = $validated['mobile_download_url'] ?? SystemToggle::getString('mobile_download_url');
            if ($urlToPurge) {
                PurgeCloudflareFilesJob::dispatch([$urlToPurge]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tenant_payments_disabled' => (bool) $validated['tenant_payments_disabled'],
                'reservation_fee_disabled' => (bool) $validated['reservation_fee_disabled'],
                'mobile_latest_version' => $validated['mobile_latest_version'] ?? SystemToggle::getString('mobile_latest_version', '1.0.0'),
                'mobile_download_url' => $validated['mobile_download_url'] ?? SystemToggle::getString('mobile_download_url', 'https://accommotrack.me/downloads/AccommoTrack.apk'),
                'mobile_force_update' => isset($validated['mobile_force_update']) ? (bool) $validated['mobile_force_update'] : SystemToggle::getBool('mobile_force_update', true),
            ],
            'message' => 'Payment control settings updated successfully.',
        ]);
    }

    /**
     * Clear the global cache (frontend edge and backend application cache).
     */
    public function clearGlobalCache(Request $request)
    {
        try {
            \App\Jobs\PurgeCloudflareCacheJob::dispatchSync();
            \Illuminate\Support\Facades\Artisan::call('cache:clear');
            return response()->json(['success' => true, 'message' => 'Global cache successfully cleared.']);
        } catch (\Exception $e) {
            \Log::error('Failed to clear global cache: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to clear cache.', 'error' => $e->getMessage()], 500);
        }
    }

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
                },
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
                            'name' => $p->title,
                        ];
                    })->toArray();
                    // Add verification status for landlords
                    $userData['verification_status'] = $user->landlordVerification?->status ?? 'not_submitted';
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
                            'room_number' => $activeBooking->room->room_number ?? null,
                        ];
                    }

                    // Fallback to room assignments if no booking
                    if (! $currentProperty && $user->roomAssignments->count() > 0) {
                        $assignment = $user->roomAssignments->first();
                        if ($assignment && $assignment->property) {
                            $currentProperty = [
                                'id' => $assignment->property->id,
                                'name' => $assignment->property->title,
                                'room_number' => $assignment->room_number ?? null,
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
                            'name' => trim($landlord->first_name.' '.$landlord->last_name),
                            'email' => $landlord->email,
                            'properties' => $landlord->properties->map(function ($p) {
                                return [
                                    'id' => $p->id,
                                    'name' => $p->title,
                                ];
                            })->toArray(),
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
                $user->notify(new LandlordApprovedNotification);
            } catch (\Exception $e) {
                \Log::error('Failed to send approval notification: '.$e->getMessage());
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
                \Log::error('Failed to send rejection notification: '.$e->getMessage());
            }
        }

        return response()->json([
            'verification' => $verification,
            'message' => 'Verification rejected successfully',
        ]);
    }

    /**
     * Block a user
     */
    public function blockUser(Request $request, $id)
    {
        $validated = $request->validate([
            'block_mode' => 'nullable|in:immediate,after_discussion',
            'discussion_summary' => 'nullable|string|max:2000',
            'admin_notes' => 'nullable|string|max:2000',
            'override_without_discussion' => 'nullable|boolean',
        ]);

        $user = User::findOrFail($id);
        $requestedMode = $validated['block_mode'] ?? 'immediate';
        $discussionSummary = trim((string) ($validated['discussion_summary'] ?? ''));
        $adminNotes = trim((string) ($validated['admin_notes'] ?? ''));
        $overrideWithoutDiscussion = (bool) ($validated['override_without_discussion'] ?? false);

        if ($requestedMode === 'after_discussion' && ! $overrideWithoutDiscussion && $discussionSummary === '') {
            return response()->json([
                'message' => 'Discussion summary is required unless the mediation step is explicitly overridden.',
                'errors' => [
                    'discussion_summary' => ['Discussion summary is required unless the mediation step is explicitly overridden.'],
                ],
            ], 422);
        }

        $statusBefore = $user->is_blocked ? 'blocked' : 'active';
        $user->is_blocked = true;
        $user->save();

        $this->auditLogService->log('user', 'user.blocked', [
            'severity' => 'warning',
            'subject_type' => 'user',
            'subject_id' => $user->id,
            'status_before' => $statusBefore,
            'status_after' => 'blocked',
            'summary' => sprintf('Admin blocked %s (%s).', $user->email ?? ('user#'.$user->id), $user->role ?? 'user'),
            'metadata' => [
                'mode' => $requestedMode,
                'discussion_summary' => $discussionSummary !== '' ? $discussionSummary : null,
                'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
                'override_without_discussion' => $overrideWithoutDiscussion,
            ],
            'tenant_id' => $user->role === 'tenant' ? $user->id : null,
            'landlord_id' => in_array($user->role, ['landlord', 'caretaker'], true) ? $user->id : null,
        ]);

        return response()->json([
            'user' => $user,
            'mediation' => [
                'mode' => $requestedMode,
                'discussion_summary' => $discussionSummary !== '' ? $discussionSummary : null,
                'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
                'override_without_discussion' => $overrideWithoutDiscussion,
            ],
            'message' => $requestedMode === 'after_discussion' && ! $overrideWithoutDiscussion
                ? 'User blocked and mediation notes recorded.'
                : 'User blocked',
        ]);
    }

    /**
     * Unblock a user
     */
    public function unblockUser(Request $request, $id)
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $user = User::findOrFail($id);
        $statusBefore = $user->is_blocked ? 'blocked' : 'active';
        $user->is_blocked = false;
        $user->save();

        $adminNotes = trim((string) ($validated['admin_notes'] ?? ''));

        $this->auditLogService->log('user', 'user.unblocked', [
            'severity' => 'info',
            'subject_type' => 'user',
            'subject_id' => $user->id,
            'status_before' => $statusBefore,
            'status_after' => 'active',
            'summary' => sprintf('Admin unblocked %s (%s).', $user->email ?? ('user#'.$user->id), $user->role ?? 'user'),
            'metadata' => [
                'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
            ],
            'tenant_id' => $user->role === 'tenant' ? $user->id : null,
            'landlord_id' => in_array($user->role, ['landlord', 'caretaker'], true) ? $user->id : null,
        ]);

        return response()->json(['user' => $user, 'message' => 'User unblocked']);
    }

    /**
     * Get pending properties
     */
    public function getPendingProperties(Request $request)
    {
        $properties = Property::where('current_status', Property::STATUS_PENDING)
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->withCount('rooms')
            ->get();

        return response()->json(['data' => \App\Http\Resources\PropertyResource::collection($properties)->resolve()]);
    }

    /**
     * Get approved properties
     */
    public function getApprovedProperties(Request $request)
    {
        $properties = Property::where('current_status', Property::STATUS_ACTIVE)
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->withCount('rooms')
            ->get();

        return response()->json(['data' => \App\Http\Resources\PropertyResource::collection($properties)->resolve()]);
    }

    /**
     * Get rejected properties
     */
    public function getRejectedProperties(Request $request)
    {
        $properties = Property::where('current_status', Property::STATUS_INACTIVE)
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->withCount('rooms')
            ->get();

        return response()->json(['data' => \App\Http\Resources\PropertyResource::collection($properties)->resolve()]);
    }

    /**
     * Get maintenance properties
     */
    public function getMaintenanceProperties(Request $request)
    {
        $properties = Property::where('current_status', Property::STATUS_MAINTENANCE)
            ->with(['landlord', 'images', 'amenities', 'credentials'])
            ->withCount('rooms')
            ->get();

        return response()->json(['data' => \App\Http\Resources\PropertyResource::collection($properties)->resolve()]);
    }

    /**
     * Approve a property
     */
    public function approveProperty(Request $request, $id)
    {
        $property = Property::findOrFail($id);
        $property->current_status = Property::STATUS_ACTIVE;
        $property->is_published = true;
        $property->is_available = true;
        $property->save();

        // Ensure available rooms count is up to date
        $property->updateAvailableRooms();

        return response()->json(['property' => $property, 'message' => 'Property approved']);
    }

    /**
     * Reject a property
     */
    public function rejectProperty(Request $request, $id)
    {
        $property = Property::findOrFail($id);
        $property->current_status = Property::STATUS_INACTIVE;
        $property->is_published = false;
        $property->is_available = false;
        $property->save();

        // Ensure available rooms count is up to date (will be 0 if not available)
        $property->updateAvailableRooms();

        return response()->json(['property' => $property, 'message' => 'Property rejected']);
    }

    /**
     * Put a property under maintenance
     */
    public function putUnderMaintenance(Request $request, $id)
    {
        $property = Property::findOrFail($id);
        $property->current_status = Property::STATUS_MAINTENANCE;
        $property->is_published = false;
        $property->is_available = false;
        $property->save();

        return response()->json(['property' => $property, 'message' => 'Property put under maintenance']);
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
        $approvedProperties = Property::where('current_status', Property::STATUS_ACTIVE)->count();
        $pendingProperties = Property::where('current_status', Property::STATUS_PENDING)->count();

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
                'description' => $user->first_name.' '.$user->last_name.' registered as '.$user->role,
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
            $statusType = $property->current_status === Property::STATUS_ACTIVE ? 'approval' : ($property->current_status === Property::STATUS_INACTIVE ? 'rejection' : 'property');

            $activities[] = [
                'type' => $statusType,
                'title' => $property->current_status === Property::STATUS_PENDING ? 'Property Submitted' : ($property->current_status === Property::STATUS_ACTIVE ? 'Property Approved' : 'Property Rejected'),
                'description' => $property->title.' by '.$property->landlord->first_name.' '.$property->landlord->last_name,
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
