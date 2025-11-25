<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    // Get all conversations for current user
    public function getConversations()
{
    $userId = Auth::id();

    $conversations = Conversation::where('user_one_id', $userId)
        ->orWhere('user_two_id', $userId)
        ->with(['userOne:id,first_name,last_name,role', 'userTwo:id,first_name,last_name,role', 'property:id,title', 'lastMessage'])
        ->withCount(['messages as unread_count' => function ($q) use ($userId) {
            $q->where('receiver_id', $userId)
              ->where('is_read', false);
        }])
        ->orderBy('last_message_at', 'desc')
        ->get()
        ->map(function ($conv) use ($userId) {
            $otherUser = $conv->user_one_id === $userId ? $conv->userTwo : $conv->userOne;
            return [
                'id' => $conv->id,
                'other_user' => $otherUser,
                'property' => $conv->property,
                'last_message' => $conv->lastMessage,
                'unread_count' => $conv->unread_count,
                'last_message_at' => $conv->last_message_at,
            ];
        })
        ->values(); // Add this to ensure it's a proper array

    return response()->json($conversations);
}

    // Get messages for a conversation
    public function getMessages($conversationId)
    {
        $userId = Auth::id();

        $conversation = Conversation::where('id', $conversationId)
            ->where(function ($q) use ($userId) {
                $q->where('user_one_id', $userId)
                  ->orWhere('user_two_id', $userId);
            })
            ->firstOrFail();

        // Mark messages as read
        Message::where('conversation_id', $conversationId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        $messages = Message::where('conversation_id', $conversationId)
            ->with('sender:id,first_name,last_name')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    // Send a message
    public function sendMessage(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required_without:recipient_id|exists:conversations,id',
            'recipient_id' => 'required_without:conversation_id|exists:users,id',
            'property_id' => 'nullable|exists:properties,id',
            'message' => 'required|string|max:2000',
        ]);

        $userId = Auth::id();

        // Find or create conversation
        if ($request->conversation_id) {
            $conversation = Conversation::findOrFail($request->conversation_id);
            $recipientId = $conversation->user_one_id === $userId 
                ? $conversation->user_two_id 
                : $conversation->user_one_id;
        } else {
            $recipientId = $request->recipient_id;
            
            // Check if conversation exists
            $conversation = Conversation::where(function ($q) use ($userId, $recipientId) {
                    $q->where('user_one_id', $userId)->where('user_two_id', $recipientId);
                })
                ->orWhere(function ($q) use ($userId, $recipientId) {
                    $q->where('user_one_id', $recipientId)->where('user_two_id', $userId);
                })
                ->when($request->property_id, function ($q) use ($request) {
                    $q->where('property_id', $request->property_id);
                })
                ->first();

            if (!$conversation) {
                $conversation = Conversation::create([
                    'user_one_id' => $userId,
                    'user_two_id' => $recipientId,
                    'property_id' => $request->property_id,
                ]);
            }
        }

        // Create message
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $userId,
            'receiver_id' => $recipientId,
            'message' => $request->message,
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        // Broadcast the message
        broadcast(new MessageSent($message))->toOthers();

        return response()->json($message->load('sender:id,first_name,last_name'));
    }

    // Start or get existing conversation
    public function startConversation(Request $request)
    {
        $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'property_id' => 'nullable|exists:properties,id',
        ]);

        $userId = Auth::id();
        $recipientId = $request->recipient_id;

        $conversation = Conversation::where(function ($q) use ($userId, $recipientId) {
                $q->where('user_one_id', $userId)->where('user_two_id', $recipientId);
            })
            ->orWhere(function ($q) use ($userId, $recipientId) {
                $q->where('user_one_id', $recipientId)->where('user_two_id', $userId);
            })
            ->when($request->property_id, function ($q) use ($request) {
                $q->where('property_id', $request->property_id);
            })
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'user_one_id' => $userId,
                'user_two_id' => $recipientId,
                'property_id' => $request->property_id,
            ]);
        }

        return response()->json(
            $conversation->load(['userOne:id,first_name,last_name', 'userTwo:id,first_name,last_name', 'property:id,title'])
        );
    }

    // Get unread message count
    public function getUnreadCount()
    {
        $userId = Auth::id();
        
        $count = Message::where('receiver_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread_count' => $count]);
    }
}