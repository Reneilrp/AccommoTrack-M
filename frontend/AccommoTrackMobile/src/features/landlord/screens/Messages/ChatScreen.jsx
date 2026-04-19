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
import { showError, showSuccess, showWarning } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Landlord/Messages.js';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import api from '../../../../services/api.js';
import {
    landlordQueryKeys,
    useLandlordFocusRefetch,
    useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

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
    
    // Assignment State
    const [caretakers, setCaretakers] = useState([]);
    const [assignedId, setAssignedId] = useState(conv?.caretaker_id || '');
    const [isAssigning, setIsAssigning] = useState(false);
    const [caretakerSelectVisible, setCaretakerSelectVisible] = useState(false);

    const scrollViewRef = useRef(null);
    const inputRef = useRef(null);
    const echoRef = useRef(null);
    const detailsPanelWidth = Math.min(380, Math.round(viewportWidth * 0.9));
    const detailsTranslateX = useRef(new Animated.Value(detailsPanelWidth)).current;
    const messagesQueryKey = React.useMemo(
        () => landlordQueryKeys.messagesConversation(conv?.id),
        [conv?.id],
    );

    const currentUserIdQuery = useQuery({
        queryKey: landlordQueryKeys.messagesCurrentUserId(),
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem('user');
                if (!stored) return null;

                const parsed = JSON.parse(stored);
                const userId = parsed?.id || parsed?.user_id || parsed?.user?.id;
                return userId || null;
            } catch (_e) {
                console.error('Failed to load user for chat:', _e);
                return null;
            }
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const currentUserQuery = useQuery({
        queryKey: ['messagesCurrentUserFull'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem('user');
                if (!stored) return null;
                return JSON.parse(stored);
            } catch (_e) {
                return null;
            }
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const currentUserId = currentUserIdQuery.data || null;
    const isLandlordView = currentUserQuery.data?.role === 'landlord';

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

    const messages = messagesQuery.data || EMPTY_MESSAGES;
    const isLoading = messagesQuery.isLoading;
    const refetchMessages = messagesQuery.refetch;
    const messageRefetchers = React.useMemo(
        () => [refetchMessages],
        [refetchMessages],
    );

    useLandlordFocusRefetch({
        enabled: Boolean(conv?.id),
        refetchers: messageRefetchers,
    });

    const onRefresh = useLandlordRefreshHandler({
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
                queryClient.setQueryData(messagesQueryKey, (old) => {
                    const messages = old || [];
                    if (messages.some(m => String(m.id) === String(result.data.id))) return old;
                    return [...messages, result.data];
                });
                queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
                scrollToBottom();
            } else {
                showError('Error', result.error || 'Failed to send message');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to send message');
        }
    });

    const unsendMutation = useMutation({
        mutationFn: (messageId) => MessageService.unsend(messageId),
        onSuccess: (result) => {
            if (result.success) {
                queryClient.setQueryData(messagesQueryKey, (old) => {
                    const messages = old || [];
                    return messages.map(m => String(m.id) === String(result.data.id) ? result.data : m);
                });
                queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
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
                queryClient.setQueryData(messagesQueryKey, (old) => {
                    const messages = old || [];
                    return messages.map(m => String(m.id) === String(result.data.id) ? result.data : m);
                });
                queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
            } else {
                showError('Error', result.error || 'Failed to edit message');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to edit message');
        }
    });

    const markAsReadMutation = useMutation({
        mutationFn: (conversationId) => api.post(`/messages/${conversationId}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
        }
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

    // Load available caretakers for assignment 
    useEffect(() => {
        if (!isDetailsOpen) return;
        let isMounted = true;
        const fetchCaretakers = async () => {
             try {
                 const res = await api.get('/landlord/caretakers');
                 if (res.data?.success && isMounted) {
                     setCaretakers(res.data.data.map((c) => c.caretaker));
                 }
             } catch (_e) { }
        };
        fetchCaretakers();
        return () => { isMounted = false; };
    }, [isDetailsOpen]);

    const handleAssignCaretaker = async (caretakerId) => {
        setIsAssigning(true);
        try {
             // Pass null or empty string if unassigning
             const idToAssign = caretakerId || null;
             const res = await MessageService.assignCaretaker(conv.id, idToAssign);
             if (res.success) {
                 setAssignedId(caretakerId);
                 showSuccess('Success', caretakerId ? 'Caretaker assigned to conversation.' : 'Caretaker unassigned.');
             } else {
                 showError('Error', res.error || 'Failed to update assignment.');
             }
        } catch (_err) {
             showError('Error', 'Network error.');
        } finally {
             setIsAssigning(false);
        }
    };

    // Mark as read when messages change and conversation is open
    useEffect(() => {
        if (conv?.id && messages.length > 0) {
            const hasUnread = messages.some(m => !m.is_mine && !m.is_read);
            if (hasUnread) {
                markAsReadMutation.mutate(conv.id);
            }
        }
    }, [conv?.id, messages, markAsReadMutation]);

    // Signal typing status
    useEffect(() => {
        if (!conv?.id || !echoRef.current) return;
        
        if (messageText.length > 0) {
            echoRef.current.private(`conversation.${conv.id}`).whisper('typing', { typing: true });
        } else {
            echoRef.current.private(`conversation.${conv.id}`).whisper('typing', { typing: false });
        }
    }, [messageText, conv?.id]);

    useEffect(() => {
        if (!conv?.id) return;

        const setupEcho = async () => {
            try {
                echoRef.current = await createEcho();
                echoRef.current.private(`conversation.${conv.id}`).listen('.message.sent', (e) => {
                    const incomingMessage = e.message;

                    queryClient.setQueryData(messagesQueryKey, (old) => {
                        const messages = old || [];
                        const exists = messages.some((m) => String(m.id) === String(incomingMessage.id));
                        if (exists) {
                            return messages.map((m) => String(m.id) === String(incomingMessage.id) ? incomingMessage : m);
                        }
                        return [...messages, incomingMessage];
                    });
                    queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
                    scrollToBottom();
                    
                    if (!incomingMessage.is_mine) {
                       markAsReadMutation.mutate(conv.id);
                    }
                });

                echoRef.current.private(`conversation.${conv.id}`).listen('.message.read', (e) => {
                    queryClient.setQueryData(messagesQueryKey, (old) => {
                        const messages = old || [];
                        return messages.map((m) => 
                            String(m.receiver_id) === String(e.reader_id) 
                                ? { ...m, is_read: true, read_at: e.read_at } 
                                : m
                        );
                    });
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
                } catch (_error) {}
            }
        };
    }, [conv?.id, messagesQueryKey, queryClient, markAsReadMutation]);

    const scrollToBottom = (animated = true) => {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated }), 100);
    };

    useEffect(() => {
        if (!messages.length) return;
        scrollToBottom(false);
    }, [messages.length]);

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

            if (!result.canceled && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.size > 10 * 1024 * 1024) {
                    showWarning('File too large', 'File size must be less than 10MB');
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
            showError('Error', 'Failed to pick document');
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
        const now = new Date();
        
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
        
        // Reset now to today
        const today = new Date();
        const diffMs = today - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (isToday) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        if (isYesterday) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getInitials = (user) => {
        if (!user) return '??';
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '??';
    };

    const tenant = conv?.other_user;
    const participantMeta = route.params?.participantMeta || conv?.participantMeta || null;
    const normalizedParticipantRole = normalizeRole(participantMeta?.role || tenant?.role);
    const participantRoleLabel = participantMeta?.roleLabel || getRoleLabel(normalizedParticipantRole);
    const participantOccupancyLabel = participantMeta?.occupancyLabel
        || (normalizedParticipantRole === 'caretaker' ? 'Caretaker' : null);
    const participantRoomLabel = participantMeta?.roomLabel
        || (normalizedParticipantRole === 'caretaker' ? 'Not assigned to a room' : 'No room assigned');
    const participantPropertyLabel = participantMeta?.propertyLabel || conv?.property?.title || 'No linked property';
    const participantPhone = tenant?.phone || participantMeta?.phone || null;
    const participantEmail = tenant?.email || participantMeta?.email || null;
    const participantName = tenant
        ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim()
        : 'Participant';
    const displayParticipantName = participantName || 'Participant';
    const participantStatusLine = normalizedParticipantRole === 'tenant'
        ? (participantOccupancyLabel || participantRoleLabel)
        : [participantRoleLabel, participantOccupancyLabel]
            .filter((value, index, list) => value && list.indexOf(value) === index)
            .join(' • ');
    const assignedPropertyNames = Array.isArray(participantMeta?.assignedPropertyNames)
        ? participantMeta.assignedPropertyNames
        : [];
    const propertyName = conv?.property?.title;
    const detailRows = [
        { label: 'Role', value: participantRoleLabel },
        {
            label: 'Status',
            value: normalizedParticipantRole === 'tenant'
                ? (participantOccupancyLabel || participantRoleLabel)
                : (participantOccupancyLabel || participantRoleLabel),
        },
        {
            label: 'Room',
            value: normalizedParticipantRole === 'tenant' ? participantRoomLabel : 'Not applicable',
        },
        { label: 'Property', value: participantPropertyLabel },
        { label: 'Phone', value: participantPhone || 'Not provided' },
        { label: 'Email', value: participantEmail || 'Not provided' },
    ];

    return (
        <SafeAreaView edges={safeAreaEdges} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : (isKeyboardVisible ? 'height' : undefined)}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle="light-content" />

                {/* Chat Header */}
                <View style={styles.chatScreenHeader}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.chatHeaderInfo}>
                        <View style={[styles.chatHeaderAvatar, { overflow: 'hidden' }]}>
                            {tenant?.profile_image ? (
                                <Image 
                                    source={{ uri: getImageUrl(tenant.profile_image) }} 
                                    style={{ width: '100%', height: '100%' }} 
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={styles.chatHeaderAvatarText}>{getInitials(tenant)}</Text>
                            )}
                        </View>
                        <View style={styles.chatHeaderText}>
                            <Text style={styles.chatHeaderName} numberOfLines={1}>
                                {displayParticipantName}
                            </Text>
                            {isOtherTyping ? (
                                <Text style={{ fontSize: 10, color: '#93C5FD', fontStyle: 'italic', fontWeight: 'bold' }}>typing...</Text>
                            ) : propertyName ? (
                                <Text style={styles.chatHeaderProperty} numberOfLines={1}>{propertyName}</Text>
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
                    {propertyName && (
                        <View style={styles.propertyCard}>
                            <Ionicons name="home-outline" size={24} color={theme.colors.primary} />
                            <View style={styles.propertyCardInfo}>
                                <Text style={styles.propertyCardTitle}>{propertyName}</Text>
                                <Text style={styles.propertyCardSubtitle}>Conversation about this property</Text>
                            </View>
                        </View>
                    )}

                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 40 }}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyMessagesContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyMessagesText}>No messages yet</Text>
                            <Text style={styles.emptyMessagesSubtext}>Say hello to start the conversation!</Text>
                        </View>
                    ) : (
                        messages.map((msg) => {
                            // Local fallback for isMine calculation
                            const isMine = msg.is_mine || (currentUserId && String(msg.sender_id) === String(currentUserId));
                            const isCaretakerMessage = msg.sender_role === 'caretaker';
                            const actualSenderName = msg.actual_sender ? `${msg.actual_sender.first_name} ${msg.actual_sender.last_name}` : 'Caretaker';
                            const isUnsent = Boolean(msg.is_unsent);
                            const replyingToMessage = msg.parent || msg.reply_to || null;

                            const handleLongPress = () => {
                                if (isUnsent) return;

                                let options = [];
                                if (isMine) {
                                    options = [
                                        { text: 'Edit', onPress: () => {
                                            setEditingMessage(msg);
                                            setReplyingTo(null);
                                            setMessageText(msg.message);
                                        }},
                                        { text: 'Unsend', style: 'destructive', onPress: () => {
                                            Alert.alert(
                                                'Unsend Message',
                                                'Unsend this message for everyone?',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Unsend', style: 'destructive', onPress: () => unsendMutation.mutate(msg.id) }
                                                ]
                                            );
                                        }},
                                        { text: 'Cancel', style: 'cancel' }
                                    ];
                                } else {
                                    options = [
                                        { text: 'Reply', onPress: () => {
                                            setReplyingTo(msg);
                                            setEditingMessage(null);
                                        }},
                                        { text: 'Cancel', style: 'cancel' }
                                    ];
                                }

                                Alert.alert('Message Options', '', options);
                            };

                            return (
                                <View key={msg.id} style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                                    <View style={[styles.messageContent, isMine ? styles.myMessageContent : styles.theirMessageContent]}>
                                        {isCaretakerMessage && msg.actual_sender && (
                                            <Text style={{ fontSize: 10, color: theme.colors.textSecondary, marginBottom: 2, alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
                                                via {actualSenderName}
                                            </Text>
                                        )}
                                        <TouchableOpacity 
                                            activeOpacity={isMine && !isUnsent ? 0.7 : 1}
                                            onLongPress={handleLongPress}
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
                                                        <View style={[
                                                            styles.replyPreview, 
                                                            { 
                                                                backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)', 
                                                                padding: 8, 
                                                                borderRadius: 6, 
                                                                borderLeftWidth: 3, 
                                                                borderLeftColor: theme.colors.primary,
                                                                marginBottom: 8
                                                            }
                                                        ]}>
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
                                                                <Text style={{ fontSize: 9, color: isMine ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary, marginLeft: 4, fontWeight: 'bold' }}>
                                                                    (edited)
                                                                </Text>
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
                    <View style={[{ padding: 12, backgroundColor: theme.colors.primaryLight, borderTopWidth: 1, borderTopColor: theme.colors.border, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, contentWrapStyle]}>
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
                        style={styles.textInput} 
                        placeholder="Type a message..." 
                        placeholderTextColor="#9CA3AF" 
                        value={messageText} 
                        onChangeText={setMessageText} 
                        multiline 
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, (!messageText.trim() && !selectedImage || sendMessageMutation.isPending || editMessageMutation.isPending) && styles.sendButtonDisabled, editingMessage && { backgroundColor: theme.colors.success || '#10B981' }]} 
                        onPress={handleSendMessage} 
                        disabled={(!messageText.trim() && !selectedImage) || sendMessageMutation.isPending || editMessageMutation.isPending}
                    >
                        {sendMessageMutation.isPending || editMessageMutation.isPending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name={editingMessage ? "checkmark" : "send"} size={20} color="#FFFFFF" />
                        )}
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
                                {tenant?.profile_image ? (
                                    <Image
                                        source={{ uri: getImageUrl(tenant.profile_image) }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={[styles.chatHeaderAvatarText, { color: theme.colors.primary }]}>{getInitials(tenant)}</Text>
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

                        {assignedPropertyNames.length > 0 && (
                            <View style={[styles.detailsSection, { borderColor: theme.colors.border }]}> 
                                <Text style={[styles.detailsSectionTitle, { color: theme.colors.textSecondary }]}>Assigned Properties</Text>
                                <View style={styles.detailPillWrap}>
                                    {assignedPropertyNames.map((assignedName) => (
                                        <View
                                            key={assignedName}
                                            style={[styles.detailPill, { backgroundColor: theme.colors.primaryLight }]}
                                        >
                                            <Text style={[styles.detailPillText, { color: theme.colors.primary }]} numberOfLines={1}>
                                                {assignedName}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        
                        {/* Caretaker Assignment Section (Visible only to landlord) */}
                        {conv && isLandlordView && (
                             <View style={[styles.detailsSection, { borderColor: theme.colors.border }]}>
                                 <Text style={[styles.detailsSectionTitle, { color: theme.colors.textSecondary }]}>Role Assignment</Text>
                                 <Text style={[{ fontSize: 13, marginBottom: 8, color: theme.colors.textSecondary }]}>
                                     Delegate this conversation to a specific caretaker. Once assigned, other caretakers will lose access.
                                 </Text>
                                 <View style={[{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.background, opacity: isAssigning ? 0.5 : 1 }]}>
                                     <TouchableOpacity
                                         style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}
                                         onPress={() => !isAssigning && setCaretakerSelectVisible(true)}
                                         disabled={isAssigning}
                                     >
                                         <Text style={{ color: assignedId ? theme.colors.text : theme.colors.textSecondary, fontSize: 14 }}>
                                             {assignedId ? caretakers.find(c => c.id === assignedId)?.first_name + ' ' + caretakers.find(c => c.id === assignedId)?.last_name : "Unassigned (Available to all)"}
                                         </Text>
                                         <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                     </TouchableOpacity>
                                 </View>
                             </View>
                        )}
                    </ScrollView>
                </Animated.View>
                    <Modal
                        visible={caretakerSelectVisible}
                        transparent
                        animationType="fade"
                        statusBarTranslucent={true}
                        navigationBarTranslucent={true}
                        onRequestClose={() => setCaretakerSelectVisible(false)}
                    >
                        <Pressable
                            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
                            onPress={() => setCaretakerSelectVisible(false)}
                        >
                            <Pressable style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 }} onPress={() => { }}>
                                <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20, color: theme.colors.text }}>Assign Caretaker</Text>
                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                                    <TouchableOpacity
                                        style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
                                        onPress={() => {
                                            handleAssignCaretaker("");
                                            setCaretakerSelectVisible(false);
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                            <Text style={[{ fontSize: 16, color: theme.colors.text }, !assignedId && { color: theme.colors.primary, fontWeight: 'bold' }]}>Unassigned (Available to all)</Text>
                                            {!assignedId && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                                        </View>
                                    </TouchableOpacity>
                                    {caretakers.map((c, index) => {
                                        const isLast = index === caretakers.length - 1;
                                        const isActive = c.id === assignedId;
                                        return (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={[{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, isLast && { borderBottomWidth: 0 }]}
                                                onPress={() => {
                                                    handleAssignCaretaker(c.id);
                                                    setCaretakerSelectVisible(false);
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                                    <Text style={[{ fontSize: 16, color: theme.colors.text }, isActive && { color: theme.colors.primary, fontWeight: 'bold' }]}>{`${c.first_name} ${c.last_name}`}</Text>
                                                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                <TouchableOpacity
                                    style={{ paddingVertical: 16, marginTop: 8 }}
                                    onPress={() => setCaretakerSelectVisible(false)}
                                >
                                    <Text style={{ fontSize: 16, color: theme.colors.error || "#EF4444", fontWeight: '500' }}>Cancel</Text>
                                </TouchableOpacity>
                            </Pressable>
                        </Pressable>
                    </Modal>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}