<?php

namespace App\Http\Controllers;

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
        
        // Get all notifications, paginated
        $notifications = $user->notifications()->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Get unread count
     */
    public function unreadCount(Request $request)
    {
        $count = Auth::user()->unreadNotifications()->count();
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
            'read_at' => now()
        ]);

        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * Mark all as read
     */
    public function markAllAsRead(Request $request)
    {
        Auth::user()->unreadNotifications()->update([
            'is_read' => true,
            'read_at' => now()
        ]);

        return response()->json(['message' => 'All marked as read']);
    }
}
