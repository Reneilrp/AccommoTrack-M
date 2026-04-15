<?php

namespace App\Http\Controllers;

use App\Services\CartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    protected CartService $cartService;

    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }

    /**
     * Get active cart
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'property_id' => 'required|exists:properties,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cart = $this->cartService->getActiveCart(
            auth()->id(),
            $request->property_id
        );

        if (!$cart) {
            return response()->json([
                'cart' => null,
                'items' => [],
                'total' => 0,
                'item_count' => 0,
            ]);
        }

        return response()->json([
            'cart' => $cart,
            'items' => $cart->items->load('room'),
            'total' => $cart->getTotalPrice(),
            'item_count' => $cart->items->count(),
        ]);
    }

    /**
     * Add item to cart
     */
    public function addItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'room_id' => 'required|exists:rooms,id',
            'bed_count' => 'required|integer|min:1',
            'bed_numbers' => 'nullable|string',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'nullable|date|after:start_date',
            'contract_mode' => 'required|in:daily,monthly',
            'payment_plan' => 'nullable|in:full,monthly,promo_one_time',
            'occupants' => 'nullable|array',
            'occupants.*.first_name' => 'required_with:occupants|string',
            'occupants.*.last_name' => 'required_with:occupants|string',
            'occupants.*.sex' => 'required_with:occupants|in:male,female',
            'occupants.*.bed_number' => 'nullable|integer',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $item = $this->cartService->addItem(auth()->id(), $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Item added to cart successfully',
                'item' => $item,
            ], 201);
        } catch (\DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add item to cart',
            ], 500);
        }
    }

    /**
     * Update cart item
     */
    public function updateItem(Request $request, $itemId)
    {
        $validator = Validator::make($request->all(), [
            'bed_count' => 'sometimes|integer|min:1',
            'bed_numbers' => 'nullable|string',
            'start_date' => 'sometimes|date|after_or_equal:today',
            'end_date' => 'nullable|date|after:start_date',
            'occupants' => 'nullable|array',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $item = $this->cartService->updateItem(auth()->id(), $itemId, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Cart item updated successfully',
                'item' => $item,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update cart item',
            ], 500);
        }
    }

    /**
     * Remove item from cart
     */
    public function removeItem($itemId)
    {
        try {
            $this->cartService->removeItem(auth()->id(), $itemId);

            return response()->json([
                'success' => true,
                'message' => 'Item removed from cart successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove item from cart',
            ], 500);
        }
    }

    /**
     * Clear cart
     */
    public function clear(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'property_id' => 'required|exists:properties,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $this->cartService->clearCart(auth()->id(), $request->property_id);

            return response()->json([
                'success' => true,
                'message' => 'Cart cleared successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear cart',
            ], 500);
        }
    }

    /**
     * Checkout cart
     */
    public function checkout(Request $request, $cartId)
    {
        $validator = Validator::make($request->all(), [
            'payment_plan' => 'nullable|in:full,monthly,promo_one_time',
            'receipt_image' => 'nullable|image|max:5120', // 5MB
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $result = $this->cartService->checkout(auth()->id(), $cartId, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Checkout successful',
                'data' => $result,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Checkout failed. Please try again.',
            ], 500);
        }
    }
}
