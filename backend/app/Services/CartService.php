<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Property;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CartService
{
    protected BookingService $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    /**
     * Get or create active cart for user and property
     */
    public function getOrCreateCart(int $userId, int $propertyId): Cart
    {
        $cart = Cart::where('user_id', $userId)
            ->where('property_id', $propertyId)
            ->active()
            ->first();

        if (! $cart) {
            $cart = Cart::create([
                'user_id' => $userId,
                'property_id' => $propertyId,
                'status' => 'active',
                'expires_at' => now()->addHours(24), // Cart expires in 24 hours
            ]);
        }

        return $cart;
    }

    /**
     * Add item to cart
     */
    public function addItem(int $userId, array $data): CartItem
    {
        $room = Room::with('property')->findOrFail($data['room_id']);
        $cart = $this->getOrCreateCart($userId, $room->property_id);

        // Check if item already exists in cart
        $existingItem = $cart->items()
            ->where('room_id', $data['room_id'])
            ->where('start_date', $data['start_date'])
            ->first();

        if ($existingItem) {
            throw new \DomainException('This room is already in your cart with the same dates.');
        }

        // Calculate price snapshot
        $priceSnapshot = $this->calculatePrice($room, $data);

        $item = $cart->items()->create([
            'room_id' => $data['room_id'],
            'bed_count' => $data['bed_count'] ?? 1,
            'bed_numbers' => $data['bed_numbers'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'] ?? null,
            'contract_mode' => $data['contract_mode'] ?? 'monthly',
            'payment_plan' => $data['payment_plan'] ?? 'monthly',
            'price_snapshot' => $priceSnapshot,
            'occupants' => $data['occupants'] ?? null,
            'addons' => $data['addons'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        return $item->load('room');
    }

    /**
     * Remove item from cart
     */
    public function removeItem(int $userId, int $itemId): bool
    {
        $item = CartItem::whereHas('cart', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })->findOrFail($itemId);

        return $item->delete();
    }

    /**
     * Update cart item
     */
    public function updateItem(int $userId, int $itemId, array $data): CartItem
    {
        $item = CartItem::with('room')->whereHas('cart', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })->findOrFail($itemId);

        // Recalculate price if dates or bed count changed
        if (isset($data['start_date']) || isset($data['end_date']) || isset($data['bed_count'])) {
            $updateData = array_merge([
                'start_date' => $item->start_date,
                'end_date' => $item->end_date,
                'bed_count' => $item->bed_count,
            ], $data);

            $data['price_snapshot'] = $this->calculatePrice($item->room, $updateData);
        }

        $item->update($data);

        return $item->fresh('room');
    }

    /**
     * Get user's active cart
     */
    public function getActiveCart(int $userId, int $propertyId): ?Cart
    {
        return Cart::with(['items.room', 'property'])
            ->where('user_id', $userId)
            ->where('property_id', $propertyId)
            ->active()
            ->first();
    }

    /**
     * Get all active carts for a user
     */
    public function getAllActiveCarts(int $userId)
    {
        return Cart::with(['items.room.property', 'property'])
            ->where('user_id', $userId)
            ->active()
            ->get();
    }

    /**
     * Clear cart
     */
    public function clearCart(int $userId, ?int $propertyId = null): bool
    {
        $query = Cart::where('user_id', $userId)->active();

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $carts = $query->get();

        if ($carts->isNotEmpty()) {
            foreach ($carts as $cart) {
                $cart->items()->delete();
                $cart->delete();
            }
            return true;
        }

        return false;
    }

    /**
     * Checkout cart - create multiple bookings in one transaction
     */
    public function checkout(int $userId, int $cartId, array $checkoutData = []): array
    {
        $cart = Cart::with(['items.room.property', 'property'])
            ->where('user_id', $userId)
            ->findOrFail($cartId);

        if ($cart->status !== 'active') {
            throw new \DomainException('Cart is not active.');
        }

        if ($cart->isExpired()) {
            throw new \DomainException('Cart has expired. Please review your selections.');
        }

        if ($cart->items->isEmpty()) {
            throw new \DomainException('Cart is empty.');
        }

        // Validate booking limits
        $this->validateBookingLimits($cart);

        DB::beginTransaction();
        try {
            $bookings = [];
            $bookingGroupReference = 'GRP-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));

            // Prepare cart items for batch booking
            $cartItems = $cart->items->map(function ($item) {
                return [
                    'room_id' => $item->room_id,
                    'bed_count' => $item->bed_count,
                    'bed_numbers' => $item->bed_numbers,
                    'start_date' => $item->start_date->format('Y-m-d'),
                    'end_date' => $item->end_date?->format('Y-m-d'),
                    'contract_mode' => $item->contract_mode,
                    'payment_plan' => $item->payment_plan,
                    'occupants' => $item->occupants,
                    'addons' => $item->addons,
                    'notes' => $item->notes,
                    'booking_mode' => $item->isProxyBooking() ? 'proxy' : 'normal',
                ];
            })->toArray();

            // Use existing createCartBookings method from BookingService
            $result = $this->bookingService->createCartBookings([
                'items' => $cartItems,
                'booking_mode' => $checkoutData['booking_mode'] ?? 'normal',
                'notes' => $checkoutData['notes'] ?? null,
                'payment_plan' => $checkoutData['payment_plan'] ?? 'monthly',
                'receipt_image' => $checkoutData['receipt_image'] ?? null,
                'skip_limit_check' => true,
            ], $userId);

            // Mark cart as completed
            $cart->markAsCompleted();

            DB::commit();

            return [
                'success' => true,
                'bookings' => $result['bookings'],
                'reservation_invoice' => $result['reservation_invoice'] ?? null,
                'booking_group_reference' => $result['booking_group_reference'],
                'total_amount' => collect($result['bookings'])->sum('total_amount'),
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Cart checkout failed', [
                'cart_id' => $cart->id,
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Validate booking limits for cart
     */
    protected function validateBookingLimits(Cart $cart): void
    {
        $property = $cart->property;
        $userId = $cart->user_id;

        // Count existing bookings
        $normalCount = \App\Models\Booking::where('property_id', $property->id)
            ->where('tenant_id', $userId)
            ->where('booking_mode', 'normal')
            ->whereIn('status', ['pending', 'pending_reservation', 'reserved', 'confirmed', 'active'])
            ->count();

        $proxyCount = \App\Models\Booking::where('property_id', $property->id)
            ->where('tenant_id', $userId)
            ->where('booking_mode', 'proxy')
            ->whereIn('status', ['pending', 'pending_reservation', 'reserved', 'confirmed', 'active'])
            ->count();

        // Count items in cart by mode
        $normalItemsInCart = $cart->items->filter(fn ($item) => ! $item->isProxyBooking())->count();
        $proxyItemsInCart = $cart->items->filter(fn ($item) => $item->isProxyBooking())->count();

        // Get property limits (with max cap of 4)
        $normalLimit = min(4, (int) ($property->normal_booking_limit ?? 1));
        $proxyLimit = min(4, (int) ($property->proxy_booking_limit ?? 3));

        // Validate normal bookings
        if ($normalItemsInCart > 0 && ($normalCount + $normalItemsInCart) > $normalLimit) {
            throw new \DomainException("Normal booking limit exceeded. Maximum {$normalLimit} concurrent booking(s) allowed.");
        }

        // Validate proxy bookings
        if ($proxyItemsInCart > 0 && ($proxyCount + $proxyItemsInCart) > $proxyLimit) {
            throw new \DomainException("Proxy booking limit exceeded. Maximum {$proxyLimit} concurrent booking(s) allowed.");
        }
    }

    /**
     * Calculate price for cart item
     */
    protected function calculatePrice(Room $room, array $data): float
    {
        $startDate = Carbon::parse($data['start_date']);
        $endDate = isset($data['end_date']) ? Carbon::parse($data['end_date']) : null;
        $bedCount = (int) ($data['bed_count'] ?? 1);

        if ($endDate) {
            $priceResult = $room->calculatePriceForPeriod($startDate, $endDate);
        } else {
            $priceResult = $room->calculatePriceForDays(30);
        }

        $totalAmount = $priceResult['total'];

        // Apply per-bed pricing if applicable
        if (($room->pricing_model ?? 'full_room') === 'per_bed') {
            $totalAmount *= $bedCount;
        }

        return (float) $totalAmount;
    }

    /**
     * Clean up expired carts
     */
    public function cleanupExpiredCarts(): int
    {
        /** @var \Illuminate\Database\Eloquent\Collection|\App\Models\Cart[] $expiredCarts */
        $expiredCarts = Cart::expired()->get();
        $count = 0;

        foreach ($expiredCarts as $cart) {
            $cart->markAsAbandoned();
            $count++;
        }

        return $count;
    }
}
