import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createEcho from '../../utils/echo';
import { styles } from '../../../styles/Tenant/MessagesPage';

const API_URL = 'http://10.251.236.156:8000/api';

export default function MessagesPage({ navigation }) {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const scrollViewRef = useRef(null);
    const echoRef = useRef(null);

    const getAuthHeaders = async () => {
        const token = await AsyncStorage.getItem('auth_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    };

    // Get current user ID on mount
    useEffect(() => {
        const getUserId = async () => {
            const userId = await AsyncStorage.getItem('user_id');
            setCurrentUserId(parseInt(userId));
        };
        getUserId();
        fetchConversations();
    }, []);

    // Set up Echo listener when chat is selected
    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat.id);
            setupEcho();

            return () => {
                if (echoRef.current) {
                    echoRef.current.leave(`conversation.${selectedChat.id}`);
                }
            };
        }
    }, [selectedChat]);

    const setupEcho = async () => {
        try {
            echoRef.current = await createEcho();
            
            echoRef.current
                .private(`conversation.${selectedChat.id}`)
                .listen('.message.sent', (e) => {
                    setMessages((prev) => [...prev, e.message]);
                    scrollToBottom();
                });
        } catch (err) {
            console.error('Echo setup failed:', err);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const fetchConversations = async () => {
    try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/messages/conversations`, { headers });
        const data = await res.json();
        
        console.log('API Response:', data); // Add this line
        console.log('Is Array?', Array.isArray(data)); // Add this line
        
        setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error('Failed to load conversations:', err);
        setConversations([]);
    } finally {
        setLoading(false);
    }
};
    const fetchMessages = async (conversationId) => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/messages/${conversationId}`, { headers });
            const data = await res.json();
            setMessages(data);
            scrollToBottom();
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedChat) return;

        setSendingMessage(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/messages/send`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    conversation_id: selectedChat.id,
                    message: messageText,
                }),
            });

            const newMessage = await res.json();
            setMessages((prev) => [...prev, newMessage]);
            setMessageText('');
            scrollToBottom();

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

    const filteredConversations = Array.isArray(conversations) 
    ? conversations.filter((conv) => {
        const name = `${conv.other_user?.first_name} ${conv.other_user?.last_name}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    })
    : [];

    // Chat List Screen
    const renderChatList = () => (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
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

            {/* Conversations List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#16a34a" />
                    <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
            ) : filteredConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptySubtitle}>Start chatting with a landlord</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item: conv }) => (
                        <TouchableOpacity
                            style={styles.conversationItem}
                            onPress={() => setSelectedChat(conv)}
                        >
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{getInitials(conv.other_user)}</Text>
                                </View>
                            </View>

                            <View style={styles.conversationInfo}>
                                <View style={styles.conversationHeader}>
                                    <Text style={styles.conversationName}>
                                        {conv.other_user?.first_name} {conv.other_user?.last_name}
                                    </Text>
                                    <Text style={styles.conversationTime}>
                                        {formatTime(conv.last_message_at)}
                                    </Text>
                                </View>
                                {conv.property && (
                                    <Text style={styles.propertyName}>{conv.property.title}</Text>
                                )}
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    {conv.last_message?.message || 'No messages yet'}
                                </Text>
                            </View>

                            {conv.unread_count > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadCount}>{conv.unread_count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );

    // Chat Screen
    const renderChatScreen = () => (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

            {/* Chat Header */}
            <View style={styles.chatHeader}>
                <TouchableOpacity
                    onPress={() => setSelectedChat(null)}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.chatHeaderInfo}>
                    <View style={styles.chatHeaderAvatar}>
                        <Text style={styles.chatHeaderAvatarText}>
                            {getInitials(selectedChat.other_user)}
                        </Text>
                    </View>
                    <View style={styles.chatHeaderText}>
                        <Text style={styles.chatHeaderName}>
                            {selectedChat.other_user?.first_name} {selectedChat.other_user?.last_name}
                        </Text>
                        {selectedChat.property && (
                            <Text style={styles.chatHeaderProperty}>{selectedChat.property.title}</Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
            >
                {/* Property Info Card */}
                {selectedChat.property && (
                    <View style={styles.propertyCard}>
                        <Ionicons name="home-outline" size={24} color="#16a34a" />
                        <View style={styles.propertyCardInfo}>
                            <Text style={styles.propertyCardTitle}>{selectedChat.property.title}</Text>
                            <Text style={styles.propertyCardSubtitle}>Conversation about this property</Text>
                        </View>
                    </View>
                )}

                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageWrapper,
                            msg.sender_id === currentUserId
                                ? styles.myMessageWrapper
                                : styles.theirMessageWrapper,
                        ]}
                    >
                        <View
                            style={[
                                styles.messageBubble,
                                msg.sender_id === currentUserId
                                    ? styles.myMessageBubble
                                    : styles.theirMessageBubble,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.messageText,
                                    msg.sender_id === currentUserId
                                        ? styles.myMessageText
                                        : styles.theirMessageText,
                                ]}
                            >
                                {msg.message}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.messageTime,
                                msg.sender_id === currentUserId
                                    ? styles.myMessageTime
                                    : styles.theirMessageTime,
                            ]}
                        >
                            {formatTime(msg.created_at)}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachButton}>
                    <Ionicons name="add-circle" size={28} color="#16a34a" />
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
                    style={[
                        styles.sendButton,
                        (!messageText.trim() || sendingMessage) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                >
                    {sendingMessage ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Ionicons name="send" size={20} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {selectedChat ? renderChatScreen() : renderChatList()}
        </SafeAreaView>
    );
}