import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Phone,
  MoreVertical,
  Paperclip,
  Send,
  MessageCircle,
  Loader2,
  AlertTriangle,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react';
import createEcho from '../../../utils/echo';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function Messages({ user, accessRole = 'landlord' }) {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterProperty, setFilterProperty] = useState('');
  const messagesEndRef = useRef(null);
  const echoRef = useRef(null);
  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};
  const canSendMessages = !isCaretaker || Boolean(caretakerPermissions.messages);
  const caretakerMessagingRestricted = isCaretaker && !caretakerPermissions.messages;

  const readOnlyGuard = useCallback(() => {
    if (canSendMessages) return false;
    toast.error('Caretaker access for messages is currently view-only.');
    return true;
  }, [canSendMessages]);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Set up Echo listener when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);

      // Initialize Echo
      echoRef.current = createEcho();

      // Listen for new messages (only if Echo was created)
      if (echoRef.current) {
        try {
          echoRef.current
            .private(`conversation.${selectedChat.id}`)
            .listen('.message.sent', (e) => {
              setMessages((prev) => [...prev, e.message]);
              scrollToBottom();
            });
        } catch (err) {
          console.warn('Echo subscription failed:', err);
        }
      } else {
        console.warn('Echo not initialized; skipping real-time subscriptions.');
      }

      // Cleanup on unmount or chat change
      return () => {
        if (echoRef.current) {
          echoRef.current.leave(`conversation.${selectedChat.id}`);
        }
      };
    }
  }, [selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/messages/conversations');
      const data = res.data;
      
      // FIX: Ensure data is always an array
      setConversations(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setConversations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      const data = res.data;
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (readOnlyGuard()) return;
    if (!messageText.trim() || !selectedChat) return;

    setSendingMessage(true);
    try {
      const res = await api.post('/messages/send', {
        conversation_id: selectedChat.id,
        message: messageText,
      });

      const newMessage = res.data;
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
      
      // Update conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat.id
            ? { ...conv, last_message: newMessage, last_message_at: new Date() }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (user) => {
    if (!user) return '??';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  // Get unique properties from conversations for filter options
  const propertyOptions = [...new Map(
    conversations
      .filter(conv => conv.property)
      .map(conv => [conv.property.id, conv.property])
  ).values()];

  const filteredConversations = conversations.filter((conv) => {
    const name = `${conv.other_user?.first_name} ${conv.other_user?.last_name}`.toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    
    // Apply property filter
    const matchesProperty = !filterProperty || conv.property?.id === parseInt(filterProperty);
    
    return matchesSearch && matchesProperty;
  });

  const activeFiltersCount = filterProperty ? 1 : 0;

  const clearFilters = () => {
    setFilterProperty('');
  };

  // Read user_id from localStorage. Some clients store whole user object,
  // so parse safely and extract `.id` when present, otherwise fall back to integer.
  let currentUserId = null;
  try {
    const stored = localStorage.getItem('user_id');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          currentUserId = parseInt(parsed.id, 10);
        } else {
          const maybe = parseInt(stored, 10);
          currentUserId = Number.isNaN(maybe) ? null : maybe;
        }
      } catch (e) {
        const maybe = parseInt(stored, 10);
        currentUserId = Number.isNaN(maybe) ? null : maybe;
      }
    }
  } catch (err) {
    console.error('Failed to read currentUserId from localStorage', err);
    currentUserId = null;
  }

  // Additional fallback: try reading full user object from localStorage (keys: 'user' or 'userData')
  if (!currentUserId) {
    try {
      const userRaw = localStorage.getItem('user') || localStorage.getItem('userData');
      if (userRaw) {
        const parsedUser = JSON.parse(userRaw);
        if (parsedUser && (parsedUser.id || parsedUser.user_id)) {
          currentUserId = parseInt(parsedUser.id || parsedUser.user_id, 10);
        }
      }
    } catch (err) {
      // ignore
    }
  }

  console.log('Messages: currentUserId=', currentUserId, 'localStorage.user_id=', localStorage.getItem('user_id'), 'localStorage.user=', localStorage.getItem('user'), 'localStorage.userData=', localStorage.getItem('userData'));

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Messages</h2>
          
          {/* Search and Filter Row */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2 border rounded-lg transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-green-50 border-green-500 text-green-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Filters</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>
              
              {/* Property Filter */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Property</label>
                <div className="relative">
                  <select
                    value={filterProperty}
                    onChange={(e) => setFilterProperty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-sm"
                  >
                    <option value="">All Properties</option>
                    {propertyOptions.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title || prop.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {caretakerMessagingRestricted && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>Read-only caretaker access. Sending new messages is disabled.</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={`w-full p-4 flex items-start gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedChat?.id === conv.id ? 'bg-green-50' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold">
                      {getInitials(conv.other_user)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {conv.other_user?.first_name} {conv.other_user?.last_name}
                      </p>
                      {conv.property && (
                        <p className="text-xs text-gray-500">{conv.property.title}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conv.last_message?.message || 'No messages yet'}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">{conv.unread_count}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {getInitials(selectedChat.other_user)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedChat.other_user?.first_name} {selectedChat.other_user?.last_name}
                  </p>
                  {selectedChat.property && (
                    <p className="text-xs text-gray-500">{selectedChat.property.title}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => {
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
                
                // Determine if message is "ours" (on the right side)
                // - For landlord: sender_id matches currentUserId
                // - For caretaker: sender_id matches the landlord they work for (all landlord-side messages on right)
                //   This includes both landlord's own messages AND caretaker messages sent on behalf of landlord
                const isCurrentUserCaretaker = normalizedRole === 'caretaker';
                
                // For caretakers, we check if the message sender is the landlord (sender.role === 'landlord')
                // OR if the message has sender_role of 'landlord' or 'caretaker' (for messages with new tracking)
                // The sender_id for all landlord-side messages equals the landlord's user ID
                const senderRole = msg.sender?.role;
                const isFromLandlordSide = senderRole === 'landlord' || msg.sender_role === 'caretaker' || msg.sender_role === 'landlord';
                
                // For caretaker: show landlord-side messages on right
                // For landlord: show messages they sent (sender_id matches their user id) on right
                const isMine = isCurrentUserCaretaker
                  ? isFromLandlordSide  // Caretaker sees all landlord-side messages on right
                  : String(senderId) === String(currentUserId);  // Landlord sees their own messages on right
                
                // Check if this message was sent by a caretaker (for indicator label)
                const isCaretakerMessage = msg.sender_role === 'caretaker';
                // Check if sent by the current caretaker user
                const isSentByCurrentCaretaker = isCaretakerMessage && actualSenderId && String(actualSenderId) === String(currentUserId);
                
                // Debug first few messages
                if (idx < 3) {
                  console.log('Messages debug', { idx, senderId, actualSenderId, currentUserId, isMine, isCaretakerMessage, isFromLandlordSide, normalizedRole });
                }
                
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
                    key={msg.id}
                    className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}> 
                      {/* Role indicator for caretaker messages - only show if sent by caretaker */}
                      {isCaretakerMessage && msg.actual_sender && (
                        <p className="text-xs mb-1 text-gray-500 font-medium">
                          {isSentByCurrentCaretaker
                            ? 'You (Caretaker)'
                            : `via ${msg.actual_sender.first_name} ${msg.actual_sender.last_name} (Caretaker)`
                          }
                        </p>
                      )}
                      <div
                        className={`w-auto px-4 py-2 rounded-lg ${
                          isMine
                            ? 'bg-green-700 text-white'
                            : 'bg-green-50 text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <p className="text-xs mt-1 text-gray-500">
                        {formatTime(ts)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              {caretakerMessagingRestricted && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <p>Actions disabled because you are viewing as a caretaker.</p>
                </div>
              )}
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" disabled={!canSendMessages}>
                  <Paperclip className="w-6 h-6 text-gray-600" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && canSendMessages && handleSendMessage()}
                  placeholder={caretakerMessagingRestricted ? 'Caretaker mode: messaging disabled' : 'Type a message...'}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={!canSendMessages}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!canSendMessages || sendingMessage || !messageText.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          filteredConversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600">You don't have any messages yet. Messages from tenants regarding your properties will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversation selected</h3>
                <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}