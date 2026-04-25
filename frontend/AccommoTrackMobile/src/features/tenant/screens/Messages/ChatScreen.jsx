import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, RefreshControl, Text, Image, Alert, Linking, useWindowDimensions, Animated, Pressable, Keyboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import createEcho from '../../../../services/echo.js';
import MessageService from '../../../../services/MessageService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { showError, showWarning } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Tenant/MessagesPage.js';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import {
    tenantQueryKeys,
    useTenantFocusRefetch,
    useTenantRefreshHandler,
} from '../../hooks/useTenantQueryHelpers.js';

const ROLE_LABELS = {
    tenant: 'Tenant',
    caretaker: 'Caretaker',
    landlord: 'Landlord',
};

const EMPTY_MESSAGES = [];

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const getRoleLabel = (role) => {
    const normalized = normalizeRole(role);
    if (ROLE_LABELS[normalized]) return ROLE_LABELS[normalized];
    if (!normalized) return 'Participant';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const deriveConversationStatus = ({ role, lastMessage }) => {
    const normalizedRole = normalizeRole(role);
    const lastSenderRole = normalizeRole(lastMessage?.sender_role);
    const lastMessageIsMine = Boolean(lastMessage?.is_mine);

    if (normalizedRole === 'caretaker') {
        return { key: 'caretaker', label: 'Caretaker' };
    }

    if (lastSenderRole === 'caretaker' && !lastMessageIsMine) {
        return { key: 'caretaker-assisted', label: 'Caretaker-assisted' };
    }

    if (normalizedRole === 'landlord') {
        return { key: 'owner', label: 'Property Owner' };
    }

    return { key: 'participant', label: getRoleLabel(normalizedRole) };
};

const getMessageItems = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return EMPTY_MESSAGES;
};

const sortMessagesAscending = (items) => {
    return [...items].sort((a, b) => {
        const aTime = new Date(a?.created_at || 0).getTime();
        const bTime = new Date(b?.created_at || 0).getTime();

        if (aTime === bTime) {
            return Number(a?.id || 0) - Number(b?.id || 0);
        }

        return aTime - bTime;
    });
};

const withUpdatedMessages = (cachedData, updater) => {
    const currentItems = getMessageItems(cachedData);
    const nextItems = updater(currentItems);

    if (Array.isArray(cachedData)) return nextItems;

    if (cachedData && typeof cachedData === 'object') {
        return {
            ...cachedData,
            items: nextItems,
        };
    }

    return nextItems;
};

const upsertMessageById = (items, incomingMessage) => {
    if (!incomingMessage || incomingMessage.id === undefined || incomingMessage.id === null) {
        return items;
    }

    const exists = items.some((item) => String(item.id) === String(incomingMessage.id));

    if (exists) {
        return items.map((item) => (String(item.id) === String(incomingMessage.id) ? incomingMessage : item));
    }

    return [...items, incomingMessage];
};

