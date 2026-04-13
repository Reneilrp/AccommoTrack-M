<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\LandlordSubscription;
use App\Models\User;
use App\Services\Subscription\SubscriptionCheckoutService;
use App\Services\Subscription\SubscriptionResolverService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class LandlordSubscriptionController extends Controller
{
    use ResolvesLandlordAccess;

    public function __construct(
        private readonly SubscriptionResolverService $subscriptionResolverService,
        private readonly SubscriptionCheckoutService $subscriptionCheckoutService,
    ) {
    }

    public function plans(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_payments');

            $plans = $this->subscriptionResolverService->getPlanCatalog(true)->values();

            return response()->json([
                'success' => true,
                'data' => $plans,
                'message' => '',
            ]);
        } catch (AccessDeniedHttpException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function current(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_payments');

            $landlord = User::query()->findOrFail($context['landlord_id']);
            $bundle = $this->subscriptionResolverService->getCurrentSubscriptionBundle($landlord);

            return response()->json([
                'success' => true,
                'data' => $bundle,
                'message' => '',
            ]);
        } catch (AccessDeniedHttpException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function usage(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_payments');

            $landlord = User::query()->findOrFail($context['landlord_id']);
            $usage = $this->subscriptionResolverService->getUsageSummary($landlord);

            return response()->json([
                'success' => true,
                'data' => $usage,
                'message' => '',
            ]);
        } catch (AccessDeniedHttpException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function checkout(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_payments');

            $validated = $request->validate([
                'plan_id' => 'required|integer|exists:subscription_plans,id',
                'billing_cycle' => 'required|string|in:monthly,annual',
                'auto_renew' => 'nullable|boolean',
            ]);

            $landlord = User::query()->findOrFail($context['landlord_id']);
            $plan = $this->subscriptionResolverService
                ->getPlanCatalog(false)
                ->firstWhere('id', (int) $validated['plan_id']);

            if (! $plan) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Selected subscription plan was not found.',
                ], 404);
            }

            $result = $this->subscriptionCheckoutService->checkout(
                landlord: $landlord,
                plan: $plan,
                billingCycle: (string) $validated['billing_cycle'],
                attributes: $validated,
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => $result['payment_required']
                    ? 'Subscription checkout created. Complete PayMongo payment to activate the plan.'
                    : 'Plan activated successfully.',
            ], 201);
        } catch (AccessDeniedHttpException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 403);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function checkoutPayment(Request $request, int $subscriptionId)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_payments');

            $validated = $request->validate([
                'method' => 'nullable|string|in:qrph',
                'return_url' => 'nullable|url',
            ]);

            $landlord = User::query()->findOrFail($context['landlord_id']);
            $subscription = LandlordSubscription::query()
                ->where('id', $subscriptionId)
                ->where('landlord_id', $landlord->id)
                ->firstOrFail();

            $result = $this->subscriptionCheckoutService->initiateCheckoutPayment(
                landlord: $landlord,
                subscription: $subscription,
                method: (string) ($validated['method'] ?? 'qrph'),
                returnUrl: $validated['return_url'] ?? null,
            );

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Checkout link is ready. Complete PayMongo payment to activate the plan.',
            ]);
        } catch (AccessDeniedHttpException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 403);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function syncCheckout(Request $request, int $subscriptionId)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_payments');

            $landlord = User::query()->findOrFail($context['landlord_id']);
            $subscription = LandlordSubscription::query()
                ->where('id', $subscriptionId)
                ->where('landlord_id', $landlord->id)
                ->firstOrFail();

            $result = $this->subscriptionCheckoutService->syncCheckoutStatus($landlord, $subscription);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => $result['payment_required']
                    ? 'Checkout is still waiting for payment confirmation.'
                    : 'Checkout synchronization complete.',
            ]);
        } catch (AccessDeniedHttpException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 403);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }
}
