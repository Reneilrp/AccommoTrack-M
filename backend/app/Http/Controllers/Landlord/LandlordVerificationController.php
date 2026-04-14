<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Models\LandlordVerification;
use App\Models\LandlordVerificationHistory;
use App\Models\User;
use App\Notifications\LandlordResubmittedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class LandlordVerificationController extends Controller
{
    public function store(Request $request)
    {
        // First validate everything
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'valid_id_type' => 'required|string|max:255',
            'valid_id_other' => 'nullable|string|max:255',
            'valid_id' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'valid_id_back' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'permit' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'agree' => 'accepted',
            'dob' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // Age validation
            $birthDate = \Carbon\Carbon::parse($request->dob);
            if ($birthDate->diffInYears(\Carbon\Carbon::now()) < 21) {
                return response()->json([
                    'message' => 'Registration failed: You must be at least 21 years old to register as a landlord.',
                    'errors' => ['dob' => ['Age restriction: Minimum 21 years old required.']],
                ], 422);
            }

            // 1. Create User
            $user = User::create([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'date_of_birth' => $request->dob,
                'password' => Hash::make($request->password),
                'role' => 'landlord',
                'is_active' => true,
                'is_verified' => false, // Set to false until admin approves
            ]);

            // 2. Store files
            $validIdPath = $request->file('valid_id')->store('landlord_ids');
            $permitPath = $request->file('permit')->store('landlord_permits');
            $validIdBackPath = $request->hasFile('valid_id_back')
                ? $request->file('valid_id_back')->store('landlord_ids')
                : null;

            // 3. Create Verification Record
            $verification = LandlordVerification::create([
                'user_id' => $user->id,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'valid_id_type' => $request->valid_id_type,
                'valid_id_other' => $request->valid_id_other,
                'valid_id_path' => $validIdPath,
                'valid_id_back_path' => $validIdBackPath,
                'permit_path' => $permitPath,
                'status' => 'pending',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Registration successful. Please wait for verification.',
                'user' => $user,
                'verification' => $verification,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            // Delete uploaded files if transaction failed
            if (isset($validIdPath)) {
                Storage::delete($validIdPath);
            }
            if (isset($permitPath)) {
                Storage::delete($permitPath);
            }
            if (isset($validIdBackPath) && $validIdBackPath) {
                Storage::delete($validIdBackPath);
            }

            return response()->json(['message' => 'Registration failed: '.$e->getMessage()], 500);
        }
    }

    public function index()
    {
        // For admin: list all landlord verifications with user info
        $verifications = LandlordVerification::with([
            'user',
            'history' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
        ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (LandlordVerification $verification) {
                $payload = $verification->toArray();
                $payload['valid_id_path'] = $this->toPublicStorageUrl($verification->valid_id_path);
                $payload['valid_id_back_path'] = $this->toPublicStorageUrl($verification->valid_id_back_path);
                $payload['permit_path'] = $this->toPublicStorageUrl($verification->permit_path);
                $payload['history'] = $verification->history->map(function (LandlordVerificationHistory $entry) {
                    return [
                        'id' => $entry->id,
                        'status' => $entry->status,
                        'rejection_reason' => $entry->rejection_reason,
                        'valid_id_type' => $entry->valid_id_type,
                        'valid_id_path' => $this->toPublicStorageUrl($entry->valid_id_path),
                        'valid_id_back_path' => $this->toPublicStorageUrl($entry->valid_id_back_path),
                        'permit_path' => $this->toPublicStorageUrl($entry->permit_path),
                        'submitted_at' => $entry->submitted_at,
                        'reviewed_at' => $entry->reviewed_at,
                    ];
                })->values();

                return $payload;
            });

        return response()->json($verifications);
    }

    public function getValidIdTypes()
    {
        $types = [
            'Philippine Passport',
            "Driver's License",
            'PhilSys ID (National ID)',
            'Unified Multi-Purpose ID (UMID)',
            'Professional Regulation Commission (PRC) ID',
            'Postal ID (Digitized)',
            "Voter's ID",
            'Taxpayer Identification Number (TIN) ID',
            'PhilHealth ID',
            'Senior Citizen ID',
            'Overseas Workers Welfare Administration (OWWA) / OFW ID',
        ];

        return response()->json($types);
    }

    // Admin helper to retrieve/approve
    public function getMyVerification()
    {
        $user = Auth::user();
        $landlord = $user->fresh();

        $verification = LandlordVerification::with(['history' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }, 'reviewer:id,first_name,last_name'])
            ->where('user_id', $user->id)
            ->first();

        $effectiveStatus = $this->resolveEffectiveLandlordStatus($verification, $landlord);

        if (! $verification) {
            if ($landlord->role === 'landlord') {
                $isFullyVerified = (bool) ($landlord->is_verified ?? false);

                return response()->json([
                    'message' => $isFullyVerified
                        ? 'Your landlord account is verified.'
                        : 'Your account is awaiting admin partial verification.',
                    'status' => $effectiveStatus,
                    'user' => [
                        'is_verified' => $isFullyVerified,
                    ],
                    'valid_id_path' => null,
                    'valid_id_back_path' => null,
                    'permit_path' => null,
                    'document_due_at' => null,
                    'history' => [],
                ]);
            }

            return response()->json([
                'message' => 'No verification record found',
                'status' => 'not_submitted',
            ]);
        }

        return response()->json([
            'id' => $verification->id,
            'status' => $effectiveStatus,
            'raw_status' => $verification->status,
            'rejection_reason' => $verification->rejection_reason,
            'valid_id_type' => $verification->valid_id_type,
            'valid_id_path' => $this->toPublicStorageUrl($verification->valid_id_path),
            'valid_id_back_path' => $this->toPublicStorageUrl($verification->valid_id_back_path),
            'permit_path' => $this->toPublicStorageUrl($verification->permit_path),
            'document_due_at' => $verification->document_due_at,
            'reviewed_at' => $verification->reviewed_at,
            'reviewer' => $verification->reviewer ? [
                'name' => trim($verification->reviewer->first_name.' '.$verification->reviewer->last_name),
            ] : null,
            'created_at' => $verification->created_at,
            'updated_at' => $verification->updated_at,
            'history' => $verification->history->map(function ($h) {
                return [
                    'id' => $h->id,
                    'status' => $h->status,
                    'rejection_reason' => $h->rejection_reason,
                    'valid_id_type' => $h->valid_id_type,
                    'valid_id_path' => $this->toPublicStorageUrl($h->valid_id_path),
                    'valid_id_back_path' => $this->toPublicStorageUrl($h->valid_id_back_path),
                    'permit_path' => $this->toPublicStorageUrl($h->permit_path),
                    'submitted_at' => $h->submitted_at,
                    'reviewed_at' => $h->reviewed_at,
                ];
            }),
            'user' => [
                'is_verified' => $landlord->is_verified ?? false,
            ],
        ]);
    }

    private function resolveEffectiveLandlordStatus(?LandlordVerification $verification, User $user): string
    {
        if ((bool) ($user->is_verified ?? false)) {
            return LandlordVerification::STATUS_APPROVED;
        }

        if (! $verification) {
            return $user->role === 'landlord'
                ? LandlordVerification::STATUS_PENDING
                : 'not_submitted';
        }

        $status = strtolower(trim((string) $verification->status));

        if ($status === LandlordVerification::STATUS_VERIFIED) {
            return LandlordVerification::STATUS_APPROVED;
        }

        return $status !== '' ? $status : LandlordVerification::STATUS_PENDING;
    }

    /**
     * Get verification history for current landlord
     */
    public function getVerificationHistory()
    {
        $user = Auth::user();

        $verification = LandlordVerification::where('user_id', $user->id)->first();

        if (! $verification) {
            return response()->json([]);
        }

        $history = LandlordVerificationHistory::where('landlord_verification_id', $verification->id)
            ->with('reviewer:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($h) {
                return [
                    'id' => $h->id,
                    'status' => $h->status,
                    'rejection_reason' => $h->rejection_reason,
                    'valid_id_type' => $h->valid_id_type,
                    'valid_id_path' => $this->toPublicStorageUrl($h->valid_id_path),
                    'valid_id_back_path' => $this->toPublicStorageUrl($h->valid_id_back_path),
                    'permit_path' => $this->toPublicStorageUrl($h->permit_path),
                    'submitted_at' => $h->submitted_at,
                    'reviewed_at' => $h->reviewed_at,
                    'reviewer' => $h->reviewer ? trim($h->reviewer->first_name.' '.$h->reviewer->last_name) : null,
                ];
            });

        return response()->json($history);
    }

    /**
     * Tenant landlord registration flow.
     * Submits or re-submits landlord verification without switching roles immediately.
     */
    public function registerFromTenant(Request $request)
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'tenant') {
            return response()->json([
                'message' => 'Only tenant accounts can register as landlord from this flow.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'valid_id_type' => 'required|string|max:255',
            'valid_id_other' => 'required_if:valid_id_type,Other,other|nullable|string|max:255',
            'valid_id_front' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'valid_id_back' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'permit' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if (! $user->date_of_birth) {
            return response()->json([
                'message' => 'Date of birth is missing from your tenant account. Please update your profile before registering as landlord.',
                'errors' => ['dob' => ['Date of birth is required in your profile.']],
            ], 422);
        }

        if (! $user->first_name || ! $user->last_name) {
            return response()->json([
                'message' => 'Your tenant profile is incomplete. Please update your name before registering as landlord.',
                'errors' => ['first_name' => ['First and last name are required in your profile.']],
            ], 422);
        }

        $birthDate = \Carbon\Carbon::parse($user->date_of_birth);
        if ($birthDate->diffInYears(\Carbon\Carbon::now()) < 21) {
            return response()->json([
                'message' => 'You must be at least 21 years old to register as a landlord.',
                'errors' => ['dob' => ['Age restriction: Minimum 21 years old required.']],
            ], 422);
        }

        $verification = LandlordVerification::where('user_id', $user->id)->first();

        if ($verification && $verification->status === LandlordVerification::STATUS_APPROVED) {
            return response()->json([
                'message' => 'Your landlord application is already approved. You can switch to landlord mode now.',
                'status' => 'approved',
            ], 409);
        }

        if ($verification && in_array($verification->status, [
            LandlordVerification::STATUS_PENDING,
            LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW,
        ], true)) {
            return response()->json([
                'message' => 'Your landlord application is currently under review.',
                'status' => $verification->status,
            ], 409);
        }

        try {
            DB::beginTransaction();

            $validIdPath = $request->file('valid_id_front')->store('landlord_ids');
            $validIdBackPath = $request->hasFile('valid_id_back')
                ? $request->file('valid_id_back')->store('landlord_ids')
                : null;
            $permitPath = $request->file('permit')->store('landlord_permits');

            $validIdType = $request->valid_id_type;
            $validIdOther = in_array(strtolower((string) $validIdType), ['other'], true)
                ? $request->valid_id_other
                : null;

            if ($verification) {
                $this->snapshotVerificationHistory($verification);

                $verification->forceFill([
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'valid_id_type' => $validIdType,
                    'valid_id_other' => $validIdOther,
                    'valid_id_path' => $validIdPath,
                    'valid_id_back_path' => $validIdBackPath,
                    'permit_path' => $permitPath,
                    'status' => LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW,
                    'rejection_reason' => null,
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'document_due_at' => null,
                ])->save();
            } else {
                $verification = LandlordVerification::create([
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'valid_id_type' => $validIdType,
                    'valid_id_other' => $validIdOther,
                    'valid_id_path' => $validIdPath,
                    'valid_id_back_path' => $validIdBackPath,
                    'permit_path' => $permitPath,
                    'status' => LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW,
                    'document_due_at' => null,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Landlord registration submitted successfully. Please wait for admin review.',
                'status' => $verification->status,
                'verification' => [
                    'id' => $verification->id,
                    'status' => $verification->status,
                    'valid_id_type' => $verification->valid_id_type,
                    'updated_at' => $verification->updated_at,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            if (isset($validIdPath)) {
                Storage::delete($validIdPath);
            }
            if (isset($permitPath)) {
                Storage::delete($permitPath);
            }
            if (isset($validIdBackPath) && $validIdBackPath) {
                Storage::delete($validIdBackPath);
            }

            return response()->json([
                'message' => 'Landlord registration failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resubmit verification documents after rejection
     */
    public function resubmit(Request $request)
    {
        $user = Auth::user();

        // Check age verification
        if ($user->date_of_birth) {
            $age = \Carbon\Carbon::parse($user->date_of_birth)->age;
            if ($age < 21) {
                return response()->json([
                    'message' => 'You must be at least 21 years old to become a landlord.',
                ], 403);
            }
        } else {
            return response()->json([
                'message' => 'Date of birth is required to become a landlord. Please update your profile.',
            ], 403);
        }

        $verification = LandlordVerification::where('user_id', $user->id)->first();

        // Allow re-upload when rejected, or when partially verified and waiting for docs.
        if ($verification && ! in_array($verification->status, [
            LandlordVerification::STATUS_REJECTED,
            LandlordVerification::STATUS_PARTIAL_VERIFIED,
        ], true)) {
            return response()->json([
                'message' => 'Document submission is only available after rejection or partial verification.',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'valid_id_type' => 'required|string|max:255',
            'valid_id_other' => 'nullable|string|max:255',
            'valid_id' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'valid_id_back' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'permit' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Store new files
            $validIdPath = $request->file('valid_id')->store('landlord_ids');
            $validIdBackPath = $request->hasFile('valid_id_back')
                ? $request->file('valid_id_back')->store('landlord_ids')
                : null;
            $permitPath = $request->file('permit')->store('landlord_permits');

            if ($verification) {
                $this->snapshotVerificationHistory($verification);

                // Update verification record with new documents
                $verification->valid_id_type = $request->valid_id_type;
                $verification->valid_id_other = $request->valid_id_other;
                $verification->valid_id_path = $validIdPath;
                $verification->valid_id_back_path = $validIdBackPath;
                $verification->permit_path = $permitPath;
                $verification->status = LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW;
                $verification->rejection_reason = null;
                $verification->reviewed_at = null;
                $verification->reviewed_by = null;
                $verification->document_due_at = null;
                $verification->save();
            } else {
                // Create new verification record
                $verification = LandlordVerification::create([
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'valid_id_type' => $request->valid_id_type,
                    'valid_id_other' => $request->valid_id_other,
                    'valid_id_path' => $validIdPath,
                    'valid_id_back_path' => $validIdBackPath,
                    'permit_path' => $permitPath,
                    'status' => LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW,
                    'document_due_at' => null,
                ]);
            }

            DB::commit();

            // Notify admins about resubmission
            try {
                $admins = User::where('role', 'admin')->get();
                foreach ($admins as $admin) {
                    /** @var User $admin */
                    $admin->notify(new LandlordResubmittedNotification($user));
                }
            } catch (\Exception $e) {
                \Log::error('Failed to send resubmission notification to admins: '.$e->getMessage());
            }

            return response()->json([
                'message' => 'Documents resubmitted successfully. Please wait for review.',
                'verification' => [
                    'id' => $verification->id,
                    'status' => $verification->status,
                    'valid_id_type' => $verification->valid_id_type,
                    'updated_at' => $verification->updated_at,
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            // Delete uploaded files if transaction failed
            if (isset($validIdPath)) {
                Storage::delete($validIdPath);
            }
            if (isset($permitPath)) {
                Storage::delete($permitPath);
            }
            if (isset($validIdBackPath) && $validIdBackPath) {
                Storage::delete($validIdBackPath);
            }

            return response()->json(['message' => 'Resubmission failed: '.$e->getMessage()], 500);
        }
    }

    private function toPublicStorageUrl(?string $path): ?string
    {
        if (! is_string($path) || trim($path) === '') {
            return null;
        }

        $cleanPath = trim($path);

        if (str_starts_with($cleanPath, 'http://') || str_starts_with($cleanPath, 'https://')) {
            return $cleanPath;
        }

        $cleanPath = ltrim($cleanPath, '/');
        if (str_starts_with($cleanPath, 'storage/')) {
            $cleanPath = substr($cleanPath, strlen('storage/'));
        }

        return Storage::url($cleanPath);
    }

    private function snapshotVerificationHistory(LandlordVerification $verification): void
    {
        // Keep prior submissions accessible for admin-side first-vs-current comparison.
        if (! $verification->valid_id_path && ! $verification->permit_path) {
            return;
        }

        $latestHistory = LandlordVerificationHistory::where('landlord_verification_id', $verification->id)
            ->latest('id')
            ->first();

        if (
            $latestHistory
            && $latestHistory->valid_id_path === ($verification->valid_id_path ?? '')
            && ($latestHistory->valid_id_back_path ?? null) === ($verification->valid_id_back_path ?? null)
            && $latestHistory->permit_path === ($verification->permit_path ?? '')
            && $latestHistory->status === $verification->status
            && $latestHistory->rejection_reason === $verification->rejection_reason
        ) {
            return;
        }

        LandlordVerificationHistory::create([
            'landlord_verification_id' => $verification->id,
            'valid_id_type' => $verification->valid_id_type,
            'valid_id_other' => $verification->valid_id_other,
            'valid_id_path' => $verification->valid_id_path ?? '',
            'valid_id_back_path' => $verification->valid_id_back_path,
            'permit_path' => $verification->permit_path ?? '',
            'status' => $verification->status,
            'rejection_reason' => $verification->rejection_reason,
            'submitted_at' => $verification->updated_at ?? $verification->created_at,
            'reviewed_at' => now(),
            'reviewed_by' => Auth::id(),
        ]);
    }
}
