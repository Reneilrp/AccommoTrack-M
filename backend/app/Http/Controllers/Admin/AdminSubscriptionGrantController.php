<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionGrant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Subscription\SubscriptionGrantService;
use App\Services\Subscription\SubscriptionResolverService;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AdminSubscriptionGrantController extends Controller
{
    public function __construct(
        private readonly SubscriptionGrantService $subscriptionGrantService,
        private readonly SubscriptionResolverService $subscriptionResolverService,
    ) {
    }

    public function grant(Request $request)
    {
        $validated = $request->validate([
            'landlord_id' => 'required|integer|exists:users,id',
            'plan_id' => 'required|integer|exists:subscription_plans,id',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date',
            'duration_months' => 'nullable|integer|min:1|max:120',
            'auto_renew' => 'nullable|boolean',
            'notes' => 'nullable|string|max:2000',
        ]);

        $hasEndsAt = array_key_exists('ends_at', $validated) && ! empty($validated['ends_at']);
        $hasDurationMonths = array_key_exists('duration_months', $validated) && ! empty($validated['duration_months']);

        if ($hasEndsAt === $hasDurationMonths) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Provide exactly one of duration_months or ends_at.',
            ], 422);
        }

        $landlord = User::query()
            ->where('id', $validated['landlord_id'])
            ->where('role', 'landlord')
            ->first();

        if (! $landlord) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Target user must be a landlord.',
            ], 422);
        }

        $plan = SubscriptionPlan::query()->findOrFail($validated['plan_id']);

        try {
            $result = $this->subscriptionGrantService->grantPlan(
                $landlord,
                $plan,
                $request->user(),
                $validated,
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Subscription grant created successfully.',
            ], 201);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (\Throwable $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to create subscription grant: '.$exception->getMessage(),
            ], 500);
        }
    }

    public function overview(Request $request, int $landlordId)
    {
        $landlord = User::query()
            ->where('id', $landlordId)
            ->where('role', 'landlord')
            ->first();

        if (! $landlord) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Landlord not found.',
            ], 404);
        }

        $current = $this->subscriptionResolverService->getCurrentSubscriptionBundle($landlord);
        $timeline = $this->subscriptionGrantService->getLandlordTimeline($landlord);

        return response()->json([
            'success' => true,
            'data' => [
                'landlord' => [
                    'id' => $landlord->id,
                    'name' => $landlord->full_name,
                    'email' => $landlord->email,
                ],
                'current' => $current,
                'timeline' => $timeline,
            ],
            'message' => '',
        ]);
    }

    public function extend(Request $request, int $grantId)
    {
        $validated = $request->validate([
            'add_months' => 'nullable|integer|min:1|max:120',
            'ends_at' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $hasEndsAt = array_key_exists('ends_at', $validated) && ! empty($validated['ends_at']);
        $hasAddMonths = array_key_exists('add_months', $validated) && ! empty($validated['add_months']);

        if ($hasEndsAt === $hasAddMonths) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Provide exactly one of add_months or ends_at.',
            ], 422);
        }

        $grant = SubscriptionGrant::query()->with(['plan', 'subscription'])->findOrFail($grantId);

        try {
            $result = $this->subscriptionGrantService->extendGrant($grant, $request->user(), $validated);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Subscription grant updated successfully.',
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (\Throwable $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to update subscription grant: '.$exception->getMessage(),
            ], 500);
        }
    }

    public function revoke(Request $request, int $grantId)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $grant = SubscriptionGrant::query()->with(['plan', 'subscription'])->findOrFail($grantId);

        try {
            $result = $this->subscriptionGrantService->revokeGrant(
                $grant,
                $request->user(),
                $validated['reason'] ?? null,
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Subscription grant revoked successfully.',
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to revoke subscription grant: '.$exception->getMessage(),
            ], 500);
        }
    }
}
