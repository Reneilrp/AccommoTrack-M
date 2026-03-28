import React, { useMemo, useRef, useState } from 'react';
import { MoreVertical, Image as ImageIcon, Send, MessageCircle, Loader2, AlertTriangle, X } from 'lucide-react';

const ChatArea = ({
  selectedChat,
  messages,
  messageText,
  setMessageText,
  sendingMessage,
  canSendMessages,
  caretakerMessagingRestricted,
  handleSendMessage,
  getInitials,
  formatTime,
  currentUserId,
  normalizedRole,
  messagesEndRef,
  imagePreview,
  handleImageSelect,
  removeSelectedImage
}) => {
  const fileInputRef = useRef(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const otherUser = selectedChat?.other_user || null;
  const isLandlordView = normalizedRole === 'landlord' || normalizedRole === 'caretaker';
  const isTenantConversation = otherUser?.role === 'tenant';

  const mediaItems = useMemo(() => {
    if (!Array.isArray(messages)) return [];

    const seen = new Set();

    return messages
      .filter((msg) => {
        const imageUrl = msg?.image_url;
        if (!imageUrl || seen.has(imageUrl)) return false;
        seen.add(imageUrl);
        return true;
      })
      .map((msg) => ({
        id: msg.id,
        image_url: msg.image_url,
        created_at: msg.created_at,
        sender_role: msg.sender_role,
      }));
  }, [messages]);

  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDelta = now.getMonth() - dob.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  };

  const formatPreferences = (preferences) => {
    if (!preferences) return [];
    if (Array.isArray(preferences)) {
      return preferences
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean);
    }

    if (typeof preferences === 'string') {
      return preferences
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    if (typeof preferences === 'object') {
      return Object.entries(preferences)
        .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
        .map(([key, value]) => {
          if (value === true) return key;
          if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
          return `${key}: ${String(value)}`;
        });
    }

    return [];
  };

  const userPreferences = formatPreferences(otherUser?.preferences);
  const userAge = getAge(otherUser?.date_of_birth);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-300 dark:border-gray-700 shadow-md">
            <MessageCircle className="w-10 h-10 text-gray-500 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">No conversation selected</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto font-medium">Choose a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 p-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <span className="text-green-600 dark:text-green-400 font-semibold">
              {getInitials(selectedChat.other_user)}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedChat.other_user?.first_name} {selectedChat.other_user?.last_name}
            </p>
            {selectedChat.property && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedChat.property.title}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
            aria-label="Open chat details"
            title="Open chat details"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-900 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-500 opacity-60">
             <MessageCircle className="w-12 h-12 mb-2" />
             <p className="text-sm font-bold">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Using standardized fields from MessageResource
            const isMine = msg.is_mine;
            const actualSenderId = msg.actual_sender_id;
            const isCaretakerMessage = msg.sender_role === 'caretaker';
            const isSentByCurrentCaretaker = isCaretakerMessage && actualSenderId && String(actualSenderId) === String(currentUserId);
            
            const ts = msg.created_at || new Date().toISOString();

            return (
              <div
                key={msg.id || idx}
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
              >
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-xs lg:max-w-md`}> 
                  {isCaretakerMessage && msg.actual_sender && (
                    <p className="text-[10px] mb-2 text-gray-500 dark:text-gray-400 font-medium">
                      {isSentByCurrentCaretaker
                        ? 'You (Caretaker)'
                        : `via ${msg.actual_sender.first_name} ${msg.actual_sender.last_name} (Caretaker)`
                      }
                    </p>
                  )}
                  <div
                    className={`w-auto px-4 py-2 rounded-2xl shadow-sm ${
                      isMine
                        ? 'bg-green-600 dark:bg-green-700 text-white rounded-tr-none'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-tl-none'
                    }`}
                  >
                    {msg.image_url && (
                      <div className="mb-2 max-w-full">
                        <img 
                          src={msg.image_url} 
                          alt="Attachment" 
                          className="rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image_url, '_blank')}
                        />
                      </div>
                    )}
                    {msg.message && <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>}
                  </div>
                  <p className="text-[10px] mt-2 text-gray-500 dark:text-gray-500 px-2">
                    {formatTime(ts)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 p-4">
        {caretakerMessagingRestricted && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2 text-amber-800 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Actions disabled because you are viewing as a caretaker.</p>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4 relative inline-block">
            <div className="relative rounded-xl overflow-hidden border-2 border-green-500 shadow-lg animate-in zoom-in duration-200">
              <img src={imagePreview} alt="Preview" className="h-32 w-auto object-cover" />
              <button 
                onClick={removeSelectedImage}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => handleImageSelect(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 flex-shrink-0" 
            disabled={!canSendMessages}
            title="Attach photo"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center">
            <textarea
              rows="1"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSendMessages && (messageText.trim() || imagePreview)) handleSendMessage();
                }
              }}
              placeholder={caretakerMessagingRestricted ? 'Messaging disabled' : 'Type a message...'}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none scrollbar-hide max-h-32 leading-relaxed"
              disabled={!canSendMessages}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!canSendMessages || sendingMessage || (!messageText.trim() && !imagePreview)}
            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex-shrink-0"
          >
            {sendingMessage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {isDetailsOpen && (
        <button
          type="button"
          onClick={() => setIsDetailsOpen(false)}
          className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:hidden"
          aria-label="Close details panel"
        />
      )}

      <aside
        className={`absolute top-0 right-0 z-30 h-full w-full sm:w-[360px] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-300 ${
          isDetailsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Chat Details</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Personal details and shared media</p>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close details panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-4">
              <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400 mb-3">Personal Details</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Name</span>
                  <span className="text-right font-semibold text-gray-900 dark:text-white">
                    {otherUser?.first_name || otherUser?.last_name
                      ? `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim()
                      : 'Unavailable'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">Gender</span>
                  <span className="text-right font-semibold text-gray-900 dark:text-white capitalize">
                    {otherUser?.gender || otherUser?.identified_as || 'Not provided'}
                  </span>
                </div>

                {selectedChat?.property && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Property</span>
                    <span className="text-right font-semibold text-gray-900 dark:text-white">
                      {selectedChat.property.title}
                    </span>
                  </div>
                )}

                {isLandlordView && isTenantConversation && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">Age</span>
                      <span className="text-right font-semibold text-gray-900 dark:text-white">
                        {userAge !== null ? `${userAge} years old` : 'Not provided'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">Preferences</p>
                      {userPreferences.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No preferences shared yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {userPreferences.map((pref) => (
                            <span
                              key={pref}
                              className="px-2.5 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold"
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400">Media</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{mediaItems.length} photo{mediaItems.length === 1 ? '' : 's'}</span>
              </div>

              {mediaItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No photos shared in this conversation yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => window.open(item.image_url, '_blank', 'noopener,noreferrer')}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                      title={item.created_at ? `Sent ${formatTime(item.created_at)}` : 'Open image'}
                    >
                      <img
                        src={item.image_url}
                        alt="Shared media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ChatArea;
