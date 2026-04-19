<?php

namespace App\Http\Controllers\Common;

use App\Events\MessageSent;
use App\Events\MessageRead;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
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
            ->when($context['is_caretaker'] ?? false, function ($q) use ($context) {
                $q->where(function ($q2) use ($context) {
                    $q2->whereNull('caretaker_id')
                        ->orWhere('caretaker_id', $context['viewer_id']);
                });
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
            ->when($context['is_caretaker'] ?? false, function ($q) use ($context) {
                $q->where(function ($q2) use ($context) {
                    $q2->whereNull('caretaker_id')
                        ->orWhere('caretaker_id', $context['viewer_id']);
                });
            })
            ->firstOrFail();

        // Mark messages as read
        Message::where('conversation_id', $conversationId)
            ->where('receiver_id', $ownerId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        $messages = Message::where('conversation_id', $conversationId)
            ->with(['sender:id,first_name,last_name,role', 'actualSender:id,first_name,last_name', 'replyTo.sender'])
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
            'reply_to_id' => 'nullable|exists:messages,id',
            'message' => 'required_without_all:image,file|nullable|string|max:2000',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'file' => 'nullable|file|mimes:pdf,docx|max:10240',
        ]);

        $userId = $actorUserId;

        // Handle Image Upload
        $imageUrl = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $manager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver);
            $image = $manager->read($file->getRealPath());
            $image->scaleDown(width: 1920);
            $encoded = $image->toWebp(80);

            $filename = 'msg_'.time().'_'.uniqid().'.webp';
            $path = 'message_images/'.$filename;
            \Illuminate\Support\Facades\Storage::put($path, (string) $encoded);
            $imageUrl = $path;
        }
        // Handle File Upload
        $fileUrl = null;
        $fileName = null;
        if ($request->hasFile('file')) {
            $uploadedFile = $request->file('file');
            $fileName = $uploadedFile->getClientOriginalName();
            $path = $uploadedFile->store('message_files', 'public');
            $fileUrl = $path;
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

            if (! $conversation) {
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
            'reply_to_id' => $request->reply_to_id,
            'image_url' => $imageUrl,
            'file_url' => $fileUrl,
            'file_name' => $fileName,
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        $message->load(['sender', 'actualSender', 'replyTo.sender']);

        // Broadcast the message
        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Log::error('Broadcasting failed: '.$e->getMessage());
        }

        return response()->json(new MessageResource($message));
    }

    // Start or get existing conversation
    public function startConversation(Request $request)
    {
        $user = $request->user();
        $actorUserId = Auth::id();

        $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'property_id' => 'nullable|exists:properties,id',
        ]);

        if ($user?->isCaretaker()) {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_messages');

            // If the caretaker specifically wants to message the landlord, do not masquerade.
            if ($request->recipient_id == $context['landlord_id']) {
                $actorUserId = Auth::id();
            } else {
                $actorUserId = $context['landlord_id'];
            }
        }

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

        if (! $conversation) {
            $conversation = Conversation::create([
                'user_one_id' => $userId,
                'user_two_id' => $recipientId,
                'property_id' => $request->property_id,
            ]);
        }

        $conversation->load(['userOne', 'userTwo', 'property', 'lastMessage']);

        return response()->json(new ConversationResource($conversation));
    }

    public function startDirectLandlordConversation(Request $request)
    {
        $user = $request->user();
        if (! $user?->isCaretaker()) {
            return response()->json(['message' => 'Only caretakers can use this endpoint'], 403);
        }

        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_view_messages');

        $userId = Auth::id(); // The caretaker's own ID
        $recipientId = $context['landlord_id'];

        $conversation = Conversation::where(function ($q) use ($userId, $recipientId) {
            $q->where('user_one_id', $userId)->where('user_two_id', $recipientId);
        })
            ->orWhere(function ($q) use ($userId, $recipientId) {
                $q->where('user_one_id', $recipientId)->where('user_two_id', $userId);
            })
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'user_one_id' => $userId,
                'user_two_id' => $recipientId,
                'property_id' => null,
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

    public function assignCaretaker(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== 'landlord') {
            return response()->json(['message' => 'Only landlords can assign caretakers to conversations'], 403);
        }

        $request->validate([
            'caretaker_id' => 'nullable|exists:users,id',
        ]);

        $conversation = Conversation::where('id', $id)
            ->where(function ($q) use ($user) {
                $q->where('user_one_id', $user->id)
                    ->orWhere('user_two_id', $user->id);
            })
            ->firstOrFail();

        // Check if the assigned user is actually a caretaker of this landlord
        if ($request->caretaker_id) {
            $isCaretaker = \App\Models\CaretakerAssignment::where('landlord_id', $user->id)
                ->where('caretaker_id', $request->caretaker_id)
                ->exists();

            if (! $isCaretaker) {
                return response()->json(['message' => 'The selected user is not assigned to you as a caretaker.'], 403);
            }
        }

        $conversation->update(['caretaker_id' => $request->caretaker_id]);

        return response()->json([
            'message' => 'Caretaker assignment updated.',
            'caretaker_id' => $conversation->caretaker_id,
        ]);
    }

    // Unsend a message
    public function unsend(Request $request, $id)
    {
        $user = $request->user();
        $message = Message::findOrFail($id);

        // Check if the user is the sender (or the landlord/caretaker of the sender)
        $isOwner = false;
        if ($user->role === 'landlord') {
            $isOwner = (int) $message->sender_id === (int) $user->id;
        } elseif ($user->role === 'caretaker') {
            $isOwner = (int) $message->sender_id === (int) $user->effectiveLandlordId();
        } else {
            $isOwner = (int) $message->sender_id === (int) $user->id;
        }

        if (! $isOwner) {
            throw new AccessDeniedHttpException('You can only unsend your own messages.');
        }

        if ($message->is_unsent) {
            return response()->json(['message' => 'Message already unsent.'], 422);
        }

        // Delete image if exists
        if ($message->image_url) {
            \Illuminate\Support\Facades\Storage::delete($message->image_url);
        }

        $message->update([
            'is_unsent' => true,
            'message' => '',
            'image_url' => null,
        ]);

        // Broadcast the update
        try {
            broadcast(new MessageSent($message->load(['sender', 'actualSender'])))->toOthers();
        } catch (\Exception $e) {
            \Log::error('Broadcasting unsend failed: '.$e->getMessage());
        }

        return response()->json(new MessageResource($message));
    }

    // Edit a message
    public function edit(Request $request, $id)
    {
        $user = $request->user();
        $message = Message::findOrFail($id);

        // Check ownership (similar to unsend)
        $isOwner = false;
        if ($user->role === 'landlord') {
            $isOwner = (int) $message->sender_id === (int) $user->id;
        } elseif ($user->role === 'caretaker') {
            $isOwner = (int) $message->sender_id === (int) $user->effectiveLandlordId();
        } else {
            $isOwner = (int) $message->sender_id === (int) $user->id;
        }

        if (! $isOwner) {
            throw new AccessDeniedHttpException('You can only edit your own messages.');
        }

        if ($message->is_unsent) {
            return response()->json(['message' => 'Cannot edit an unsent message.'], 422);
        }

        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $message->update([
            'message' => $request->message,
            'is_edited' => true,
        ]);

        // Broadcast the update
        try {
            broadcast(new MessageSent($message->load(['sender', 'actualSender', 'replyTo.sender'])))->toOthers();
        } catch (\Exception $e) {
            \Log::error('Broadcasting edit failed: '.$e->getMessage());
        }

        return response()->json(new MessageResource($message));
    }

    // Mark all unread messages in a conversation as read
    public function markAsRead(Request $request, $id)
    {
        $context = $this->resolveMessageContext($request);
        $ownerId = $context['owner_id'];

        $updated = Message::where('conversation_id', $id)
            ->where('receiver_id', $ownerId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        if ($updated > 0) {
            try {
                broadcast(new MessageRead($id, $ownerId))->toOthers();
            } catch (\Exception $e) {
                \Log::error('Broadcasting message read failed: '.$e->getMessage());
            }
        }

        return response()->json(['success' => true]);
    }

    protected function resolveMessageContext(Request $request): array
    {
        $user = $request->user();

        if (! $user) {
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
