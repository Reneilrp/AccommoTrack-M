<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);
    
    if (!$conversation) return false;
    
    return $user->id === $conversation->user_one_id || 
           $user->id === $conversation->user_two_id;
});