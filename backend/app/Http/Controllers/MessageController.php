<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class MessageController extends Controller
{
    use ResolvesLandlordAccess;

    // Get all conversations for current user
    public function getConversations(Request $request)
{
    $context = $this->resolveMessageContext($request);
    $ownerId = $context['owner_id'];

    $conversations = Conversation::where(function ($q) use ($ownerId) {
            $q->where('user_one_id', $ownerId)
              ->orWhere('user_two_id', $ownerId);
        })
        ->with(['userOne:id,first_name,last_name,role', 'userTwo:id,first_name,last_name,role', 'property:id,title', 'lastMessage'])
        ->withCount(['messages as unread_count' => function ($q) use ($ownerId) {
            $q->where('receiver_id', $ownerId)
              ->where('is_read', false);
        }])
        ->orderBy('last_message_at', 'desc')
        ->get()
        ->map(function ($conv) use ($ownerId) {
            $otherUser = $conv->user_one_id === $ownerId ? $conv->userTwo : $conv->userOne;
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
    public function getMessages(Request $request, $conversationId)
    {
        $context = $this->resolveMessageContext($request);
        $ownerId = $context['owner_id'];
        $viewerId = $context['viewer_id'];

        $conversation = Conversation::where('id', $conversationId)
            ->where(function ($q) use ($ownerId) {
                $q->where('user_one_id', $ownerId)
                  ->orWhere('user_two_id', $ownerId);
            })
            ->firstOrFail();

        // Mark messages as read for the landlord account (caretakers act on their behalf)
        Message::where('conversation_id', $conversationId)
            ->where('receiver_id', $ownerId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        $messages = Message::where('conversation_id', $conversationId)
            ->with('sender:id,first_name,last_name,role', 'actualSender:id,first_name,last_name')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    // Send a message
    public function sendMessage(Request $request)
    {
        $user = $request->user();
        $actorUserId = Auth::id();
        $actualSenderId = Auth::id();  // The person actually sending
        $senderRole = $user->role;     // 'landlord', 'caretaker', or 'tenant'

        if ($user?->isCaretaker()) {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_messages');
            $actorUserId = $context['landlord_id'];
            // actualSenderId stays as the caretaker's ID
            // senderRole stays as 'caretaker'
        }

        $request->validate([
            'conversation_id' => 'required_without:recipient_id|exists:conversations,id',
            'recipient_id' => 'required_without:conversation_id|exists:users,id',
            'property_id' => 'nullable|exists:properties,id',
            'message' => 'required|string|max:2000',
        ]);
        
        $userId = $actorUserId;

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

        // Create message with actual sender info
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $userId,
            'actual_sender_id' => $actualSenderId,
            'sender_role' => $senderRole,
            'receiver_id' => $recipientId,
            'message' => $request->message,
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        $message->load('sender:id,first_name,last_name', 'actualSender:id,first_name,last_name');

        // Broadcast the message
        broadcast(new MessageSent($message))->toOthers();

        return response()->json($message);
    }

    // Start or get existing conversation
    public function startConversation(Request $request)
    {
        $user = $request->user();
        $actorUserId = Auth::id();

        if ($user?->isCaretaker()) {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_messages');
            $actorUserId = $context['landlord_id'];
        }

        $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'property_id' => 'nullable|exists:properties,id',
        ]);

        $userId = $actorUserId;
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
    public function getUnreadCount(Request $request)
    {
        $context = $this->resolveMessageContext($request);
        $ownerId = $context['owner_id'];
        
        $count = Message::where('receiver_id', $ownerId)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    protected function resolveMessageContext(Request $request): array
    {
        $user = $request->user();

        if (!$user) {
            throw new AccessDeniedHttpException('Authentication required.');
        }

        if ($user->isCaretaker()) {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_messages');

            return [
                'owner_id' => $context['landlord_id'],
                'viewer_id' => $user->id,
                'is_caretaker' => true,
            ];
        }

        return [
            'owner_id' => $user->id,
            'viewer_id' => $user->id,
            'is_caretaker' => false,
        ];
    }
}