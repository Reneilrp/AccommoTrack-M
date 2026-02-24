import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MessageService from '../../../services/MessageService';
import createEcho from '../../../services/echo.js';
import { styles } from '../../../styles/Landlord/Messages.js';
import { useTheme } from '../../../contexts/ThemeContext';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getInitials = (user) => {
  if (!user) return 'TN';
  const first = user.first_name?.[0] || user.firstName?.[0] || '';
  const last = user.last_name?.[0] || user.lastName?.[0] || '';
  const fallback = user.full_name || user.name || '';
  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }
  return fallback
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TN';
};

const resolveSenderId = (message) =>
  message?.sender_id ||
  message?.senderId ||
  message?.user_id ||
  message?.userId ||
  message?.from_id ||
  message?.sender?.id ||
  message?.sender?.user_id ||
  null;

export default function MessagesScreen({ navigation, route }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [newConversationId, setNewConversationId] = useState(null);
  const messageScrollRef = useRef(null);
  const echoRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messageScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('user');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const userId = parsed?.id || parsed?.user_id || parsed?.user?.id;
      setCurrentUserId(userId || null);
    } catch (err) {
      console.warn('Failed to parse stored user', err.message);
      setCurrentUserId(null);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      const response = await MessageService.getConversations();
      if (!response.success) {
        Alert.alert('Messages', response.error);
        setConversations([]);
      } else {
        setConversations(response.data || []);
      }
    } catch (err) {
      Alert.alert('Messages', err.message || 'Unable to load conversations');
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        setLoadingMessages(true);
        const response = await MessageService.getConversationMessages(conversationId);
        if (!response.success) {
          Alert.alert('Messages', response.error);
          setMessages([]);
        } else {
          setMessages(response.data || []);
          scrollToBottom();
        }
      } catch (err) {
        Alert.alert('Messages', err.message || 'Unable to load messages');
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    if (!selectedConversation?.id) return;
    fetchMessages(selectedConversation.id);
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    if (!selectedConversation?.id) return;
    let isMounted = true;
    const subscribe = async () => {
      try {
        const echo = await createEcho();
        if (!isMounted) {
          echo.disconnect();
          return;
        }
        if (echoRef.current) {
          echoRef.current.leave(`conversation.${selectedConversation.id}`);
        }
        echoRef.current = echo;
        echo
          .private(`conversation.${selectedConversation.id}`)
          .listen('.message.sent', (event) => {
            setMessages((prev) => [...prev, event.message]);
            scrollToBottom();
          });
      } catch (err) {
        console.warn('Echo subscription failed', err.message);
      }
    };
    subscribe();
    return () => {
      isMounted = false;
      if (echoRef.current) {
        echoRef.current.leave(`conversation.${selectedConversation.id}`);
      }
    };
  }, [selectedConversation, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;
    const text = messageText.trim();
    setMessageText('');

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      message: text,
      sender_id: currentUserId,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    setSending(true);
    const response = await MessageService.sendMessage(selectedConversation.id, text);
    setSending(false);

    if (!response.success) {
      Alert.alert('Messages', response.error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      return;
    }

    setMessages((prev) =>
      prev.map((msg) => (msg.id === optimisticMessage.id ? response.data : msg))
    );

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? { ...conv, last_message: response.data, last_message_at: response.data?.created_at }
          : conv
      )
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    if (selectedConversation?.id) {
      await fetchMessages(selectedConversation.id);
    }
    setRefreshing(false);
  }, [fetchConversations, fetchMessages, selectedConversation]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conv) => {
      const name = `${conv.other_user?.first_name || ''} ${conv.other_user?.last_name || ''}`.toLowerCase();
      const property = conv.property?.title?.toLowerCase() || '';
      return name.includes(query) || property.includes(query);
    });
  }, [conversations, searchQuery]);

  const handleStartConversation = useCallback(async () => {
    const params = route?.params;
    if (!params?.startConversation || !params?.tenant) return;
    setInitialLoading(true);
    try {
      const tenant = params.tenant;
      const recipientId =
        tenant.user_id || tenant.userId || tenant.id || tenant.user?.id || tenant.tenant_id;
      if (!recipientId) {
        throw new Error('Unable to determine tenant account for messaging.');
      }
      const payload = {
        recipient_id: recipientId,
        property_id:
          params.propertyId || tenant.property_id || tenant.room?.property_id || tenant.room?.propertyId
      };
      const response = await MessageService.startConversation(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to start conversation');
      }
      await fetchConversations();
      const conversation = response.data?.conversation || response.data;
      if (conversation?.id) {
        setNewConversationId(conversation.id);
        setSelectedConversation(conversation);
      }
    } catch (err) {
      Alert.alert('Messages', err.message || 'Unable to start conversation');
    } finally {
      setInitialLoading(false);
      navigation.setParams({ startConversation: false, tenant: null, propertyId: null });
    }
  }, [fetchConversations, navigation, route?.params]);

  useEffect(() => {
    handleStartConversation();
  }, [handleStartConversation]);

  const renderConversation = ({ item }) => {
    const initials = getInitials(item.other_user);
    const isNew = newConversationId === item.id;
    return (
      <TouchableOpacity
        style={[styles.conversationItem, isNew && styles.newConversation]}
        onPress={() => {
          setSelectedConversation(item);
          if (isNew) {
            setNewConversationId(null);
          }
        }}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {item.other_user?.first_name} {item.other_user?.last_name}
            </Text>
            <Text style={styles.conversationTime}>{formatTime(item.last_message_at)}</Text>
          </View>
          {item.property?.title ? (
            <Text style={styles.propertyName} numberOfLines={1}>
              {item.property.title}
            </Text>
          ) : null}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message?.message || 'No messages yet'}
          </Text>
        </View>

        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderListScreen = () => (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loadingList ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Message a tenant from their profile to start chatting
          </Text>
        </View>
      ) : (
          <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderConversation}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
        </View>
  );

  const renderChatScreen = () => {
    const tenant = selectedConversation?.other_user;
    const propertyName = selectedConversation?.property?.title;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.chatScreenHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedConversation(null)}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatHeaderAvatar}>
              <Text style={styles.chatHeaderAvatarText}>{getInitials(tenant)}</Text>
            </View>
            <View style={styles.chatHeaderText}>
              <Text style={styles.chatHeaderName} numberOfLines={1}>
                {tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant' : 'Tenant'}
              </Text>
              {propertyName ? <Text style={styles.chatHeaderProperty}>{propertyName}</Text> : null}
            </View>
          </View>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={messageScrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
          >
            {propertyName ? (
              <View style={styles.propertyCard}>
                <Ionicons name="home-outline" size={24} color={theme.colors.primary} />
                <View style={styles.propertyCardInfo}>
                  <Text style={styles.propertyCardTitle}>{propertyName}</Text>
                  <Text style={styles.propertyCardSubtitle}>Conversation about this property</Text>
                </View>
              </View>
            ) : null}

            {loadingMessages ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : null}

            {!loadingMessages && messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                <Text style={styles.emptyMessagesSubtext}>Say hello to start the conversation!</Text>
              </View>
            ) : null}

            {messages.map((message) => {
              const senderId = resolveSenderId(message);
              const isMine = senderId && currentUserId && Number(senderId) === Number(currentUserId);
              return (
                <View
                  key={message.id || message.created_at || Math.random().toString()}
                  style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}
                >
                  <View
                    style={[
                      styles.messageContent,
                      isMine ? styles.myMessageContent : styles.theirMessageContent
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isMine ? styles.myMessageBubble : styles.theirMessageBubble
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMine ? styles.myMessageText : styles.theirMessageText
                        ]}
                      >
                        {message.message || message.body || ''}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>{formatTime(message.created_at || message.updated_at)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
              <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Opening conversation...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedConversation ? renderChatScreen() : renderListScreen()}
    </View>
  );
}
