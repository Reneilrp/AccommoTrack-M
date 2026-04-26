import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MoreVertical, Image as ImageIcon, Send, MessageCircle, Loader2, AlertTriangle, X, RotateCcw, Reply, Pencil, Trash2, CheckCheck, Paperclip, FileText, Download } from 'lucide-react';
import api from '../../../utils/api';
import { showSuccess, showError } from '../../../utils/toast';
import { getAgeInYears } from '../../../utils/dateUtils';

const ChatArea = ({
  selectedChat,
  messages,
  hasMoreMessages,
  loadingMore,
  onLoadMore,
  messageText,
  setMessageText,
  sendingMessage,
  canSendMessages,
  caretakerMessagingRestricted,
  handleSendMessage,
  handleUnsend,
  getInitials,
  formatTime,
  normalizedRole,
  messagesEndRef,
  imagePreview,
  handleImageSelect,
  removeSelectedImage,
  replyingTo,
  setReplyingTo,
  editingMessage,
  setEditingMessage,
  handleEditMessage,
  handleDeleteConversation,
  deletingConversation,
  isOtherTyping,
  selectedFile,
  handleFileSelect,
  removeSelectedFile,
  currentUserId
}) => {
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Auto-focus textarea when replying or editing
  React.useEffect(() => {
    if (replyingTo || editingMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingTo, editingMessage]);

  const otherUser = selectedChat?.other_user || null;
  const isLandlordView = normalizedRole === 'landlord' || normalizedRole === 'caretaker';
  const isTenantConversation = otherUser?.role === 'tenant';

  const mediaItems = useMemo(() => {
    if (!Array.isArray(messages)) return [];

    const seen = new Set();

    return messages
      .filter((msg) => {
        const imageUrl = msg?.image_url;
        if (!imageUrl || msg.is_unsent || seen.has(imageUrl)) return false;
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

  const fileItems = useMemo(() => {
    if (!Array.isArray(messages)) return [];

    const seen = new Set();

    return messages
      .filter((msg) => {
        const fileUrl = msg?.file_url;
        if (!fileUrl || msg.is_unsent || seen.has(fileUrl)) return false;
        seen.add(fileUrl);
        return true;
      })
      .map((msg) => ({
        id: msg.id,
        file_url: msg.file_url,
        file_name: msg.file_name || 'Document',
        created_at: msg.created_at,
      }));
  }, [messages]);

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
  const userAge = getAgeInYears(otherUser?.date_of_birth);
  const ageDisplay = userAge !== null && userAge >= 0 ? userAge : null;

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
            {isOtherTyping ? (
              <p className="text-[10px] text-blue-500 animate-pulse font-medium italic">typing...</p>
            ) : selectedChat.property ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedChat.property.title}</p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          {(normalizedRole === 'tenant' || normalizedRole === 'landlord') && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500"
              aria-label="Delete conversation"
              title="Delete conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
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
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="px-4 py-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Load previous messages'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-500 opacity-60">
            <MessageCircle className="w-12 h-12 mb-2" />
            <p className="text-sm font-bold">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Determine isMine locally based on IDs for real-time consistency
            const isMine = currentUserId && String(msg.actual_sender_id || msg.sender_id) === String(currentUserId);
            const incomingSender = !isMine
              ? (msg.actual_sender || msg.sender || selectedChat?.other_user || null)
              : null;
            const incomingAvatarUrl = incomingSender?.profile_image || null;
            const incomingInitials = getInitials(incomingSender || selectedChat?.other_user);
            const incomingRole = String(msg.sender_role || incomingSender?.role || '').toLowerCase();
            let otherPartyIndicator = null;
            if (!isMine) {
              if (incomingRole === 'caretaker') {
                const caretakerName = `${msg.actual_sender?.first_name || incomingSender?.first_name || ''} ${msg.actual_sender?.last_name || incomingSender?.last_name || ''}`.trim();
                otherPartyIndicator = `${caretakerName || 'Caretaker'} (Caretaker)`;
              } else if (incomingRole === 'tenant') {
                const tenantName = `${incomingSender?.first_name || selectedChat?.other_user?.first_name || ''} ${incomingSender?.last_name || selectedChat?.other_user?.last_name || ''}`.trim();
                otherPartyIndicator = `${tenantName || 'Tenant'} (Tenant)`;
              }
            }

            const ts = msg.created_at || new Date().toISOString();
            const isUnsent = Boolean(msg.is_unsent);
            const isEdited = Boolean(msg.is_edited);
            const replyTo = msg.reply_to;
            const isImageOnly = msg.image_url && !msg.message && !replyTo && !msg.file_url;

            const canEdit = isMine && !isUnsent && !caretakerMessagingRestricted && (new Date() - new Date(ts)) < 30 * 60 * 1000;

            return (
              <div
                key={msg.id || idx}
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300 group/msg`}
              >
                <div className="flex items-start gap-2">
                  {!isMine && (
                    <div className="w-8 h-8 mt-0.5 rounded-full bg-green-100 dark:bg-green-900/30 overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                      {incomingAvatarUrl ? (
                        <img
                          src={incomingAvatarUrl}
                          alt={`${incomingSender?.first_name || 'User'} avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[11px] font-semibold text-green-600 dark:text-green-400 uppercase">
                          {incomingInitials}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-xs lg:max-w-md`}>
                    {!isUnsent && otherPartyIndicator && (
                      <p className="text-[10px] leading-none mb-1.5 px-1 text-gray-500 dark:text-gray-400">
                        {otherPartyIndicator}
                      </p>
                    )}
                    <div className="flex items-center gap-1 max-w-full">
                      {canEdit && (
                        <div className="opacity-0 group-hover/msg:opacity-100 flex items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
                          <button
                            onClick={() => {
                              setEditingMessage(msg);
                              setReplyingTo(null);
                              setMessageText(msg.message);
                            }}
                            className="p-1.5 hover:text-green-500 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Unsend this message for everyone?')) {
                                handleUnsend(msg.id);
                              }
                            }}
                            className="p-1.5 hover:text-red-500 transition-colors"
                            title="Unsend"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div
                        className={`w-auto rounded-2xl ${isUnsent
                          ? 'px-4 py-2 bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 italic'
                          : isMine
                            ? isImageOnly
                              ? 'p-0 bg-transparent shadow-none'
                              : 'px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-tr-none shadow-sm'
                            : isImageOnly
                              ? 'p-0 bg-transparent shadow-none'
                              : 'px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-tl-none shadow-sm'
                          }`}
                      >
                        {replyTo && !isUnsent && (
                          <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 ${isMine ? 'bg-green-700/50 border-green-300 text-green-50' : 'bg-gray-100 dark:bg-gray-700 border-green-500 text-gray-600 dark:text-gray-300'}`}>
                            <p className="font-bold mb-0.5">{replyTo.sender_name}</p>
                            <p className="line-clamp-1 opacity-80">{replyTo.message}</p>
                          </div>
                        )}
                        {isUnsent ? (
                          <p className="text-xs">This message was unsent</p>
                        ) : (
                          <>
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
                            {msg.file_url && (
                              <div
                                className={`mb-2 p-3 rounded-xl border flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity w-full max-w-[260px] overflow-hidden ${isMine
                                  ? 'bg-green-700/30 border-green-500 text-white'
                                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                                  }`}
                                onClick={() => window.open(msg.download_url || msg.file_url, '_blank')}
                              >
                                <div className={`p-2 rounded-lg flex-shrink-0 ${isMine ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-sm font-medium truncate" title={msg.file_name || 'Document'}>
                                    {msg.file_name || 'Document'}
                                  </p>
                                  <p className="text-[10px] opacity-70">
                                    {msg.file_name?.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'DOCX Document'}
                                  </p>
                                </div>
                                <Download className="w-4 h-4 flex-shrink-0 opacity-70" />
                              </div>
                            )}
                            {msg.message && (
                              <div className="flex items-end gap-2 flex-wrap">
                                <p className="text-sm whitespace-pre-wrap break-words flex-1">{msg.message}</p>
                                {isEdited && (
                                  <button
                                    onClick={() => setViewingHistory(msg)}
                                    className={`text-[9px] uppercase font-bold tracking-tighter opacity-70 hover:opacity-100 transition-opacity underline cursor-pointer ${isMine ? 'text-green-100' : 'text-gray-400'}`}
                                  >
                                    (edited)
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {!isMine && !isUnsent && !caretakerMessagingRestricted && (
                        <div className="opacity-0 group-hover/msg:opacity-100 flex items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="p-1.5 hover:text-blue-500 transition-colors"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className={`text-[10px] mt-2 text-gray-500 dark:text-gray-500 px-2 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {formatTime(ts)}
                      {isMine && !isUnsent && (
                        <CheckCheck className={`w-3.5 h-3.5 ${msg.is_read ? 'text-blue-500' : 'text-gray-400'}`} />
                      )}
                    </p>
                  </div>
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

        {/* File Preview */}
        {selectedFile && (
          <div className="mb-4 relative inline-block">
            <div className={`p-4 rounded-xl border-2 border-green-500 bg-white dark:bg-gray-800 shadow-lg animate-in zoom-in duration-200 flex items-center gap-3`}>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="max-w-[150px]">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-gray-500 capitalize">{selectedFile.name.split('.').pop()} Document</p>
              </div>
              <button
                onClick={removeSelectedFile}
                className="ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 border-l-4 border-green-500 rounded-r-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Replying to {replyingTo.sender?.first_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{replyingTo.message}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors ml-2">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Edit Mode Indicator */}
        {editingMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-600 rounded-r-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Editing Message</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate italic">{editingMessage.message}</p>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setMessageText('');
              }}
              className="p-1 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-full transition-colors ml-2"
            >
              <X className="w-4 h-4 text-green-600" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <input
            type="file"
            ref={imageInputRef}
            onChange={(e) => handleImageSelect(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={docInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            accept=".pdf,.docx"
            className="hidden"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 flex-shrink-0"
            disabled={!canSendMessages}
            title="Attach photo"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => docInputRef.current?.click()}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 flex-shrink-0"
            disabled={!canSendMessages}
            title="Attach document"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center">
            <textarea
              ref={textareaRef}
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
            onClick={editingMessage ? handleEditMessage : handleSendMessage}
            disabled={!canSendMessages || sendingMessage || (!messageText.trim() && !imagePreview && !selectedFile)}
            className={`p-2.5 rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex-shrink-0 ${editingMessage ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            {sendingMessage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : editingMessage ? (
              <Pencil className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {
        isDetailsOpen && (
          <button
            type="button"
            onClick={() => setIsDetailsOpen(false)}
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:hidden"
            aria-label="Close details panel"
          />
        )
      }

      <aside
        className={`absolute top-0 right-0 z-30 h-full w-full sm:w-[360px] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-300 ${isDetailsOpen ? 'translate-x-0' : 'translate-x-full'
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
                  <span className="text-gray-500 dark:text-gray-400">Sex</span>
                  <span className="text-right font-semibold text-gray-900 dark:text-white capitalize">
                    {otherUser?.sex || otherUser?.identified_as || 'Not provided'}
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
                        {ageDisplay !== null ? `${ageDisplay} years old` : 'Not provided'}
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

            {isLandlordView && normalizedRole === 'landlord' && (
              <CaretakerAssignmentSection conversationId={selectedChat?.id} initialCaretakerId={selectedChat?.caretaker_id} />
            )}

            <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400">Media</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{mediaItems.length} photo{mediaItems.length === 1 ? '' : 's'}</span>
              </div>

              {mediaItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No photos shared in this conversation yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
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
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400">Files</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{fileItems.length} file{fileItems.length === 1 ? '' : 's'}</span>
              </div>

              {fileItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No files shared in this conversation yet.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto pr-1 space-y-2">
                  {fileItems.map((item) => {
                    const ext = item.file_name.split('.').pop().toUpperCase();
                    const isPdf = ext === 'PDF';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => window.open(item.file_url, '_blank', 'noopener,noreferrer')}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left group"
                        title={`Open ${item.file_name}`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isPdf ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                          <FileText className={`w-4 h-4 ${isPdf ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{item.file_name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {item.created_at ? formatTime(item.created_at) : ''}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isPdf ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                          {ext}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {(normalizedRole === 'tenant' || normalizedRole === 'landlord') && (
              <section className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deletingConversation}
                  className="w-full text-left text-sm font-semibold text-red-600 dark:text-red-400 disabled:opacity-60 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingConversation ? 'Deleting conversation...' : 'Delete Conversation'}
                </button>
                <p className="text-xs mt-1 text-red-500/80 dark:text-red-300/70">
                  This only removes the chat from your view.
                </p>
              </section>
            )}
          </div>
        </div>
      </aside>

      {/* Delete Conversation Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Conversation?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                Are you sure you want to delete this conversation from your inbox? This action only removes it from your view and cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteConversation();
                  setShowDeleteModal(false);
                }}
                disabled={deletingConversation}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deletingConversation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deletingConversation ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message History Modal */}
      {
        viewingHistory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Message History</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Previous versions</p>
                </div>
                <button
                  onClick={() => setViewingHistory(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                  <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">Current Version</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingHistory.message}</p>
                </div>

                {viewingHistory.histories?.length > 0 ? (
                  viewingHistory.histories.slice().reverse().map((history, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        {formatTime(history.created_at)}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{history.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-gray-500 text-sm">No history available.</p>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setViewingHistory(null)}
                  className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

const CaretakerAssignmentSection = ({ conversationId, initialCaretakerId }) => {
  const [caretakers, setCaretakers] = useState([]);
  const [assignedId, setAssignedId] = useState(initialCaretakerId || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAssignedId(initialCaretakerId || '');
  }, [initialCaretakerId, conversationId]);

  useEffect(() => {
    const fetchCaretakers = async () => {
      try {
        const res = await api.get('/landlord/caretakers');
        if (res.data?.success) {
          setCaretakers(res.data.data.map(c => c.caretaker));
        }
      } catch (_err) {
        // Fail silently or handle error
      }
    };
    fetchCaretakers();
  }, []);

  const handleAssign = async (e) => {
    const cId = e.target.value;
    setIsLoading(true);
    try {
      await api.patch(`/messages/${conversationId}/caretaker`, { caretaker_id: cId || null });
      setAssignedId(cId);
      showSuccess(cId ? 'Caretaker assigned to conversation.' : 'Caretaker unassigned.');
    } catch (_err) {
      showError('Failed to update caretaker assignment.');
      setAssignedId(initialCaretakerId || '');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-4">
      <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400 mb-3">Role Assignment</p>
      <div className="space-y-2 text-sm">
        <label className="block text-gray-500 dark:text-gray-400 text-xs">Assigned Caretaker</label>
        <select
          value={assignedId}
          onChange={handleAssign}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm font-semibold"
        >
          <option value="">Unassigned (Landlord Only)</option>
          {caretakers.map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>
        {isLoading && <p className="text-xs text-blue-500">Saving...</p>}
      </div>
    </section>
  );
};

export default ChatArea;
