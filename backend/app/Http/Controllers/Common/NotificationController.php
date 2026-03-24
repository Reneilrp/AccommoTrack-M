<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
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
        $query = $user->notifications();

        if ($role === 'tenant') {
            $query->whereNotIn('type', ['booking', 'payment_received']);
        } elseif ($role === 'landlord') {
            $query->whereNotIn('type', ['upcoming_payment', 'rent_paid']);
        }

        // Get all notifications, paginated
        $notifications = $query->paginate(20);

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
}
