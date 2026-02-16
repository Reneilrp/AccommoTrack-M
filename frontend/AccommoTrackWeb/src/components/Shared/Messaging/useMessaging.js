import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../../utils/api';
import createEcho from '../../../utils/echo';
import toast from 'react-hot-toast';
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

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
    toast.error('Caretaker access for messages is currently view-only.');
    return true;
  }, [canSendMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      if (conversations.length === 0) setLoading(true);
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
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (readOnlyGuard()) return;
    if (!messageText.trim() && !selectedImage) return;
    if (!selectedChat) return;

    setSendingMessage(true);
    try {
      let response;
      if (selectedImage) {
        const formData = new FormData();
        formData.append('conversation_id', selectedChat.id);
        formData.append('message', messageText || '');
        formData.append('image', selectedImage);
        
        response = await api.post('/messages/send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/messages/send', {
          conversation_id: selectedChat.id,
          message: messageText,
        });
      }

      const newMessage = response.data;
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
      removeSelectedImage();
      
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat.id
            ? { ...conv, last_message: newMessage, last_message_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

  // User ID extraction logic
  const currentUserId = (() => {
    try {
      const stored = localStorage.getItem('user_id');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) return parseInt(parsed.id, 10);
          return parseInt(stored, 10);
        } catch (e) { return parseInt(stored, 10); }
      }
      const userRaw = localStorage.getItem('user') || localStorage.getItem('userData');
      if (userRaw) {
        const parsedUser = JSON.parse(userRaw);
        return parseInt(parsedUser.id || parsedUser.user_id, 10);
      }
    } catch (err) { return null; }
    return null;
  })();

  // Effects
  useEffect(() => {
    const initChat = async () => {
      if (location.state?.startConversation) {
        const { recipient_id, property_id } = location.state.startConversation;
        try {
          const res = await api.post('/messages/start', { recipient_id, property_id });
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
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      echoRef.current = createEcho();
      if (echoRef.current) {
        try {
          echoRef.current
            .private(`conversation.${selectedChat.id}`)
            .listen('.message.sent', (e) => {
              setMessages((prev) => [...prev, e.message]);
              scrollToBottom();
            });
        } catch (err) { console.warn('Echo subscription failed:', err); }
      }
      return () => {
        if (echoRef.current) echoRef.current.leave(`conversation.${selectedChat.id}`);
      };
    }
  }, [selectedChat]);

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
    formatTime,
    getInitials,
    currentUserId,
    normalizedRole,
    messagesEndRef,
    selectedImage,
    imagePreview,
    handleImageSelect,
    removeSelectedImage
  };
};
