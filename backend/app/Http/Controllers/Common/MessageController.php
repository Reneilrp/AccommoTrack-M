<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;

use App\Events\MessageSent;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Conversation;
use App\Models\Message;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
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
            ->with(['userOne', 'userTwo', 'property', 'lastMessage'])
            ->withCount(['messages as unread_count' => function ($q) use ($ownerId) {
                $q->where('receiver_id', $ownerId)
                  ->where('is_read', false);
            }])
            ->orderBy('last_message_at', 'desc')
            ->get();

        return response()->json(ConversationResource::collection($conversations));
    }

    // Get messages for a conversation
    public function getMessages(Request $request, $conversationId)
    {
        $context = $this->resolveMessageContext($request);
        $ownerId = $context['owner_id'];

        $conversation = Conversation::where('id', $conversationId)
            ->where(function ($q) use ($ownerId) {
                $q->where('user_one_id', $ownerId)
                  ->orWhere('user_two_id', $ownerId);
            })
            ->firstOrFail();

        // Mark messages as read
        Message::where('conversation_id', $conversationId)
            ->where('receiver_id', $ownerId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        $messages = Message::where('conversation_id', $conversationId)
            ->with(['sender:id,first_name,last_name,role', 'actualSender:id,first_name,last_name'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(MessageResource::collection($messages));
    }

    // Send a message
    public function sendMessage(Request $request)
    {
        $user = $request->user();
        $actorUserId = Auth::id();
        $actualSenderId = Auth::id();
        $senderRole = $user->role;

        if ($user?->isCaretaker()) {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_messages');
            $actorUserId = $context['landlord_id'];
        }

        $request->validate([
            'conversation_id' => 'required_without:recipient_id|exists:conversations,id',
            'recipient_id' => 'required_without:conversation_id|exists:users,id',
            'property_id' => 'nullable|exists:properties,id',
            'message' => 'required_without:image|nullable|string|max:2000',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);
        
        $userId = $actorUserId;

        // Handle Image Upload
        $imageUrl = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $manager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver());
            $image = $manager->read($file->getRealPath());
            $image->scaleDown(width: 1920);
            $encoded = $image->toWebp(80);
            
            $filename = 'msg_' . time() . '_' . uniqid() . '.webp';
            $path = 'message_images/' . $filename;
            
            \Illuminate\Support\Facades\Storage::disk('public')->put($path, (string) $encoded);
            $imageUrl = $path;
        }

        // Find or create conversation
        if ($request->conversation_id) {
            $conversation = Conversation::findOrFail($request->conversation_id);
            $recipientId = $conversation->user_one_id === $userId 
                ? $conversation->user_two_id 
                : $conversation->user_one_id;
        } else {
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
        }

        // Create message
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $userId,
            'actual_sender_id' => $actualSenderId,
            'sender_role' => $senderRole,
            'receiver_id' => $recipientId,
            'message' => $request->message ?? '',
            'image_url' => $imageUrl,
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        $message->load(['sender', 'actualSender']);

        // Broadcast the message
        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Log::error('Broadcasting failed: ' . $e->getMessage());
        }

        return response()->json(new MessageResource($message));
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

        $conversation->load(['userOne', 'userTwo', 'property', 'lastMessage']);
        
        return response()->json(new ConversationResource($conversation));
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