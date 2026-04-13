<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Models\DevicePushToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get user notifications
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $role = $request->query('role');
        $unreadOnly = filter_var($request->query('unread_only', false), FILTER_VALIDATE_BOOLEAN);
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min($perPage, 200));
        $query = $user->notifications();

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        if ($role === 'tenant') {
            $query->whereNotIn('type', ['booking', 'payment_received']);
        } elseif ($role === 'landlord') {
            $query->whereNotIn('type', ['upcoming_payment', 'rent_paid']);
        }

        // Get all notifications, paginated
        $notifications = $query->paginate($perPage);

        return response()->json($notifications);
    }

    /**
     * Get unread count
     */
    public function unreadCount(Request $request)
    {
        $role = $request->query('role');
        $query = Auth::user()->unreadNotifications();

        if ($role === 'tenant') {
            $query->whereNotIn('type', ['booking', 'payment_received']);
        } elseif ($role === 'landlord') {
            $query->whereNotIn('type', ['upcoming_payment', 'rent_paid']);
        }

        $count = $query->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $user = Auth::user();
        $notification = $user->notifications()->where('id', $id)->firstOrFail();

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * Mark all as read
     */
    public function markAllAsRead(Request $request)
    {
        $role = $request->query('role');
        $query = Auth::user()->unreadNotifications();

        if ($role === 'tenant') {
            $query->whereNotIn('type', ['booking', 'payment_received']);
        } elseif ($role === 'landlord') {
            $query->whereNotIn('type', ['upcoming_payment', 'rent_paid']);
        }

        $query->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json(['message' => 'All marked as read']);
    }

    /**
     * Register or refresh the current device push token.
     */
    public function upsertPushToken(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255', 'regex:/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9\-_]+\]$/'],
            'platform' => ['nullable', 'string', 'in:ios,android,web'],
        ]);

        $user = Auth::user();

        $pushToken = DevicePushToken::query()->updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $user->id,
                'platform' => $validated['platform'] ?? null,
                'is_active' => true,
                'last_seen_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $pushToken->id,
                'token' => $pushToken->token,
                'platform' => $pushToken->platform,
                'is_active' => (bool) $pushToken->is_active,
            ],
            'message' => 'Push token registered successfully.',
        ]);
    }

    /**
     * Deactivate a push token for the authenticated user.
     */
    public function removePushToken(Request $request)
    {
        $validated = $request->validate([
            'token' => ['nullable', 'string', 'max:255'],
        ]);

        $query = DevicePushToken::query()->where('user_id', Auth::id());

        if (! empty($validated['token'])) {
            $query->where('token', $validated['token']);
        }

        $deactivatedCount = $query->update([
            'is_active' => false,
            'last_seen_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'deactivated' => $deactivatedCount,
            ],
            'message' => 'Push token removed successfully.',
        ]);
    }
}
