<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Http\Resources\AddonResource;
use App\Models\Addon;
use App\Models\Booking;
use App\Services\AddonService;
use App\Services\UserCounterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class AddonController extends Controller
{
    use ResolvesLandlordAccess;

    protected AddonService $addonService;
    protected UserCounterService $counterService;

    private function extractSuggestedPriceFromNote(?string $note): ?float
    {
        if (! is_string($note) || trim($note) === '') {
            return null;
        }

        if (! preg_match('/suggested\s*price\s*:\s*₱?\s*([\d,]+(?:\.\d+)?)/i', $note, $matches)) {
            return null;
        }

        $rawValue = str_replace(',', '', $matches[1] ?? '');
        if ($rawValue === '' || ! is_numeric($rawValue)) {
            return null;
        }

        $price = (float) $rawValue;

        return $price > 0 ? $price : null;
    }

    public function __construct(AddonService $addonService, UserCounterService $counterService)
    {
        $this->addonService = $addonService;
        $this->counterService = $counterService;
    }

    private function resolveAddonPropertyContext(Request $request, int $propertyId, string $permissionColumn = 'can_view_properties'): array
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, $permissionColumn);
        $this->checkPropertyAccess($context, $propertyId);

        return $context;
    }

    /**
     * Get all addons for a property (Landlord/Caretaker)
     */
    public function index(Request $request, $propertyId)
    {
        try {
            $this->resolveAddonPropertyContext($request, (int) $propertyId);

            $addons = Addon::where('property_id', $propertyId)
                ->orderBy('name')
                ->get();

            return response()->json([
                'addons' => AddonResource::collection($addons)->resolve(),
            ], 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch addons',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new addon for a property (Landlord/Caretaker)
     */
    public function store(Request $request, $propertyId)
    {
        try {
            $this->resolveAddonPropertyContext($request, (int) $propertyId, 'can_manage_add_ons');

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'price' => 'required|numeric|min:0',
                'price_type' => 'required|in:one_time,monthly',
                'addon_type' => 'required|in:rental,fee',
                'stock' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ]);

            if (isset($validated['price'])) {
                $validated['price_cents'] = (int) round($validated['price'] * 100);
                unset($validated['price']);
            }

            $addon = $this->addonService->createAddon($propertyId, $validated);

            return response()->json([
                'message' => 'Addon created successfully',
                'addon' => (new AddonResource($addon))->resolve(),
            ], 201);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create addon',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an addon (Landlord/Caretaker)
     */
    public function update(Request $request, $propertyId, $addonId)
    {
        try {
            $this->resolveAddonPropertyContext($request, (int) $propertyId, 'can_manage_add_ons');

            $addon = Addon::where('id', $addonId)
                ->where('property_id', $propertyId)
                ->firstOrFail();

            $validated = $request->validate([
                'name' => 'string|max:255',
                'description' => 'nullable|string|max:1000',
                'price' => 'numeric|min:0',
                'price_type' => 'in:one_time,monthly',
                'addon_type' => 'in:rental,fee',
                'stock' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ]);

            if (isset($validated['price'])) {
                $validated['price_cents'] = (int) round($validated['price'] * 100);
                unset($validated['price']);
            }

            $addon = $this->addonService->updateAddon($addon, $validated);

            return response()->json([
                'message' => 'Addon updated successfully',
                'addon' => (new AddonResource($addon))->resolve(),
            ], 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update addon',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an addon (Landlord/Caretaker)
     */
    public function destroy(Request $request, $propertyId, $addonId)
    {
        try {
            $this->resolveAddonPropertyContext($request, (int) $propertyId, 'can_manage_add_ons');

            $addon = Addon::where('id', $addonId)
                ->where('property_id', $propertyId)
                ->firstOrFail();

            $this->addonService->deleteAddon($addon);

            return response()->json([
                'message' => 'Addon deleted successfully',
            ], 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete addon',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get pending addon requests for a property (Landlord/Caretaker)
     */
    public function getPendingRequests(Request $request, $propertyId)
    {
        try {
            $this->resolveAddonPropertyContext($request, (int) $propertyId);

            $pendingRequests = DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
                ->join('users', 'bookings.tenant_id', '=', 'users.id')
                ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
                ->where('addons.property_id', $propertyId)
                ->where('booking_addons.status', 'pending')
                ->select([
                    'booking_addons.id as request_id',
                    'booking_addons.booking_id',
                    'booking_addons.addon_id',
                    'booking_addons.quantity',
                    'booking_addons.price_at_booking_cents',
                    'addons.price_cents as current_price_cents',
                    'booking_addons.request_note',
                    'booking_addons.created_at as requested_at',
                    'addons.name as addon_name',
                    'addons.price_type',
                    'addons.addon_type',
                    'addons.stock',
                    'users.first_name as tenant_first_name',
                    'users.last_name as tenant_last_name',
                    'users.email as tenant_email',
                    'rooms.room_number',
                ])
                ->orderBy('booking_addons.created_at', 'asc')
                ->get();

            return response()->json([
                'pendingRequests' => $pendingRequests->map(function ($request) {
                    $price = (float) ($request->price_at_booking_cents / 100);
                    if ($price <= 0) {
                        $currentPriceCents = (int) ($request->current_price_cents ?? 0);
                        if ($currentPriceCents > 0) {
                            $price = (float) ($currentPriceCents / 100);
                        }
                    }

                    if ($price <= 0) {
                        $suggestedPrice = $this->extractSuggestedPriceFromNote($request->request_note ?? null);
                        if (! is_null($suggestedPrice) && $suggestedPrice > 0) {
                            $price = $suggestedPrice;
                        }
                    }

                    return [
                        'requestId' => $request->request_id,
                        'bookingId' => $request->booking_id,
                        'addonId' => $request->addon_id,
                        'addonName' => $request->addon_name,
                        'quantity' => $request->quantity,
                        'price' => $price,
                        'priceType' => $request->price_type,
                        'addonType' => $request->addon_type,
                        'stock' => $request->stock,
                        'requestNote' => $request->request_note,
                        'requestedAt' => $request->requested_at,
                        'tenant' => [
                            'name' => $request->tenant_first_name.' '.$request->tenant_last_name,
                            'email' => $request->tenant_email,
                        ],
                        'roomNumber' => $request->room_number,
                    ];
                }),
            ], 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch pending requests',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve or reject an addon request (Landlord/Caretaker)
     */
    public function handleRequest(Request $request, $bookingId, $addonId)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_add_ons');

            $validated = $request->validate([
                'action' => 'required|in:approve,reject',
                'note' => 'nullable|string|max:500',
                'approved_price' => 'nullable|numeric|min:0',
                'custom_price' => 'nullable|numeric|min:0',
            ]);

            // Get booking and verify access
            $booking = Booking::where('id', $bookingId)
                ->where('landlord_id', $context['landlord_id'])
                ->firstOrFail();

            if ($context['is_caretaker']) {
                $this->checkPropertyAccess($context, (int) $booking->property_id);
            }

            // Use custom_price if provided, otherwise use approved_price
            $approvedPrice = null;
            if (array_key_exists('custom_price', $validated) && $validated['custom_price'] !== null) {
                $approvedPrice = (float) $validated['custom_price'];
            } elseif (array_key_exists('approved_price', $validated)) {
                $approvedPrice = (float) $validated['approved_price'];
            }

            $result = $this->addonService->handleRequest(
                $booking,
                $addonId,
                $validated['action'],
                $validated['note'] ?? null,
                $context['user']->id,
                $approvedPrice
            );

            // BROADCAST COUNTERS
            $this->counterService->broadcastCounters((int) $context['landlord_id']);

            return response()->json($result, 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to handle addon request',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all active addons across all bookings for a property (Landlord overview)
     */
    public function getActiveAddons(Request $request, $propertyId)
    {
        try {
            $this->resolveAddonPropertyContext($request, (int) $propertyId);

            $activeAddons = DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
                ->join('users', 'bookings.tenant_id', '=', 'users.id')
                ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
                ->where('addons.property_id', $propertyId)
                ->whereIn('booking_addons.status', ['active', 'approved'])
                ->whereIn('bookings.status', ['confirmed', 'completed', 'partial-completed'])
                ->select([
                    'booking_addons.id as request_id',
                    'booking_addons.booking_id',
                    'booking_addons.addon_id',
                    'booking_addons.quantity',
                    'booking_addons.price_at_booking_cents',
                    'addons.price_cents as current_price_cents',
                    'booking_addons.status',
                    'booking_addons.approved_at',
                    'addons.name as addon_name',
                    'addons.price_type',
                    'addons.addon_type',
                    DB::raw("CONCAT(users.first_name, ' ', users.last_name) as tenant_name"),
                    'rooms.room_number',
                ])
                ->orderBy('booking_addons.approved_at', 'desc')
                ->get();

            // Calculate monthly revenue from addons
            $monthlyRevenue = $activeAddons
                ->where('price_type', 'monthly')
                ->sum(function ($item) {
                    $price = (float) ($item->price_at_booking_cents / 100);
                    if ($price <= 0 && $item->current_price_cents > 0) {
                        $price = (float) ($item->current_price_cents / 100);
                    }

                    return $price * $item->quantity;
                });

            return response()->json([
                'activeAddons' => $activeAddons->map(function ($item) {
                    $price = (float) ($item->price_at_booking_cents / 100);
                    if ($price <= 0 && $item->current_price_cents > 0) {
                        $price = (float) ($item->current_price_cents / 100);
                    }

                    return [
                        'requestId' => $item->request_id,
                        'bookingId' => $item->booking_id,
                        'addonId' => $item->addon_id,
                        'addonName' => $item->addon_name,
                        'quantity' => $item->quantity,
                        'price' => $price,
                        'priceType' => $item->price_type,
                        'addonType' => $item->addon_type,
                        'status' => $item->status,
                        'approvedAt' => $item->approved_at,
                        'tenantName' => $item->tenant_name,
                        'roomNumber' => $item->room_number,
                    ];
                }),
                'summary' => [
                    'totalActive' => $activeAddons->count(),
                    'monthlyRevenue' => (float) $monthlyRevenue,
                ],
            ], 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch active addons',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update price for an active addon (Landlord/Caretaker)
     * Changes will apply to next billing cycle
     */
    public function updateActiveAddonPrice(Request $request, $bookingId, $addonId)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_manage_add_ons');

            $validated = $request->validate([
                'new_price' => 'required|numeric|min:0',
            ]);

            // Get booking and verify access
            $booking = Booking::where('id', $bookingId)
                ->where('landlord_id', $context['landlord_id'])
                ->firstOrFail();

            if ($context['is_caretaker']) {
                $this->checkPropertyAccess($context, (int) $booking->property_id);
            }

            // Get the booking_addon record
            $bookingAddon = DB::table('booking_addons')
                ->where('booking_id', $bookingId)
                ->where('addon_id', $addonId)
                ->whereIn('status', ['active', 'approved'])
                ->first();

            if (! $bookingAddon) {
                return response()->json([
                    'message' => 'Active addon not found',
                ], 404);
            }

            // Update the price_at_booking field
            // Note: In a production system, you might want to:
            // 1. Store this in a separate "scheduled_price_changes" table
            // 2. Apply it during next invoice generation
            // For now, we'll update it immediately with a note
            DB::table('booking_addons')
                ->where('id', $bookingAddon->id)
                ->update([
                    'price_at_booking' => (float) $validated['new_price'],
                    'price_at_booking_cents' => (int) round($validated['new_price'] * 100),
                    'updated_at' => now(),
                ]);

            return response()->json([
                'message' => 'Price updated successfully. Changes will apply to next billing cycle.',
                'new_price' => $validated['new_price'],
            ], 200);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update addon price',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
