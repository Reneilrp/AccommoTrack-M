<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\PurgeCloudflareFilesJob;
use App\Mail\AdminForcedPasswordResetLink;
use App\Models\LandlordVerification;
use App\Models\LandlordVerificationHistory;
use App\Models\Property;
use App\Models\User;
use App\Notifications\LandlordApprovedNotification;
use App\Notifications\LandlordRejectedNotification;
use App\Services\AuditLogService;
use App\Services\PropertyService;
use App\Support\AdminPermission;
use App\Support\SystemToggle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AdminController extends Controller
{
    public function __construct(protected AuditLogService $auditLogService) {}

    /**
     * Get payment control system settings.
     */
    public function getPaymentControlSettings(Request $request)
    {
        $tenantPaymentsDisabled = SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false));

        $data = [
            'tenant_payments_disabled' => $tenantPaymentsDisabled,
            'invoice_paymongo_disabled' => SystemToggle::getBool('invoice_paymongo_disabled', $tenantPaymentsDisabled),
            'paymongo_test_mode_enabled' => SystemToggle::getBool('paymongo_test_mode_enabled', false),
            'reservation_fee_disabled' => SystemToggle::getBool('reservation_fee_disabled', (bool) config('app.reservation_fee_disabled', false)),
            'manual_gcash_reservation_disabled' => SystemToggle::getBool('manual_gcash_reservation_disabled', false),
            'mobile_latest_version' => SystemToggle::getString('mobile_latest_version', '1.0.0'),
            'mobile_download_url' => SystemToggle::getString('mobile_download_url', 'https://accommotrack.me/downloads/AccommoTrack.apk'),
            'mobile_force_update' => SystemToggle::getBool('mobile_force_update', true),
            'system_forced_now' => SystemToggle::getString('system_forced_now', ''),
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
        $previousForcedNow = SystemToggle::getString('system_forced_now', '');

        $validated = $request->validate([
            'tenant_payments_disabled' => 'required|boolean',
            'invoice_paymongo_disabled' => 'nullable|boolean',
            'paymongo_test_mode_enabled' => 'nullable|boolean',
            'reservation_fee_disabled' => 'required|boolean',
            'manual_gcash_reservation_disabled' => 'required|boolean',
            'mobile_latest_version' => 'nullable|string|max:50',
            'mobile_download_url' => 'nullable|url|max:255',
            'mobile_force_update' => 'nullable|boolean',
            'system_forced_now' => 'nullable|string|max:100',
        ]);

        $actorId = Auth::id();
        SystemToggle::setBool('tenant_payments_disabled', (bool) $validated['tenant_payments_disabled'], $actorId);
        if (array_key_exists('invoice_paymongo_disabled', $validated)) {
            SystemToggle::setBool('invoice_paymongo_disabled', (bool) $validated['invoice_paymongo_disabled'], $actorId);
        }
        if (array_key_exists('paymongo_test_mode_enabled', $validated)) {
            SystemToggle::setBool('paymongo_test_mode_enabled', (bool) $validated['paymongo_test_mode_enabled'], $actorId);
        }
        SystemToggle::setBool('reservation_fee_disabled', (bool) $validated['reservation_fee_disabled'], $actorId);
        SystemToggle::setBool('manual_gcash_reservation_disabled', (bool) $validated['manual_gcash_reservation_disabled'], $actorId);

        if (isset($validated['mobile_latest_version'])) {
            SystemToggle::setString('mobile_latest_version', $validated['mobile_latest_version'], $actorId);
        }
        if (isset($validated['mobile_download_url'])) {
            SystemToggle::setString('mobile_download_url', $validated['mobile_download_url'], $actorId);
        }
        if (isset($validated['mobile_force_update'])) {
            SystemToggle::setBool('mobile_force_update', (bool) $validated['mobile_force_update'], $actorId);
        }

        // Handle system time override
        if (isset($request->system_forced_now)) {
            SystemToggle::setString('system_forced_now', (string) $request->system_forced_now, $actorId);
        } else {
            SystemToggle::setString('system_forced_now', '', $actorId);
        }

        $updatedForcedNow = SystemToggle::getString('system_forced_now', '');
        if ($updatedForcedNow !== $previousForcedNow) {
            try {
                \Illuminate\Support\Facades\Artisan::call('invoices:update-overdue');
            } catch (\Throwable $e) {
                \Log::warning('Failed to run overdue recalculation after system_forced_now update', [
                    'message' => $e->getMessage(),
                ]);
            }
        }

        // Purge global cache so toggles update on the edge immediately
        \App\Jobs\PurgeCloudflareCacheJob::markAsPending();

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
                'invoice_paymongo_disabled' => array_key_exists('invoice_paymongo_disabled', $validated)
                    ? (bool) $validated['invoice_paymongo_disabled']
                    : SystemToggle::getBool('invoice_paymongo_disabled', (bool) $validated['tenant_payments_disabled']),
                'paymongo_test_mode_enabled' => array_key_exists('paymongo_test_mode_enabled', $validated)
                    ? (bool) $validated['paymongo_test_mode_enabled']
                    : SystemToggle::getBool('paymongo_test_mode_enabled', false),
                'reservation_fee_disabled' => (bool) $validated['reservation_fee_disabled'],
                'manual_gcash_reservation_disabled' => (bool) $validated['manual_gcash_reservation_disabled'],
                'mobile_latest_version' => $validated['mobile_latest_version'] ?? SystemToggle::getString('mobile_latest_version', '1.0.0'),
                'mobile_download_url' => $validated['mobile_download_url'] ?? SystemToggle::getString('mobile_download_url', 'https://accommotrack.me/downloads/AccommoTrack.apk'),
                'mobile_force_update' => isset($validated['mobile_force_update']) ? (bool) $validated['mobile_force_update'] : SystemToggle::getBool('mobile_force_update', true),
                'system_forced_now' => SystemToggle::getString('system_forced_now', ''),
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
            \Log::error('Failed to clear global cache: '.$e->getMessage());

            return response()->json(['success' => false, 'message' => 'Failed to clear cache.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get all users
     */
    public function getUsers(Request $request)
    {
        $perPage = $request->query('per_page', 50);
        $role = $request->query('role');
        $search = $request->query('search');
        
        $query = User::where('role', '!=', 'admin');

        if ($role) {
            $query->where('role', $role);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $users = $query->with([
                // For landlords: their properties and verification
                'properties:id,landlord_id,title',
                'landlordVerification:id,user_id,status',
                // For tenants: their bookings with property and room info
                'bookings' => function ($query) {
                    $query->whereIn('status', ['confirmed', 'active'])
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
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $users->getCollection()->transform(function (User $user) {
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

        $admin = $request->user();

        return response()->json(array_merge(
            $users->toArray(),
            [
                'permissions' => AdminPermission::permissions($admin),
                'admin_tier' => AdminPermission::resolveTier($admin),
            ]
        ));
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
        if (! $verification) {
            $verification = LandlordVerification::create([
                'user_id' => $user->id,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'valid_id_type' => 'Pending Submission',
                'valid_id_other' => null,
                'valid_id_path' => '',
                'permit_path' => '',
                'status' => LandlordVerification::STATUS_APPROVED,
                'rejection_reason' => null,
                'reviewed_at' => now(),
                'reviewed_by' => Auth::id(),
                'document_due_at' => null,
            ]);
        } else {
            // Save current state to history before updating
            LandlordVerificationHistory::create([
                'landlord_verification_id' => $verification->id,
                'valid_id_type' => $verification->valid_id_type,
                'valid_id_other' => $verification->valid_id_other,
                'valid_id_path' => $verification->valid_id_path ?? '',
                'permit_path' => $verification->permit_path ?? '',
                'status' => $verification->status,
                'rejection_reason' => null,
                'submitted_at' => $verification->created_at,
                'reviewed_at' => now(),
                'reviewed_by' => Auth::id(),
            ]);

            $verification->status = LandlordVerification::STATUS_APPROVED;
            $verification->rejection_reason = null;
            $verification->reviewed_at = now();
            $verification->reviewed_by = Auth::id();
            $verification->document_due_at = null;
            $verification->save();
        }

        // Send approval email notification
        try {
            $user->notify(new LandlordApprovedNotification);
        } catch (\Exception $e) {
            \Log::error('Failed to send approval notification: '.$e->getMessage());
        }

        return response()->json(['user' => $user, 'message' => 'User approved']);
    }

    /**
     * Mark landlord as partially verified and set deadline for document submission.
     */
    public function partialVerifyUser(Request $request, $id)
    {
        $validated = $request->validate([
            'duration_days' => 'nullable|integer|min:1|max:60',
        ]);

        $durationDays = (int) ($validated['duration_days'] ?? 7);
        $user = User::findOrFail($id);

        if ($user->role !== 'landlord') {
            return response()->json([
                'message' => 'Only landlord accounts can be partially verified.',
            ], 422);
        }

        $verification = LandlordVerification::where('user_id', $id)->first();

        if ($verification) {
            LandlordVerificationHistory::create([
                'landlord_verification_id' => $verification->id,
                'valid_id_type' => $verification->valid_id_type,
                'valid_id_other' => $verification->valid_id_other,
                'valid_id_path' => $verification->valid_id_path ?? '',
                'permit_path' => $verification->permit_path ?? '',
                'status' => $verification->status,
                'rejection_reason' => $verification->rejection_reason,
                'submitted_at' => $verification->updated_at ?? $verification->created_at,
                'reviewed_at' => now(),
                'reviewed_by' => Auth::id(),
            ]);
        } else {
            $verification = new LandlordVerification;
            $verification->user_id = $user->id;
            $verification->first_name = $user->first_name;
            $verification->middle_name = $user->middle_name;
            $verification->last_name = $user->last_name;
            $verification->valid_id_type = 'Pending Submission';
            $verification->valid_id_other = null;
            $verification->valid_id_path = '';
            $verification->valid_id_back_path = null;
            $verification->permit_path = '';
        }

        $verification->status = LandlordVerification::STATUS_PARTIAL_VERIFIED;
        $verification->rejection_reason = null;
        $verification->reviewed_at = now();
        $verification->reviewed_by = Auth::id();
        $verification->document_due_at = now()->addDays($durationDays);
        $verification->save();

        return response()->json([
            'message' => 'Landlord moved to partial verification.',
            'verification' => $verification,
        ]);
    }

    /**
     * Bulk approve landlords
     */
    public function bulkApproveLandlords(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
        ]);

        $users = User::whereIn('id', $request->ids)->get();
        $approvedCount = 0;

        foreach ($users as $user) {
            if (! $user->is_verified) {
                $user->is_verified = true;
                $user->save();

                $verification = LandlordVerification::where('user_id', $user->id)->first();
                if ($verification) {
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
                }

                try {
                    $user->notify(new LandlordApprovedNotification);
                } catch (\Exception $e) {
                    \Log::error('Failed to send approval notification: '.$e->getMessage());
                }

                $approvedCount++;
            }
        }

        return response()->json(['message' => "$approvedCount landlords approved successfully"]);
    }

    /**
     * Bulk reject landlords
     */
    public function bulkRejectLandlords(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $users = User::whereIn('id', $request->ids)->get();
        $rejectedCount = 0;

        foreach ($users as $user) {
            $verification = LandlordVerification::where('user_id', $user->id)->first();
            if ($verification && $verification->status !== 'rejected') {
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

                $user->is_verified = false;
                $user->save();

                try {
                    $user->notify(new LandlordRejectedNotification($request->reason));
                } catch (\Exception $e) {
                    \Log::error('Failed to send rejection notification: '.$e->getMessage());
                }

                $rejectedCount++;
            }
        }

        return response()->json(['message' => "$rejectedCount landlords rejected successfully"]);
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
     * Block or suspend a user
     */
    public function blockUser(Request $request, $id)
    {
        $validated = $request->validate([
            'block_mode' => 'nullable|in:immediate,after_discussion',
            'discussion_summary' => 'nullable|string|max:2000',
            'admin_notes' => 'nullable|string|max:2000',
            'override_without_discussion' => 'nullable|boolean',
            'suspension_duration' => 'nullable|string|in:24h,7d,30d,permanent',
        ]);

        $user = User::findOrFail($id);
        $requestedMode = $validated['block_mode'] ?? 'immediate';
        $discussionSummary = trim((string) ($validated['discussion_summary'] ?? ''));
        $adminNotes = trim((string) ($validated['admin_notes'] ?? ''));
        $overrideWithoutDiscussion = (bool) ($validated['override_without_discussion'] ?? false);
        $suspensionDuration = $validated['suspension_duration'] ?? 'permanent';

        if ($requestedMode === 'after_discussion' && ! $overrideWithoutDiscussion && $discussionSummary === '') {
            return response()->json([
                'message' => 'Discussion summary is required unless the mediation step is explicitly overridden.',
                'errors' => [
                    'discussion_summary' => ['Discussion summary is required unless the mediation step is explicitly overridden.'],
                ],
            ], 422);
        }

        $statusBefore = $user->is_blocked ? 'blocked' : 'active';

        if ($suspensionDuration === 'permanent') {
            $user->is_blocked = true;
            $user->suspended_until = null;
        } else {
            $user->is_blocked = false; // ensure it's not permanently blocked
            if ($suspensionDuration === '24h') {
                $user->suspended_until = now()->addHours(24);
            } elseif ($suspensionDuration === '7d') {
                $user->suspended_until = now()->addDays(7);
            } elseif ($suspensionDuration === '30d') {
                $user->suspended_until = now()->addDays(30);
            }
        }

        $user->save();

        $actionType = $suspensionDuration === 'permanent' ? 'blocked' : 'suspended';

        $this->auditLogService->log('user', "user.{$actionType}", [
            'severity' => 'warning',
            'subject_type' => 'user',
            'subject_id' => $user->id,
            'status_before' => $statusBefore,
            'status_after' => $actionType,
            'summary' => sprintf('Admin %s %s (%s).', $actionType, $user->email ?? ('user#'.$user->id), $user->role ?? 'user'),
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
     * Generate a password reset link for a user without sending email.
     * This is useful for inquiry replies where admin wants to manually send the link.
     */
    public function generateUserPasswordResetLink(Request $request, $id)
    {
        $admin = $request->user();
        if (! AdminPermission::can($admin, 'can_reset_user_password')) {
            return response()->json([
                'message' => 'You do not have permission to generate password reset links.',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $reason = trim((string) $validated['reason']);

        $user = User::findOrFail($id);
        if (($user->role ?? null) === 'admin') {
            return response()->json([
                'message' => 'Admin accounts cannot be reset from this action.',
            ], 422);
        }

        try {
            $code = (string) random_int(100000, 999999);
            DB::table('password_reset_codes')->where('email', $user->email)->delete();
            DB::table('password_reset_codes')->insert([
                'email' => $user->email,
                'code' => $code,
                'created_at' => now(),
            ]);

            $frontendBaseUrl = rtrim((string) config('app.frontend_url', 'https://accommotrack.me'), '/');
            $resetUrl = sprintf(
                '%s/login?forced_reset=1&reset_email=%s&reset_code=%s',
                $frontendBaseUrl,
                urlencode((string) $user->email),
                urlencode($code),
            );

            $this->auditLogService->log('user', 'user.password_reset_link_generated', [
                'severity' => 'warning',
                'subject_type' => 'user',
                'subject_id' => $user->id,
                'summary' => sprintf('Admin generated a password reset link for %s (%s) for inquiry reply.', $user->email, $user->role ?? 'user'),
                'metadata' => [
                    'reason' => $reason,
                    'delivery' => 'manual_inquiry_reply',
                    'expires_in_minutes' => 10,
                ],
                'tenant_id' => $user->role === 'tenant' ? $user->id : null,
                'landlord_id' => in_array($user->role, ['landlord', 'caretaker'], true) ? $user->id : null,
            ]);

            return response()->json([
                'message' => 'Password reset link generated successfully.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'name' => trim(($user->first_name ?? '').' '.($user->last_name ?? '')),
                    ],
                    'reset_url' => $resetUrl,
                    'expires_in_minutes' => 10,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to generate password reset link.', 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Send a forced password reset link to a user.
     */
    public function sendUserPasswordResetLink(Request $request, $id)
    {
        $admin = $request->user();
        if (! AdminPermission::can($admin, 'can_reset_user_password')) {
            return response()->json([
                'message' => 'You do not have permission to reset user passwords.',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $reason = trim((string) $validated['reason']);

        $user = User::findOrFail($id);
        if (($user->role ?? null) === 'admin') {
            return response()->json([
                'message' => 'Admin accounts cannot be reset from this action.',
            ], 422);
        }

        try {
            $code = (string) random_int(100000, 999999);
            DB::table('password_reset_codes')->where('email', $user->email)->delete();
            DB::table('password_reset_codes')->insert([
                'email' => $user->email,
                'code' => $code,
                'created_at' => now(),
            ]);

            $frontendBaseUrl = rtrim((string) config('app.frontend_url', 'https://accommotrack.me'), '/');
            $resetUrl = sprintf(
                '%s/login?forced_reset=1&reset_email=%s&reset_code=%s',
                $frontendBaseUrl,
                urlencode((string) $user->email),
                urlencode($code),
            );

            Mail::to($user->email)->send(new AdminForcedPasswordResetLink($user, $resetUrl));

            $this->auditLogService->log('user', 'user.password_reset_link_sent', [
                'severity' => 'warning',
                'subject_type' => 'user',
                'subject_id' => $user->id,
                'summary' => sprintf('Admin sent a forced password reset link to %s (%s).', $user->email, $user->role ?? 'user'),
                'metadata' => [
                    'reason' => $reason,
                    'delivery' => 'email_forced_link',
                    'expires_in_minutes' => 10,
                ],
                'tenant_id' => $user->role === 'tenant' ? $user->id : null,
                'landlord_id' => in_array($user->role, ['landlord', 'caretaker'], true) ? $user->id : null,
            ]);

            return response()->json([
                'message' => 'Password reset link sent successfully.',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send password reset link.', 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Update a user's email address.
     *
     * Disabled by policy: user email is account-owned and must be changed by the account holder.
     */
    public function updateUserEmail(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $this->auditLogService->log('user', 'user.email_update_blocked', [
            'severity' => 'warning',
            'subject_type' => 'user',
            'subject_id' => $user->id,
            'summary' => sprintf('Admin attempted to update email for user %s, but the action is disabled by policy.', $user->email),
        ]);

        return response()->json([
            'message' => 'Admin email editing is disabled. Ask the user to update email from their account settings.',
        ], 403);
    }

    /**
     * Soft delete a user completely off the active platform
     */
    public function deleteUser(Request $request, $id)
    {
        if ($request->has('password')) {
            if (! \Illuminate\Support\Facades\Hash::check($request->password, \Illuminate\Support\Facades\Auth::user()->password)) {
                return response()->json(['message' => 'Incorrect password.', 'error' => 'password_incorrect'], 422);
            }
        } else {
            return response()->json(['message' => 'Password is required for deletion.'], 422);
        }

        try {
            $user = User::findOrFail($id);
            $userEmail = $user->email;

            // Log it before deletion
            $this->auditLogService->log('user', 'user.deleted', [
                'severity' => 'warning',
                'subject_type' => 'user',
                'subject_id' => $user->id,
                'summary' => "Admin permanently deleted user {$userEmail}.",
            ]);

            $user->delete();

            return response()->json(['message' => 'User wiped successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete user.', 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get isolated soft-deleted users
     */
    public function getArchivedUsers()
    {
        $users = User::onlyTrashed()->orderBy('deleted_at', 'desc')->get();

        return response()->json($users);
    }

    /**
     * Restore a soft-deleted user
     */
    public function restoreUser(Request $request, $id)
    {
        try {
            $user = User::onlyTrashed()->findOrFail($id);
            $user->restore();

            return response()->json(['message' => 'User restored successfully', 'user' => $user]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to restore user', 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Permanently purge a soft-deleted user (hard delete)
     */
    public function purgeUser(Request $request, $id)
    {
        if ($request->has('password')) {
            if (! \Illuminate\Support\Facades\Hash::check($request->password, \Illuminate\Support\Facades\Auth::user()->password)) {
                return response()->json(['message' => 'Incorrect password.', 'error' => 'password_incorrect'], 422);
            }
        } else {
            return response()->json(['message' => 'Password is required for permanent deletion.'], 422);
        }

        try {
            $user = User::onlyTrashed()->findOrFail($id);
            $userId = $user->id;

            DB::transaction(function () use ($user, $userId) {
                // Manually clean up or nullify records that have RESTRICT foreign key constraints
                // 1. Bookings (Restrict) - we nullify to keep historical property/financial data link safely
                DB::table('bookings')->where('tenant_id', $userId)->update(['tenant_id' => null]);
                DB::table('bookings')->where('landlord_id', $userId)->update(['landlord_id' => null]);

                // 2. Reports (Restrict) - we nullify the reporter
                DB::table('reports')->where('reporter_id', $userId)->update(['reporter_id' => null]);

                // 3. User Logs / Audit Logs: Audit logs usually want to keep user IDs but might restrict
                // If there are other tables like tenant_profiles, they should cascade automatically if set in migration.
                
                // Finally, force delete the user record
                $user->forceDelete();
            });

            return response()->json(['message' => 'User permanently removed']);
        } catch (\Exception $e) {
            \Log::error("Failed to purge user {$id}: " . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to purge user', 'error' => $e->getMessage()], 422);
        }
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
     * Bulk approve properties
     */
    public function bulkApproveProperties(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:properties,id',
        ]);

        $properties = Property::whereIn('id', $request->ids)->get();
        $approvedCount = 0;

        foreach ($properties as $property) {
            if ($property->current_status !== Property::STATUS_ACTIVE) {
                $property->current_status = Property::STATUS_ACTIVE;
                $property->is_published = true;
                $property->is_available = true;
                $property->save();

                $property->updateAvailableRooms();

                $approvedCount++;
            }
        }

        return response()->json(['message' => "$approvedCount properties approved successfully"]);
    }

    /**
     * Bulk reject properties
     */
    public function bulkRejectProperties(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:properties,id',
        ]);

        $properties = Property::whereIn('id', $request->ids)->get();
        $rejectedCount = 0;

        foreach ($properties as $property) {
            if ($property->current_status !== Property::STATUS_INACTIVE) {
                $property->current_status = Property::STATUS_INACTIVE;
                $property->is_published = false;
                $property->is_available = false;
                $property->save();

                $property->updateAvailableRooms();

                $rejectedCount++;
            }
        }

        return response()->json(['message' => "$rejectedCount properties rejected successfully"]);
    }

    /**
     * Delete a property (Soft Delete)
     */
    public function deleteProperty(Request $request, $id)
    {
        if ($request->has('password')) {
            if (! Hash::check($request->password, Auth::user()->password)) {
                return response()->json(['message' => 'Incorrect password.', 'error' => 'password_incorrect'], 422);
            }
        } else {
            return response()->json(['message' => 'Password is required for deletion.'], 422);
        }

        try {
            $property = Property::findOrFail($id);
            $propertyService = app(PropertyService::class);
            $propertyService->safeSoftDeleteProperty($property, false);

            return response()->json(['message' => 'Property sent to archive']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete property', 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get archived properties
     */
    public function getArchivedProperties()
    {
        $properties = Property::onlyTrashed()
            ->with(['landlord' => function ($query) {
                $query->select('id', 'first_name', 'last_name');
            }])
            ->orderBy('deleted_at', 'desc')
            ->get();

        return response()->json($properties);
    }

    /**
     * Restore an archived property
     */
    public function restoreProperty(Request $request, $id)
    {
        try {
            $property = Property::onlyTrashed()->findOrFail($id);
            $property->restore();

            return response()->json(['message' => 'Property restored successfully', 'property' => $property]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to restore property', 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Purge a property completely
     */
    public function purgeProperty(Request $request, $id)
    {
        if ($request->has('password')) {
            if (! Hash::check($request->password, Auth::user()->password)) {
                return response()->json(['message' => 'Incorrect password.', 'error' => 'password_incorrect'], 422);
            }
        } else {
            return response()->json(['message' => 'Password is required for permanent deletion.'], 422);
        }

        try {
            $property = Property::onlyTrashed()->findOrFail($id);
            $propertyService = app(PropertyService::class);
            $propertyService->forceDeleteProperty($property);

            return response()->json(['message' => 'Property permanently removed']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to purge property', 'error' => $e->getMessage()], 422);
        }
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
            $normalizedStatus = strtolower((string) $property->current_status);
            $landlordName = trim(($property->landlord?->first_name ?? 'Unknown').' '.($property->landlord?->last_name ?? 'Landlord'));

            $activityMeta = match ($normalizedStatus) {
                Property::STATUS_PENDING => ['type' => 'property', 'title' => 'Property Submitted', 'badge' => 'Pending'],
                Property::STATUS_ACTIVE => ['type' => 'approval', 'title' => 'Property Approved', 'badge' => 'Approved'],
                Property::STATUS_INACTIVE => ['type' => 'rejection', 'title' => 'Property Rejected', 'badge' => 'Rejected'],
                Property::STATUS_MAINTENANCE => ['type' => 'property', 'title' => 'Property Put Under Maintenance', 'badge' => 'Maintenance'],
                Property::STATUS_DRAFT => ['type' => 'property', 'title' => 'Property Saved as Draft', 'badge' => 'Draft'],
                default => ['type' => 'property', 'title' => 'Property Updated', 'badge' => ucfirst($normalizedStatus !== '' ? $normalizedStatus : 'unknown')],
            };

            $activities[] = [
                'type' => $activityMeta['type'],
                'title' => $activityMeta['title'],
                'description' => $property->title.' by '.$landlordName,
                'timestamp' => ($property->updated_at ?? $property->created_at)?->toISOString(),
                'badge' => $activityMeta['badge'],
            ];
        }

        // Sort all activities by timestamp
        usort($activities, function ($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });

        // Return only the 10 most recent activities
        return response()->json(array_slice($activities, 0, 10));
    }

    /**
     * Enable PayMongo verification bypass for a specific landlord (for testing).
     */
    public function enablePaymongoBypass(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->role !== 'landlord') {
            return response()->json([
                'message' => 'Only landlord accounts can have PayMongo verification bypass enabled.',
            ], 422);
        }

        $user->paymongo_verification_bypass = true;
        $user->save();

        $this->auditLogService->log('user', 'user.paymongo_bypass_enabled', [
            'severity' => 'warning',
            'subject_type' => 'user',
            'subject_id' => $user->id,
            'summary' => sprintf('Admin enabled PayMongo verification bypass for %s (testing purposes).', $user->email),
            'metadata' => [
                'landlord_id' => $user->id,
                'reason' => 'testing',
            ],
        ]);

        return response()->json([
            'message' => 'PayMongo verification bypass enabled for testing.',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'paymongo_verification_bypass' => $user->paymongo_verification_bypass,
            ],
        ]);
    }

    /**
     * Disable PayMongo verification bypass for a specific landlord.
     */
    public function disablePaymongoBypass(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $user->paymongo_verification_bypass = false;
        $user->save();

        $this->auditLogService->log('user', 'user.paymongo_bypass_disabled', [
            'severity' => 'info',
            'subject_type' => 'user',
            'subject_id' => $user->id,
            'summary' => sprintf('Admin disabled PayMongo verification bypass for %s.', $user->email),
            'metadata' => [
                'landlord_id' => $user->id,
            ],
        ]);

        return response()->json([
            'message' => 'PayMongo verification bypass disabled.',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'paymongo_verification_bypass' => $user->paymongo_verification_bypass,
            ],
        ]);
    }
}
