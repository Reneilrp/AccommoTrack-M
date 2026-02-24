import React, { useRef } from 'react';
import { Phone, MoreVertical, Image as ImageIcon, Send, MessageCircle, Loader2, AlertTriangle, X } from 'lucide-react';
import { getImageUrl } from '../../../utils/api';

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
  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-300 dark:border-gray-700 shadow-md">
            <MessageCircle className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">No conversation selected</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto font-medium">Choose a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 p-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
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
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
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
            const getSenderId = (m) => {
              if (!m) return null;
              return (
                m.sender_id || m.senderId || m.user_id || m.userId || m.from_id ||
                (m.sender && (m.sender.id || m.sender.user_id)) ||
                (m.user && (m.user.id || m.user_id)) ||
                null
              );
            };

            const senderId = getSenderId(msg);
            const actualSenderId = msg.actual_sender_id || msg.actual_sender?.id;
            
            const isCurrentUserCaretaker = normalizedRole === 'caretaker';
            const senderRole = msg.sender?.role;
            const isFromLandlordSide = senderRole === 'landlord' || msg.sender_role === 'caretaker' || msg.sender_role === 'landlord';
            
            const isMine = isCurrentUserCaretaker
              ? isFromLandlordSide  
              : String(senderId) === String(currentUserId);  
            
            const isCaretakerMessage = msg.sender_role === 'caretaker';
            const isSentByCurrentCaretaker = isCaretakerMessage && actualSenderId && String(actualSenderId) === String(currentUserId);
            
            const getTimestamp = (m) => {
              if (!m) return null;
              return (
                m.created_at || m.createdAt || m.sent_at || m.sentAt || m.timestamp || m.time || m.date || m.updated_at || m.updatedAt || null
              );
            };

            let ts = getTimestamp(msg);
            if (!ts) ts = msg.last_message_at || msg.lastMessageAt || new Date().toISOString();

            return (
              <div
                key={msg.id || idx}
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
              >
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-xs lg:max-w-md`}> 
                  {isCaretakerMessage && msg.actual_sender && (
                    <p className="text-[10px] mb-1 text-gray-500 dark:text-gray-400 font-medium">
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
                          src={getImageUrl(msg.image_url)} 
                          alt="Attachment" 
                          className="rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(getImageUrl(msg.image_url), '_blank')}
                        />
                      </div>
                    )}
                    {msg.message && <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>}
                  </div>
                  <p className="text-[10px] mt-1 text-gray-400 dark:text-gray-500 px-1">
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
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2 text-amber-800 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Actions disabled because you are viewing as a caretaker.</p>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <div className="relative rounded-xl overflow-hidden border-2 border-green-500 shadow-lg animate-in zoom-in duration-200">
              <img src={imagePreview} alt="Preview" className="h-32 w-auto object-cover" />
              <button 
                onClick={removeSelectedImage}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm transition-colors"
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 flex-shrink-0" 
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
    </div>
  );
};

export default ChatArea;
