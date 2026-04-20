import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../../utils/api';
import createEcho from '../../../utils/echo';
import { showSuccess, showError } from '../../../utils/toast';
import { useUIState } from '../../../contexts/UIStateContext';

export const useMessaging = (user, accessRole = 'landlord') => {
  const location = useLocation();
  const { uiState, updateScreenState, updateData } = useUIState();
  const cachedConversations = uiState.data?.messages || [];
  
  // Destructure UI state for messages sidebar
  const { searchQuery, showFilters, filterProperty } = uiState.messages || {
    searchQuery: "",
    showFilters: false,
    filterProperty: ""
  };

  const [conversations, setConversations] = useState(cachedConversations);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(conversations.length === 0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImageSelect = (file) => {
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleFileSelect = (file) => {
    if (file) {
      const allowedDocExtensions = ['.pdf', '.docx'];
      const fileName = file.name.toLowerCase();
      const isValid = allowedDocExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValid) {
        showError('Only .pdf and .docx files are allowed.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // Wrapped setters for UI state
  const setSearchQuery = (val) => updateScreenState('messages', { searchQuery: val });
  const setShowFilters = (val) => updateScreenState('messages', { showFilters: val });
  const setFilterProperty = (val) => updateScreenState('messages', { filterProperty: val });
  const messagesEndRef = useRef(null);
  const echoRef = useRef(null);

  const normalizedRole = accessRole || user?.role || 'landlord';
  const isCaretaker = normalizedRole === 'caretaker';
  const caretakerPermissions = user?.caretaker_permissions || {};
  const canSendMessages = !isCaretaker || Boolean(caretakerPermissions.messages);
  const caretakerMessagingRestricted = isCaretaker && !caretakerPermissions.messages;

  const readOnlyGuard = useCallback(() => {
    if (canSendMessages) return false;
    showError('Caretaker access for messages is currently view-only.');
    return true;
  }, [canSendMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const appendUniqueMessage = useCallback((prevMessages, incomingMessage) => {
    if (!incomingMessage) return prevMessages;

    const incomingId = incomingMessage.id;
    if (incomingId !== undefined && incomingId !== null) {
      const exists = prevMessages.some((msg) => String(msg.id) === String(incomingId));
      if (exists) return prevMessages;
    }

    return [...prevMessages, incomingMessage];
  }, []);

  const initialLoadRef = useRef(conversations.length === 0);

  const fetchConversations = useCallback(async () => {
    try {
      if (initialLoadRef.current) setLoading(true);
      initialLoadRef.current = false;
      const res = await api.get('/messages/conversations');
      const data = res.data;
      const conversationsList = Array.isArray(data) ? data : [];
      setConversations(conversationsList);
      updateData('messages', conversationsList);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [updateData]);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const res = await api.get(`/messages/conversations/${conversationId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  // Reset states when switching chats
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setMessageText('');
    removeSelectedImage();
  }, [selectedChat?.id]);

  const markConversationAsRead = useCallback(async (conversationId) => {
    try {
      await api.post(`/messages/${conversationId}/read`);
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
      setMessages(prev => 
        prev.map(msg => !msg.is_mine && !msg.is_read ? { ...msg, is_read: true } : msg)
      );
    } catch (err) {
      console.error('Failed to mark conversation as read:', err);
    }
  }, []);
  const handleSendMessage = async () => {
    if (readOnlyGuard()) return;
    if (!messageText.trim() && !selectedImage && !selectedFile) return;
    if (!selectedChat) return;

    setSendingMessage(true);
    try {
      let response;
      if (selectedImage || selectedFile) {
        const formData = new FormData();
        formData.append('conversation_id', selectedChat.id);
        if (messageText) formData.append('message', messageText);
        if (selectedImage) formData.append('image', selectedImage);
        if (selectedFile) formData.append('file', selectedFile);
        if (replyingTo) formData.append('reply_to_id', replyingTo.id);
        
        response = await api.post('/messages/send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/messages/send', {
          conversation_id: selectedChat.id,
          message: messageText,
          reply_to_id: replyingTo?.id || null,
        });
      }

      const newMessage = response.data;
      setMessages((prev) => appendUniqueMessage(prev, newMessage));
      setMessageText('');
      setReplyingTo(null);
      removeSelectedImage();
      setSelectedFile(null);
      
      // Stop typing on send
      if (echoRef.current && selectedChat) {
        echoRef.current.private(`conversation.${selectedChat.id}`).whisper('typing', { typing: false });
      }
      
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat.id
            ? { ...conv, last_message: newMessage, last_message_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      showError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUnsend = async (messageId) => {
    if (readOnlyGuard()) return;
    
    try {
      const response = await api.patch(`/messages/${messageId}/unsend`);
      const updatedMessage = response.data;
      
      setMessages((prev) => 
        prev.map((msg) => 
          String(msg.id) === String(messageId) ? updatedMessage : msg
        )
      );

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat.id && String(conv.last_message?.id) === String(messageId)
            ? { ...conv, last_message: updatedMessage }
            : conv
        )
      );

      showSuccess('Message unsent');
    } catch (err) {
      console.error('Failed to unsend message:', err);
      showError(err.response?.data?.message || 'Failed to unsend message');
    }
  };

  const handleEditMessage = async () => {
    if (readOnlyGuard()) return;
    if (!messageText.trim() || !editingMessage) return;

    setSendingMessage(true);
    try {
      const response = await api.patch(`/messages/${editingMessage.id}/edit`, {
        message: messageText,
      });
      const updatedMessage = response.data;

      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(editingMessage.id) ? updatedMessage : msg
        )
      );

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat.id && String(conv.last_message?.id) === String(editingMessage.id)
            ? { ...conv, last_message: updatedMessage }
            : conv
        )
      );

      setMessageText('');
      setEditingMessage(null);
      showSuccess('Message updated');
    } catch (err) {
      console.error('Failed to edit message:', err);
      showError(err.response?.data?.message || 'Failed to edit message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (readOnlyGuard()) return;
    if (!selectedChat?.id) return;

    setDeletingConversation(true);
    try {
      await api.delete(`/messages/conversations/${selectedChat.id}`);
      setConversations((prev) => prev.filter((conv) => String(conv.id) !== String(selectedChat.id)));
      setSelectedChat(null);
      setMessages([]);
      showSuccess('Conversation deleted from your inbox');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      showError(err.response?.data?.message || 'Failed to delete conversation');
    } finally {
      setDeletingConversation(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday - startOfMessageDay) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (user) => {
    if (!user) return '??';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  const propertyOptions = [...new Map(
    conversations
      .filter(conv => conv.property)
      .map(conv => [conv.property.id, conv.property])
  ).values()];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unreadCount = conversations.reduce(
      (sum, conv) => sum + (Number(conv?.unread_count) || 0),
      0,
    );

    try {
      localStorage.setItem('messages_unread_count', String(unreadCount));
      window.dispatchEvent(
        new CustomEvent('accommo:messages-unread-updated', {
          detail: { count: unreadCount },
        }),
      );
    } catch (_error) {
      // Ignore storage failures in restricted browser contexts.
    }
  }, [conversations]);

  // User ID extraction logic
  const currentUserId = (() => {
    try {
      const stored = localStorage.getItem('user_id');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) return parseInt(parsed.id, 10);
          return parseInt(stored, 10);
        } catch (__e) { return parseInt(stored, 10); }
      }
      const userRaw = localStorage.getItem('user') || localStorage.getItem('userData');
      if (userRaw) {
        const parsedUser = JSON.parse(userRaw);
        return parseInt(parsedUser.id || parsedUser.user_id, 10);
      }
    } catch (__err) { return null; }
    return null;
  })();

  // Effects
  useEffect(() => {
    const initChat = async () => {
      // Check both formats: startConversation object or flat params
      const startParams = location.state?.startConversation || {};
      const recipientParam = location.state?.recipient || {};
      const propertyParam = location.state?.property || {};

      const recipient_id = startParams.recipient_id || startParams.landlord_id || recipientParam.id;
      const property_id = startParams.property_id || propertyParam.id;
      
      const shouldStart = location.state?.startConversation || location.state?.startConversation === true;

      if (shouldStart && recipient_id) {
        try {
          const res = await api.post('/messages/start', { 
            recipient_id, 
            property_id 
          });
          const conversation = res.data;
          if (conversation) {
            setConversations(prev => {
              if (prev.find(c => c.id === conversation.id)) return prev;
              return [conversation, ...prev];
            });
            setSelectedChat(conversation);
          }
          window.history.replaceState({}, document.title);
        } catch (error) {
          console.error("Failed to start conversation", error);
        }
      }
    };
    initChat();
  }, [location.state]);

  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.is_mine && !lastMsg.is_read) {
        markConversationAsRead(selectedChat.id);
      }
    }
  }, [selectedChat, messages, markConversationAsRead]);

  // Handle Typing Whisper
  useEffect(() => {
    if (!selectedChat || !echoRef.current) return;
    
    if (messageText.length > 0) {
      echoRef.current.private(`conversation.${selectedChat.id}`).whisper('typing', { typing: true });
    } else {
      echoRef.current.private(`conversation.${selectedChat.id}`).whisper('typing', { typing: false });
    }
  }, [messageText, selectedChat]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      echoRef.current = createEcho();
      if (echoRef.current) {
        try {
          echoRef.current
            .private(`conversation.${selectedChat.id}`)
            .listen('.message.sent', (e) => {
              const incomingMessage = e.message;
              setMessages((prev) => {
                const exists = prev.some((msg) => String(msg.id) === String(incomingMessage.id));
                if (exists) {
                  return prev.map((msg) => 
                    String(msg.id) === String(incomingMessage.id) ? incomingMessage : msg
                  );
                }
                return [...prev, incomingMessage];
              });
              scrollToBottom();

              // If current chat is active, mark it as read
              if (!incomingMessage.is_mine) {
                markConversationAsRead(selectedChat.id);
              }
            })
            .listen('.message.read', (e) => {
              setMessages((prev) => 
                prev.map(msg => 
                  String(msg.receiver_id) === String(e.reader_id) 
                    ? { ...msg, is_read: true, read_at: e.read_at } 
                    : msg
                )
              );
            })
            .listenForWhisper('typing', (e) => {
              setIsOtherTyping(e.typing);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (e.typing) {
                typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
              }
            });
        } catch (err) { console.warn('Echo subscription failed:', err); }
      }
      return () => {
        if (echoRef.current) echoRef.current.leave(`conversation.${selectedChat.id}`);
      };
    }
  }, [selectedChat, fetchMessages, appendUniqueMessage, markConversationAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return {
    conversations,
    selectedChat,
    setSelectedChat,
    messages,
    messageText,
    setMessageText,
    loading,
    sendingMessage,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterProperty,
    setFilterProperty,
    propertyOptions,
    canSendMessages,
    caretakerMessagingRestricted,
    handleSendMessage,
    handleUnsend,
    formatTime,
    getInitials,
    currentUserId,
    normalizedRole,
    messagesEndRef,
    selectedImage,
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
  };
};
