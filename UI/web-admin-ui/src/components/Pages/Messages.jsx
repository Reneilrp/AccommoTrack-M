import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Phone,
  MoreVertical,
  Paperclip,
  Send,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import createEcho from '../../utils/echo';
import api from '../../utils/api';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const echoRef = useRef(null);

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

      // Listen for new messages
      echoRef.current
        .private(`conversation.${selectedChat.id}`)
        .listen('.message.sent', (e) => {
          setMessages((prev) => [...prev, e.message]);
          scrollToBottom();
        });

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

  const filteredConversations = conversations.filter((conv) => {
    const name = `${conv.other_user?.first_name} ${conv.other_user?.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
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
                const isMine = String(senderId) === String(currentUserId);
                // Debug first few messages to inspect sender ids and comparison
                if (idx < 5) {
                  console.log('Messages debug', { idx, id: msg.id, rawSender: msg.sender_id || msg.sender, senderId, currentUserId, isMine });
                }
                const getTimestamp = (m) => {
                  if (!m) return null;
                  return (
                    m.created_at || m.createdAt || m.sent_at || m.sentAt || m.timestamp || m.time || m.date || m.updated_at || m.updatedAt || null
                  );
                };

                let ts = getTimestamp(msg);
                // Fallbacks: try message-level fallback or conversation last_message_at, otherwise now
                if (!ts) ts = msg.last_message_at || msg.lastMessageAt || new Date().toISOString();

                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}> 
                      <div
                        className={`w-auto px-4 py-2 rounded-lg ${
                          isMine
                            ? 'bg-green-700 text-white'
                            : 'bg-green-50 text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <p className={`text-xs mt-2 text-gray-500`}>
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
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Paperclip className="w-6 h-6 text-gray-600" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim()}
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
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversation selected</h3>
              <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}