export default function ChatScreen({ navigation, route }) {
    const { width: viewportWidth } = useWindowDimensions();
    const { theme } = useTheme();
    const styles = React.useMemo(() => getStyles(theme), [theme]);
    const contentWrapStyle = React.useMemo(
        () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 960, alignSelf: 'center' } : null),
        [viewportWidth],
    );
    const queryClient = useQueryClient();
    const conv = route.params?.conversation || null;
    const [messageText, setMessageText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const safeAreaEdges = ['top', 'bottom'];
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [historyViewingMessage, setHistoryViewingMessage] = useState(null);

    const scrollViewRef = useRef(null);
    const inputRef = useRef(null);
    const echoRef = useRef(null);
    const detailsPanelWidth = Math.min(380, Math.round(viewportWidth * 0.9));
    const detailsTranslateX = useRef(new Animated.Value(detailsPanelWidth)).current;
    const messagesQueryKey = React.useMemo(
        () => tenantQueryKeys.messagesConversation(conv?.id),
        [conv?.id],
    );

    const currentUserIdQuery = useQuery({
        queryKey: tenantQueryKeys.messagesCurrentUserId(),
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem('user');
                if (!stored) return null;

                const parsed = JSON.parse(stored);
                if (parsed?.id || parsed?.id === 0) {
                    return String(parsed.id);
                }

                return null;
            } catch (e) {
                console.error('Failed to load user for chat:', e);
                return null;
            }
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const currentUserId = currentUserIdQuery.data || null;

    const messagesQuery = useQuery({
        queryKey: messagesQueryKey,
        queryFn: async () => {
            if (!conv?.id) return [];
            const result = await MessageService.getConversationMessages(conv.id);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        enabled: !!conv?.id,
        placeholderData: (previousData) => previousData,
    });

    const messages = React.useMemo(() => getMessageItems(messagesQuery.data), [messagesQuery.data]);
    const orderedMessages = React.useMemo(() => sortMessagesAscending(messages), [messages]);
    const isLoading = messagesQuery.isLoading;
    const refetchMessages = messagesQuery.refetch;
    const messageRefetchers = React.useMemo(
        () => [refetchMessages],
        [refetchMessages],
    );

    useTenantFocusRefetch({
        enabled: Boolean(conv?.id),
        refetchers: messageRefetchers,
    });

    const onRefresh = useTenantRefreshHandler({
        enabled: Boolean(conv?.id),
        setRefreshing,
        refetchers: messageRefetchers,
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: ({ text, imageUri, replyToId, fileUri, fileName }) =>
            MessageService.sendMessage(conv.id, text, imageUri, replyToId, fileUri, fileName),
        onSuccess: (result) => {
            if (result.success) {
                setMessageText('');
                setSelectedImage(null);
                setSelectedFile(null);
                setReplyingTo(null);
                // Optimistically update
                queryClient.setQueryData(messagesQueryKey, (old) =>
                    withUpdatedMessages(old, (currentItems) => upsertMessageById(currentItems, result.data)),
                );
                queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
                scrollToBottom();
            } else {
                showError('Failed to send message', result.error || 'Please try again.');
            }
        },
        onError: (err) => {
            showError('Error', err?.message || 'Failed to send message');
        },
    });

    const unsendMutation = useMutation({
        mutationFn: (messageId) => MessageService.unsend(messageId),
        onSuccess: (result) => {
            if (result.success) {
                queryClient.setQueryData(messagesQueryKey, (old) =>
                    withUpdatedMessages(old, (currentItems) =>
                        currentItems.map((m) => String(m.id) === String(result.data.id) ? result.data : m),
                    ),
                );
                queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
            } else {
                showError('Error', result.error || 'Failed to unsend message');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to unsend message');
        }
    });

    const editMessageMutation = useMutation({
        mutationFn: ({ messageId, text }) => MessageService.editMessage(messageId, text),
        onSuccess: (result) => {
            if (result.success) {
                setMessageText('');
                setEditingMessage(null);
                queryClient.setQueryData(messagesQueryKey, (old) =>
                    withUpdatedMessages(old, (currentItems) =>
                        currentItems.map((m) => String(m.id) === String(result.data.id) ? result.data : m),
                    ),
                );
                queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
            } else {
                showError('Error', result.error || 'Failed to edit message');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to edit message');
        }
    });

    const markAsReadMutation = useMutation({
        mutationFn: (conversationId) => MessageService.markAsRead(conversationId),
        onMutate: async () => {
            queryClient.setQueryData(messagesQueryKey, (old) =>
                withUpdatedMessages(old, (currentItems) =>
                    currentItems.map((m) => !m.is_mine && !m.is_read ? { ...m, is_read: true } : m),
                ),
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
        }
    });

    const hideConversationMutation = useMutation({
        mutationFn: (conversationId) => MessageService.hideConversation(conversationId),
        onSuccess: (result) => {
            if (result.success) {
                setIsDetailsOpen(false);
                queryClient.removeQueries({ queryKey: messagesQueryKey });
                queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
                navigation.goBack();
            } else {
                showError('Error', result.error || 'Failed to delete conversation');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to delete conversation');
        },
    });

    useEffect(() => {
        if (replyingTo || editingMessage) {
            inputRef.current?.focus();
        }
    }, [replyingTo, editingMessage]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        if (!conv?.id) return;

        const setupEcho = async () => {
            try {
                echoRef.current = await createEcho();
                echoRef.current.private(`conversation.${conv.id}`).listen('.message.sent', (e) => {
                    const incomingMessage = e.message;

                    queryClient.setQueryData(messagesQueryKey, (old) =>
                        withUpdatedMessages(old, (currentItems) => upsertMessageById(currentItems, incomingMessage)),
                    );
                    queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
                    scrollToBottom();

                    if (!incomingMessage.is_mine) {
                        markAsReadMutation.mutate(conv.id);
                    }
                });

                echoRef.current.private(`conversation.${conv.id}`).listen('.message.read', (e) => {
                    queryClient.setQueryData(messagesQueryKey, (old) =>
                        withUpdatedMessages(old, (currentItems) =>
                            currentItems.map((m) =>
                                String(m.receiver_id) === String(e.reader_id)
                                    ? { ...m, is_read: true, read_at: e.read_at }
                                    : m,
                            ),
                        ),
                    );
                });

                echoRef.current.private(`conversation.${conv.id}`).listenForWhisper('typing', (e) => {
                    setIsOtherTyping(e.typing);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    if (e.typing) {
                        typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
                    }
                });
            } catch (err) {
                console.error('Echo setup failed:', err);
            }
        };

        setupEcho();

        return () => {
            if (echoRef.current) {
                try {
                    echoRef.current.leave(`conversation.${conv.id}`);
                } catch (_error) { }
            }
        };
    }, [conv?.id, messagesQueryKey, queryClient, markAsReadMutation]);

    // Mark as read when messages change and conversation is open
    useEffect(() => {
        if (conv?.id && orderedMessages.length > 0) {
            const hasUnread = orderedMessages.some((m) => !m.is_mine && !m.is_read);
            if (hasUnread) {
                markAsReadMutation.mutate(conv.id);
            }
        }
    }, [conv?.id, orderedMessages, markAsReadMutation]);

    // Signal typing status
    useEffect(() => {
        if (!conv?.id || !echoRef.current) return;

        if (messageText.length > 0) {
            echoRef.current.private(`conversation.${conv.id}`).whisper('typing', { typing: true });
        } else {
            echoRef.current.private(`conversation.${conv.id}`).whisper('typing', { typing: false });
        }
    }, [messageText, conv?.id]);

    const scrollToBottom = (animated = true) => {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated }), 100);
    };

    useEffect(() => {
        if (!orderedMessages.length) return;
        scrollToBottom(false);
    }, [orderedMessages.length]);

    useEffect(() => {
        if (!isDetailsOpen) {
            detailsTranslateX.setValue(detailsPanelWidth);
        }
    }, [detailsPanelWidth, detailsTranslateX, isDetailsOpen]);

    useEffect(() => {
        Animated.timing(detailsTranslateX, {
            toValue: isDetailsOpen ? 0 : detailsPanelWidth,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [detailsPanelWidth, detailsTranslateX, isDetailsOpen]);

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            showWarning('Permission required', 'Please allow photo library access to send images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                showWarning('File too large', 'Image exceeds the 5MB limit.');
                return;
            }
            setSelectedImage(asset.uri);
            setSelectedFile(null); // Clear file if image selected
        }
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.size > 10 * 1024 * 1024) {
                    showError('File size must be less than 10MB');
                    return;
                }
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.name,
                    size: asset.size
                });
                setSelectedImage(null); // Clear image if file selected
            }
        } catch (_err) {
            showError('Failed to pick document');
        }
    };

    const handleSendMessage = () => {
        if ((!messageText.trim() && !selectedImage && !selectedFile) || !conv || sendMessageMutation.isPending) return;

        if (editingMessage) {
            editMessageMutation.mutate({ messageId: editingMessage.id, text: messageText.trim() });
        } else {
            sendMessageMutation.mutate({
                text: messageText.trim(),
                imageUri: selectedImage,
                replyToId: replyingTo?.id,
                fileUri: selectedFile?.uri,
                fileName: selectedFile?.name
            });
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

    const getInitials = (conv) => {
        const user = conv?.other_user;
        if (user && (user.first_name || user.last_name)) {
            return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '??';
        }
        if (conv?.property?.title) {
            const words = conv.property.title.split(' ').filter((w) => w.length > 0);
            if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
            return words[0]?.substring(0, 2).toUpperCase() || '??';
        }
        return '??';
    };

    const participantMeta = route.params?.participantMeta || conv?.participantMeta || null;
    const participantRole = normalizeRole(participantMeta?.role || conv?.other_user?.role);
    const participantRoleLabel = participantMeta?.roleLabel || getRoleLabel(participantRole);
    const derivedStatus = participantMeta?.statusLabel
        ? { key: participantMeta?.statusKey || 'participant', label: participantMeta.statusLabel }
        : deriveConversationStatus({ role: participantRole, lastMessage: conv?.last_message });
    const participantStatusLabel = derivedStatus?.label || null;
    const participantStatusLine = [participantRoleLabel, participantStatusLabel]
        .filter((value, index, list) => value && list.indexOf(value) === index)
        .join(' • ');

    const participantName = conv?.other_user
        ? `${conv.other_user.first_name || ''} ${conv.other_user.last_name || ''}`.trim()
        : '';
    const displayParticipantName = participantName || 'Landlord';
    const participantPropertyLabel = participantMeta?.propertyLabel || conv?.property?.title || 'No linked property';
    const participantPhone = conv?.other_user?.phone || participantMeta?.phone || null;
    const participantEmail = conv?.other_user?.email || participantMeta?.email || null;

    const detailRows = [
        { label: 'Role', value: participantRoleLabel },
        { label: 'Status', value: participantStatusLabel || participantRoleLabel },
        { label: 'Property', value: participantPropertyLabel },
        { label: 'Phone', value: participantPhone || 'Not provided' },
        { label: 'Email', value: participantEmail || 'Not provided' },
    ];

    const mediaItems = React.useMemo(() => {
        if (!Array.isArray(messages)) return [];

        const seen = new Set();
        return messages.filter((msg) => {
            const imagePath = msg?.image_path;
            if (!imagePath || msg?.is_unsent || seen.has(imagePath)) return false;
            seen.add(imagePath);
            return true;
        });
    }, [messages]);

    return (
        <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : (isKeyboardVisible ? 'height' : undefined)}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle="light-content" />

                {/* Chat Header */}
                <View style={[styles.chatScreenHeader, { backgroundColor: theme.colors.primary }]}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.chatHeaderInfo}>
                        <View style={[styles.chatHeaderAvatar, { overflow: 'hidden' }]}>
                            {conv?.property?.image_url ? (
                                <Image
                                    source={{ uri: getImageUrl(conv.property.image_url) }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            ) : conv?.other_user?.profile_image ? (
                                <Image
                                    source={{ uri: getImageUrl(conv.other_user.profile_image) }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={styles.chatHeaderAvatarText}>{getInitials(conv)}</Text>
                            )}
                        </View>
                        <View style={styles.chatHeaderText}>
                            <Text style={styles.chatHeaderName} numberOfLines={1}>{displayParticipantName}</Text>
                            {isOtherTyping ? (
                                <Text style={{ fontSize: 10, color: '#93C5FD', fontStyle: 'italic', fontWeight: 'bold' }}>typing...</Text>
                            ) : participantPropertyLabel ? (
                                <Text style={styles.chatHeaderProperty} numberOfLines={1}>{participantPropertyLabel}</Text>
                            ) : null}
                        </View>
                    </View>

                    {participantPhone && (
                        <TouchableOpacity
                            style={[styles.headerIcon, { marginRight: 8 }]}
                            onPress={() => Linking.openURL(`tel:${participantPhone}`)}
                        >
                            <Ionicons name="call-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.headerIcon} onPress={() => setIsDetailsOpen((prev) => !prev)}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={[styles.messagesContent, contentWrapStyle]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
                >
                    {conv?.property && (
                        <View style={[styles.propertyCard, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="home-outline" size={24} color={theme.colors.primary} />
                            <View style={styles.propertyCardInfo}>
                                <Text style={[styles.propertyCardTitle, { color: theme.colors.text }]}>{conv.property.title}</Text>
                                <Text style={[styles.propertyCardSubtitle, { color: theme.colors.textSecondary }]}>Conversation about this property</Text>
                            </View>
                        </View>
                    )}

                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 40 }}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : orderedMessages.length === 0 ? (
                        <View style={styles.emptyMessagesContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                            <Text style={[styles.emptyMessagesText, { color: theme.colors.textSecondary }]}>No messages yet</Text>
                            <Text style={[styles.emptyMessagesSubtext, { color: theme.colors.textTertiary }]}>Say hello to start the conversation!</Text>
                        </View>
                    ) : (
                        orderedMessages.map((msg) => {
                            // Local fallback for isMine calculation
                            const isMine = msg.is_mine || (currentUserId && String(msg.actual_sender_id || msg.sender_id) === String(currentUserId));
                            const actualSenderName = msg.actual_sender ? `${msg.actual_sender.first_name} ${msg.actual_sender.last_name}` : 'Caretaker';
                            const isUnsent = Boolean(msg.is_unsent);
                            const replyingToMessage = msg.parent || msg.reply_to || null;
                            const senderRole = String(msg.sender_role || '').toLowerCase();
                            let otherPartyIndicator = null;
                            if (!isMine) {
                                if (senderRole === 'caretaker') {
                                    otherPartyIndicator = `${actualSenderName || 'Caretaker'} (Caretaker)`;
                                } else if (senderRole === 'tenant') {
                                    const tenantName = `${msg.sender?.first_name || conv?.other_user?.first_name || ''} ${msg.sender?.last_name || conv?.other_user?.last_name || ''}`.trim();
                                    otherPartyIndicator = `${tenantName || 'Tenant'} (Tenant)`;
                                }
                            }
                            const incomingAvatarPath = !isMine
                                ? (msg.actual_sender?.profile_image || msg.sender?.profile_image || conv?.other_user?.profile_image || null)
                                : null;
                            const incomingInitials = `${msg.actual_sender?.first_name?.[0] || msg.sender?.first_name?.[0] || conv?.other_user?.first_name?.[0] || ''}${msg.actual_sender?.last_name?.[0] || msg.sender?.last_name?.[0] || conv?.other_user?.last_name?.[0] || ''}`.toUpperCase() || '??';

                            const handleLongPress = () => {
                                if (isUnsent) return;

                                let options = [];
                                if (isMine) {
                                    const ts = msg.created_at || new Date().toISOString();
                                    const timeDiff = new Date() - new Date(ts);
                                    const canEdit = timeDiff < 30 * 60 * 1000;

                                    options = [
                                        ...(canEdit ? [{
                                            text: 'Edit', onPress: () => {
                                                setEditingMessage(msg);
                                                setReplyingTo(null);
                                                setMessageText(msg.message);
                                            }
                                        }] : []),
                                        {
                                            text: 'Unsend', style: 'destructive', onPress: () => {
                                                Alert.alert(
                                                    'Unsend Message',
                                                    'Unsend this message for everyone?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { text: 'Unsend', style: 'destructive', onPress: () => unsendMutation.mutate(msg.id) }
                                                    ]
                                                );
                                            }
                                        },
                                        { text: 'Cancel', style: 'cancel' }
                                    ];
                                } else {
                                    options = [
                                        {
                                            text: 'Reply', onPress: () => {
                                                setReplyingTo(msg);
                                                setEditingMessage(null);
                                            }
                                        },
                                        { text: 'Cancel', style: 'cancel' }
                                    ];
                                }

                                Alert.alert('Message Options', '', options);
                            };

                            return (
                                <View key={msg.id} style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                        {!isMine && (
                                            <View style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.primaryLight, marginRight: 8, marginTop: 2 }}>
                                                {incomingAvatarPath ? (
                                                    <Image
                                                        source={{ uri: getImageUrl(incomingAvatarPath) }}
                                                        style={{ width: '100%', height: '100%' }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>{incomingInitials}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                        <View style={[styles.messageContent, isMine ? styles.myMessageContent : styles.theirMessageContent]}>
                                            {!isUnsent && otherPartyIndicator && (
                                                <Text style={{ fontSize: 9, color: theme.colors.textSecondary, marginBottom: 3, alignSelf: 'flex-start' }}>
                                                    {otherPartyIndicator}
                                                </Text>
                                            )}
                                            <TouchableOpacity
                                                activeOpacity={isMine && !isUnsent ? 0.7 : 1}
                                                onLongPress={() => handleLongPress(msg)}
                                                style={[
                                                    styles.messageBubble,
                                                    isMine ? styles.myMessageBubble : styles.theirMessageBubble,
                                                    isUnsent && {
                                                        backgroundColor: theme.colors.backgroundSecondary,
                                                        borderWidth: 1,
                                                        borderColor: theme.colors.border,
                                                        borderStyle: 'dashed'
                                                    },
                                                    (msg.image_path || msg.file_path) && !isUnsent && {
                                                        backgroundColor: 'transparent',
                                                        padding: 0,
                                                        borderWidth: 0,
                                                        elevation: 0,
                                                        shadowOpacity: 0
                                                    }
                                                ]}
                                            >
                                                {isUnsent ? (
                                                    <Text style={[styles.messageText, { color: theme.colors.textSecondary, fontStyle: 'italic', fontSize: 12 }]}>This message was unsent</Text>
                                                ) : (
                                                    <>
                                                        {replyingToMessage && (
                                                            <View style={{
                                                                backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                                                                padding: 8,
                                                                borderRadius: 6,
                                                                borderLeftWidth: 3,
                                                                borderLeftColor: theme.colors.primary,
                                                                marginBottom: 8
                                                            }}>
                                                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: isMine ? '#FFF' : theme.colors.primary, marginBottom: 2 }}>
                                                                    {String(replyingToMessage.sender_id) === String(currentUserId) ? 'You' : (replyingToMessage.sender?.first_name || 'Someone')}
                                                                </Text>
                                                                <Text style={{ fontSize: 11, color: isMine ? '#EEE' : theme.colors.textSecondary }} numberOfLines={2}>
                                                                    {replyingToMessage.image_path ? '📷 Photo' : replyingToMessage.file_path ? '📄 Document' : replyingToMessage.message}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {msg.image_path && (
                                                            <TouchableOpacity onPress={() => setSelectedImage(getImageUrl(msg.image_path))}>
                                                                <Image
                                                                    source={{ uri: getImageUrl(msg.image_path) }}
                                                                    style={{ width: 200, height: 200, borderRadius: 12 }}
                                                                    resizeMode="cover"
                                                                />
                                                            </TouchableOpacity>
                                                        )}
                                                        {msg.file_path && (
                                                            <TouchableOpacity
                                                                style={styles.fileCard}
                                                                onPress={() => Linking.openURL(getImageUrl(msg.file_path))}
                                                            >
                                                                <View style={styles.fileIconContainer}>
                                                                    <Ionicons
                                                                        name={msg.file_path.toLowerCase().endsWith('.pdf') ? 'document-text' : 'document'}
                                                                        size={24}
                                                                        color={theme.colors.primary}
                                                                    />
                                                                </View>
                                                                <View style={styles.fileInfo}>
                                                                    <Text style={styles.fileName} numberOfLines={1}>{msg.file_name || 'Document'}</Text>
                                                                    <Text style={styles.fileExt}>{msg.file_path.split('.').pop().toUpperCase()}</Text>
                                                                </View>
                                                                <Ionicons name="download-outline" size={20} color={theme.colors.textSecondary} />
                                                            </TouchableOpacity>
                                                        )}
                                                        {msg.message ? (
                                                            <View style={[(msg.image_path || msg.file_path) ? { padding: 10, backgroundColor: isMine ? theme.colors.primary : '#fff', borderRadius: 10, marginTop: 4 } : null]}>
                                                                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>{msg.message}</Text>
                                                                {msg.is_edited && (
                                                                    <TouchableOpacity onPress={() => setHistoryViewingMessage(msg)}>
                                                                        <Text style={{ fontSize: 9, color: isMine ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary, marginLeft: 4, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                                                                            (edited)
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        ) : null}
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            <View style={[
                                                { flexDirection: 'row', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start' },
                                                (msg.image_path || msg.file_path) && !isUnsent && styles.timestampOnMedia
                                            ]}>
                                                <Text style={[styles.messageTime, (msg.image_path || msg.file_path) && !isUnsent && { color: '#fff', marginTop: 0 }]}>{formatTime(msg.created_at)}</Text>
                                                {isMine && !isUnsent && (
                                                    <Ionicons
                                                        name="checkmark-done"
                                                        size={14}
                                                        color={(msg.image_path || msg.file_path) ? '#fff' : (msg.is_read ? '#3B82F6' : '#9CA3AF')}
                                                        style={{ marginLeft: 4 }}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Attachment Preview */}
                {(selectedImage || selectedFile) && (
                    <View style={[styles.attachmentPreviewContainer, contentWrapStyle]}>
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={styles.attachmentPreviewImage} />
                        ) : (
                            <View style={styles.attachmentPreviewFile}>
                                <Ionicons
                                    name={selectedFile.name.toLowerCase().endsWith('.pdf') ? 'document-text' : 'document'}
                                    size={32}
                                    color={theme.colors.primary}
                                />
                                <Text style={styles.attachmentPreviewFileName} numberOfLines={1}>{selectedFile.name}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.attachmentPreviewClose}
                            onPress={() => {
                                setSelectedImage(null);
                                setSelectedFile(null);
                            }}
                        >
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Reply Preview */}
                {replyingTo && (
                    <View style={[{ padding: 12, backgroundColor: theme.colors.backgroundSecondary, borderTopWidth: 1, borderTopColor: theme.colors.border, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, contentWrapStyle]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase' }}>
                                Replying to {replyingTo.sender?.first_name || 'User'}
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }} numberOfLines={1}>
                                {replyingTo.image_path ? '📷 Photo' : replyingTo.file_path ? '📄 Document' : replyingTo.message}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Edit Preview */}
                {editingMessage && (
                    <View style={[{ padding: 12, backgroundColor: theme.colors.backgroundSecondary, borderTopWidth: 1, borderTopColor: theme.colors.border, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, contentWrapStyle]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase' }}>Editing Message</Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }} numberOfLines={1}>{editingMessage.message}</Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                            setEditingMessage(null);
                            setMessageText('');
                        }}>
                            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input Area */}
                <View
                    style={[
                        styles.inputContainer,
                        contentWrapStyle,
                        {
                            backgroundColor: theme.colors.surface,
                            borderTopColor: theme.colors.border,
                            paddingBottom: 8,
                        },
                    ]}
                >
                    <TouchableOpacity style={styles.attachButton} activeOpacity={0.7} onPress={handlePickImage}>
                        <Ionicons name="camera" size={26} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachButton} activeOpacity={0.7} onPress={handlePickDocument}>
                        <Ionicons name="attach" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                        ref={inputRef}
                        style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!messageText.trim() && !selectedImage || sendMessageMutation.isPending || editMessageMutation.isPending) && styles.sendButtonDisabled, !(!messageText.trim() && !selectedImage || sendMessageMutation.isPending || editMessageMutation.isPending) && { backgroundColor: editingMessage ? (theme.colors.success || '#10B981') : theme.colors.primary }]}
                        onPress={handleSendMessage}
                        disabled={(!messageText.trim() && !selectedImage) || sendMessageMutation.isPending || editMessageMutation.isPending}
                    >
                        {sendMessageMutation.isPending || editMessageMutation.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name={editingMessage ? "checkmark" : "send"} size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>

                {isDetailsOpen && (
                    <Pressable
                        style={styles.detailsBackdrop}
                        onPress={() => setIsDetailsOpen(false)}
                    />
                )}

                <Animated.View
                    pointerEvents={isDetailsOpen ? 'auto' : 'none'}
                    style={[
                        styles.detailsDrawer,
                        {
                            width: detailsPanelWidth,
                            backgroundColor: theme.colors.surface,
                            borderLeftColor: theme.colors.border,
                            transform: [{ translateX: detailsTranslateX }],
                        },
                    ]}
                >
                    <View style={styles.detailsHeader}>
                        <View>
                            <Text style={[styles.detailsHeaderTitle, { color: theme.colors.text }]}>Chat Details</Text>
                            <Text style={[styles.detailsHeaderSubtitle, { color: theme.colors.textSecondary }]}>Personal details</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.detailsCloseButton}
                            onPress={() => setIsDetailsOpen(false)}
                        >
                            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.detailsContent} contentContainerStyle={{ paddingBottom: 20 }}>
                        <View style={[styles.detailsIdentityCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSecondary }]}>
                            <View style={[styles.detailsAvatarLarge, { backgroundColor: theme.colors.primaryLight }]}>
                                {conv?.other_user?.profile_image ? (
                                    <Image
                                        source={{ uri: getImageUrl(conv.other_user.profile_image) }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={[styles.chatHeaderAvatarText, { color: theme.colors.primary }]}>{getInitials(conv)}</Text>
                                )}
                            </View>
                            <Text style={[styles.detailsIdentityName, { color: theme.colors.text }]}>{displayParticipantName}</Text>
                            <Text style={[styles.detailsIdentityRole, { color: theme.colors.textSecondary }]}>{participantStatusLine || participantRoleLabel}</Text>
                        </View>

                        <View style={[styles.detailsSection, { borderColor: theme.colors.border }]}>
                            {detailRows.map((row) => (
                                <View key={row.label} style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.text }]} numberOfLines={2}>{row.value}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={[styles.detailsSection, { borderColor: theme.colors.border }]}>
                            <Text style={[styles.detailsSectionTitle, { color: theme.colors.textSecondary }]}>Media</Text>
                            {mediaItems.length === 0 ? (
                                <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>No photos shared yet.</Text>
                            ) : (
                                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                        {mediaItems.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={{ width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', marginRight: '2%', marginBottom: 8 }}
                                                onPress={() => setSelectedImage(getImageUrl(item.image_path))}
                                            >
                                                <Image
                                                    source={{ uri: getImageUrl(item.image_path) }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        <View style={[styles.detailsSection, { borderColor: theme.colors.border, backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        'Delete Conversation',
                                        'Delete this conversation from your inbox only?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Delete Conversation',
                                                style: 'destructive',
                                                onPress: () => hideConversationMutation.mutate(conv.id),
                                            },
                                        ],
                                    );
                                }}
                                disabled={hideConversationMutation.isPending}
                            >
                                <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>
                                    {hideConversationMutation.isPending ? 'Deleting conversation...' : 'Delete Conversation'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>

                {/* Message History Modal */}
                <Modal
                    visible={!!historyViewingMessage}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setHistoryViewingMessage(null)}
                >
                    <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                        onPress={() => setHistoryViewingMessage(null)}
                    >
                        <Pressable style={{ backgroundColor: theme.colors.surface, borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 }}>
                            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>Message History</Text>
                                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>Previous versions</Text>
                                </View>
                                <TouchableOpacity onPress={() => setHistoryViewingMessage(null)}>
                                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 400, padding: 20 }}>
                                <View style={{ padding: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#10B981', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#10B981', textTransform: 'uppercase', marginBottom: 4 }}>Current Version</Text>
                                    <Text style={{ fontSize: 14, color: theme.colors.text }}>{historyViewingMessage?.message}</Text>
                                </View>

                                {historyViewingMessage?.histories?.length > 0 ? (
                                    historyViewingMessage.histories.slice().reverse().map((history, i) => (
                                        <View key={i} style={{ padding: 12, backgroundColor: theme.colors.background, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 }}>
                                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 4 }}>
                                                {formatTime(history.created_at)}
                                            </Text>
                                            <Text style={{ fontSize: 14, color: theme.colors.text }}>{history.message}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                        <Text style={{ color: theme.colors.textTertiary, fontSize: 14 }}>No history available</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                                <TouchableOpacity
                                    onPress={() => setHistoryViewingMessage(null)}
                                    style={{ backgroundColor: theme.colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
