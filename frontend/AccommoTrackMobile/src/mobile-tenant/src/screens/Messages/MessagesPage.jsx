import React, { useState, useEffect, useRef } from 'react';
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
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenLayout from '../../components/ScreenLayout.jsx';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import createEcho from '../../utils/echo';
import { styles } from '../../../../styles/Tenant/MessagesPage';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { API_BASE_URL as API_URL } from '../../../../config';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ConversationSkeleton, DashboardStatSkeleton } from '../../../../components/Skeletons';
import MenuDrawer from '../../components/MenuDrawer.jsx';

export default function MessagesPage({ navigation, route }) {
    const { theme } = useTheme();
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeNavTab, setActiveNavTab] = useState('Messages');
    const [newConversationId, setNewConversationId] = useState(null);

    const scrollViewRef = useRef(null);
    const echoRef = useRef(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);

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
            const stored = await AsyncStorage.getItem('user_id');

            if (!stored) {
                setCurrentUserId(null);
                return;
            }

            try {
                const parsed = JSON.parse(stored);
                if (parsed && (parsed.id || parsed.id === 0)) {
                    setCurrentUserId(parsed.id);
                    return;
                }
            } catch (e) {
                // stored value was not JSON, fall back to primitive parse
            }

            // Fallback: try to parse as a primitive id
            const maybeId = parseInt(stored, 10);
            setCurrentUserId(Number.isNaN(maybeId) ? null : maybeId);
        };

        getUserId();
        fetchConversations();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const handleStartConversation = async () => {
                if (route.params?.startConversation && route.params?.recipient) {
                    setInitialLoading(true);
                    try {
                        const headers = await getAuthHeaders();

                        const requestBody = {
                            recipient_id: route.params.recipient.id,
                            property_id: route.params.property?.id || null,
                        };

                        const res = await fetch(`${API_URL}/messages/start`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(requestBody),
                        });

                        if (!res.ok) {
                            const errorText = await res.text();
                            throw new Error(`Failed to start conversation: ${res.status}`);
                        }

                        const conversation = await res.json();
                        const conv = conversation?.conversation || conversation;

                        // Fetch updated conversations list
                        await fetchConversations();

                        // Highlight the new conversation
                        if (conv?.id) {
                            setNewConversationId(conv.id);

                            // If messages were returned with the conversation, use them;
                            // otherwise fetch messages for the conversation id.
                            if (Array.isArray(conv.messages) && conv.messages.length > 0) {
                                setMessages(conv.messages);
                            } else {
                                await fetchMessages(conv.id);
                            }

                            // Open the newly created conversation so the chat is visible
                            setSelectedChat(conv);
                            scrollToBottom();
                        }

                        // Clear the navigation params to prevent re-triggering
                        navigation.setParams({
                            startConversation: false,
                            recipient: null,
                            property: null,
                            room: null
                        });

                    } catch (err) {
                        console.error('Failed to start conversation:', err);
                        Alert.alert('Error', `Failed to start conversation: ${err.message}`);
                    } finally {
                        setInitialLoading(false);
                    }
                }
            };

            // Always attempt to start a conversation when the screen focuses.
            // Previously this ran only if `currentUserId` was already set, which
            // could cause the initial startConversation param to be ignored if
            // the user ID wasn't loaded yet. `getAuthHeaders` reads the token
            // directly from AsyncStorage so this is safe to call regardless.
            console.log('Messages screen focused. route.params:', route.params);
            handleStartConversation();
        }, [route.params, currentUserId])
    );

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

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchConversations();
            if (selectedChat) {
                await fetchMessages(selectedChat.id);
            }
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setRefreshing(false);
        }
    };

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

            // Check if response is ok
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            // Ensure data is an array
            if (Array.isArray(data)) {
                setConversations(data);
            } else {
                console.error('Unexpected response format:', data);
                setConversations([]);
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
            setConversations([]); // Always set to empty array on error
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

    const handleMenuItemPress = async (itemTitle) => {
        setMenuModalVisible(false);

        switch (itemTitle) {
            case 'Dashboard':
                navigation.navigate('Dashboard');
                break;
            case 'Future UI Demo':
                navigation.navigate('DemoUI');
                break;
            case 'Notifications':
                navigation.navigate('Notifications');
                break;
            case 'My Bookings':
                navigation.navigate('MyBookings');
                break;
            case 'Favorites':
                navigation.navigate('Favorites');
                break;
            case 'Payments':
                navigation.navigate('Payments');
                break;
            case 'Settings':
                navigation.navigate('Settings');
                break;
            case 'Help & Support':
                navigation.navigate('HelpSupport');
                break;
            case 'Logout':
                try {
                    await AsyncStorage.removeItem('auth_token');
                    await AsyncStorage.removeItem('user_id');
                } catch (err) {
                    console.error('Logout cleanup failed', err);
                }
                navigation.navigate('TenantHome');
                break;
            default:
                console.log('Menu item pressed:', itemTitle);
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
            Alert.alert('Error', 'Failed to send message');
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

    const getInitials = (conv) => {
        // Prefer property title initials, fallback to user initials
        if (conv?.property?.title) {
            const words = conv.property.title.split(' ').filter(w => w.length > 0);
            if (words.length >= 2) {
                return `${words[0][0]}${words[1][0]}`.toUpperCase();
            }
            return words[0]?.substring(0, 2).toUpperCase() || '??';
        }
        const user = conv?.other_user;
        if (!user) return '??';
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '??';
    };

    const getDisplayName = (conv) => {
        // Show property title as main name
        if (conv?.property?.title) {
            return conv.property.title;
        }
        // Fallback to user name
        const user = conv?.other_user;
        if (user?.first_name || user?.last_name) {
            return `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
        return 'Unknown';
    };

    const getRoleLabel = (conv) => {
        // Show the role of the other user
        const user = conv?.other_user;
        if (user?.role) {
            return user.role.charAt(0).toUpperCase() + user.role.slice(1);
        }
        return 'Landlord'; // Default for tenant view
    };

    const filteredConversations = (conversations || []).filter((conv) => {
        const otherUser = conv.other_user || {};
        const name = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    // Loading screen for initial conversation start
    if (initialLoading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Starting conversation...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Chat List Screen
    const renderChatList = () => (
        <ScreenLayout onMenuPress={() => setMenuModalVisible(true)} onProfilePress={() => { navigation.navigate('Profile'); }}>
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={styles.container}>

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
                        <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                <DashboardStatSkeleton />
                                <DashboardStatSkeleton />
                            </View>
                            <View style={{ height: 16 }} />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                        </ScrollView>
                    ) : filteredConversations.length === 0 ? (
                        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
                            <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textTertiary} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No conversations yet</Text>
                            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                                Contact a landlord from a property listing to start chatting
                            </Text>
                        </View>
                    ) : (
                    <FlatList
                        data={filteredConversations}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item: conv }) => {
                            const isNew = conv.id === newConversationId;
                            return (
                                <TouchableOpacity
                                    style={[styles.conversationItem, isNew && styles.newConversation]}
                                    onPress={() => {
                                        setSelectedChat(conv);
                                        if (isNew) {
                                            setNewConversationId(null);
                                        }
                                    }}
                                >
                                    <View style={styles.avatarContainer}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{getInitials(conv)}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.conversationInfo}>
                                        <View style={styles.conversationHeader}>
                                            <Text style={styles.conversationName}>
                                                {getDisplayName(conv)}
                                            </Text>
                                            <Text style={styles.conversationTime}>
                                                {formatTime(conv.last_message_at)}
                                            </Text>
                                        </View>
                                        <Text style={styles.propertyName}>{getRoleLabel(conv)}</Text>
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
                            )
                        }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        contentContainerStyle={{ paddingBottom: 16 }}
                    />
                    )}
                </View>
            </View>

            {/* Bottom Navigation and Drawer handled by ScreenLayout */}
            <MenuDrawer
                visible={menuModalVisible}
                onClose={() => setMenuModalVisible(false)}
                onMenuItemPress={handleMenuItemPress}
                isGuest={false}
            />
    </ScreenLayout>
    );

    // Chat Screen
    const renderChatScreen = () => (
        <>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle="light-content" />

                {/* Chat Header */}
                <View style={styles.chatScreenHeader}>
                    <TouchableOpacity
                        onPress={() => setSelectedChat(null)}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.chatHeaderInfo}>
                        <View style={styles.chatHeaderAvatar}>
                            <Text style={styles.chatHeaderAvatarText}>
                                {getInitials(selectedChat)}
                            </Text>
                        </View>
                        <View style={styles.chatHeaderText}>
                            <Text style={styles.chatHeaderName}>
                                {getDisplayName(selectedChat)}
                            </Text>
                            <Text style={styles.chatHeaderProperty}>{getRoleLabel(selectedChat)}</Text>
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
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
                        }
                >
                    {/* Property Info Card */}
                    {selectedChat.property && (
                        <View style={styles.propertyCard}>
                            <Ionicons name="home-outline" size={24} color={theme.colors.primary} />
                            <View style={styles.propertyCardInfo}>
                                <Text style={styles.propertyCardTitle}>{selectedChat.property.title}</Text>
                                <Text style={styles.propertyCardSubtitle}>Conversation about this property</Text>
                            </View>
                        </View>
                    )}

                    {/* Empty Messages State */}
                    {messages.length === 0 && (
                        <View style={styles.emptyMessagesContainer}>
                                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyMessagesText}>No messages yet</Text>
                            <Text style={styles.emptyMessagesSubtext}>
                                Say hello to start the conversation!
                            </Text>
                        </View>
                    )}

                    {messages.map((msg) => {
                        const isMine = String(msg.sender_id) === String(currentUserId);
                        return (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageWrapper,
                                    isMine ? styles.myMessageWrapper : styles.theirMessageWrapper,
                                ]}
                            >
                                <View style={[
                                    styles.messageContent,
                                    isMine ? styles.myMessageContent : styles.theirMessageContent,
                                ]}>
                                    <View
                                        style={[
                                            styles.messageBubble,
                                            isMine ? styles.myMessageBubble : styles.theirMessageBubble,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageText,
                                                isMine ? styles.myMessageText : styles.theirMessageText,
                                            ]}
                                        >
                                            {msg.message}
                                        </Text>
                                    </View>
                                    <Text style={styles.messageTime}>
                                        {formatTime(msg.created_at)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
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
            <BottomNavigation
                activeTab={activeNavTab}
                onTabPress={setActiveNavTab}
            />
        </>
    );

    // If chat is selected, show chat screen (full screen without bottom nav)
    if (selectedChat) {
        return renderChatScreen();
    }

    // Otherwise show list with bottom navigation
    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {renderChatList()}
        </View>
    );
}