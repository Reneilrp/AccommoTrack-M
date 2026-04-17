import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, RefreshControl, Text, Image, Alert, Linking, useWindowDimensions, Animated, Pressable, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import createEcho from '../../../../services/echo.js';
import MessageService from '../../../../services/MessageService.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import { getStyles } from '../../../../styles/Landlord/Messages.js';
import { getImageUrl } from '../../../../utils/imageUtils.js';
import { Picker } from '@react-native-picker/picker';
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
    const showAlert = Alert.alert;
    const contentWrapStyle = React.useMemo(
        () => (viewportWidth >= 768 ? { width: '100%', maxWidth: 960, alignSelf: 'center' } : null),
        [viewportWidth],
    );
    const queryClient = useQueryClient();
    const conv = route.params?.conversation || null;
    const [messageText, setMessageText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const safeAreaEdges = ['top', 'bottom'];
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    
    // Assignment State
    const [caretakers, setCaretakers] = useState([]);
    const [assignedId, setAssignedId] = useState(conv?.caretaker_id || '');
    const [isAssigning, setIsAssigning] = useState(false);

    const scrollViewRef = useRef(null);
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
            } catch (e) {
                console.error('Failed to load user for chat:', e);
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
            } catch (e) {
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

    const messages = messagesQuery.data || [];
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
        mutationFn: ({ text, imageUri }) => MessageService.sendMessage(conv.id, text, imageUri),
        onSuccess: (result) => {
            if (result.success) {
                setMessageText('');
                setSelectedImage(null);
                // Optimistically update
                queryClient.setQueryData(messagesQueryKey, (old) => {
                    const messages = old || [];
                    if (messages.some(m => String(m.id) === String(result.data.id))) return old;
                    return [...messages, result.data];
                });
                queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
                scrollToBottom();
            } else {
                showAlert('Error', result.error || 'Failed to send message');
            }
        },
        onError: (err) => {
            showAlert('Error', err.message || 'Failed to send message');
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
                showAlert('Error', result.error || 'Failed to unsend message');
            }
        },
        onError: (err) => {
            showAlert('Error', err.message || 'Failed to unsend message');
        }
    });

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
             } else {
                 showAlert('Error', res.error || 'Failed to update assignment.');
             }
        } catch (_e) {
             showAlert('Error', 'Network error.');
        } finally {
             setIsAssigning(false);
        }
    };

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
    }, [conv?.id, messagesQueryKey, queryClient]);

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
            showAlert('Permission required', 'Please allow photo library access to send images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                showAlert('File too large', 'Image exceeds the 5MB limit.');
                return;
            }
            setSelectedImage(asset.uri);
        }
    };

    const handleSendMessage = () => {
        if ((!messageText.trim() && !selectedImage) || !conv || sendMessageMutation.isPending) return;
        sendMessageMutation.mutate({ text: messageText.trim(), imageUri: selectedImage });
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
                            {participantStatusLine ? (
                                <Text style={styles.chatHeaderMeta} numberOfLines={1}>{participantStatusLine}</Text>
                            ) : null}
                            {propertyName ? <Text style={styles.chatHeaderProperty} numberOfLines={1}>{propertyName}</Text> : null}
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

                            const handleLongPress = () => {
                                if (isMine && !isUnsent) {
                                    showAlert(
                                        'Unsend Message',
                                        'Unsend this message for everyone?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { 
                                                text: 'Unsend', 
                                                style: 'destructive',
                                                onPress: () => unsendMutation.mutate(msg.id)
                                            }
                                        ]
                                    );
                                }
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
                                                }
                                            ]}
                                        >
                                            {isUnsent ? (
                                                <Text style={[styles.messageText, { color: theme.colors.textSecondary, fontStyle: 'italic', fontSize: 12 }]}>This message was unsent</Text>
                                            ) : (
                                                <>
                                                    {msg.image_url && (
                                                        <Image 
                                                            source={{ uri: msg.image_url }} 
                                                            style={{ width: 200, height: 200, borderRadius: 8, marginBottom: msg.message ? 8 : 0 }} 
                                                            resizeMode="cover" 
                                                        />
                                                    )}
                                                    {msg.message ? (
                                                        <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>{msg.message}</Text>
                                                    ) : null}
                                                </>
                                            )}
                                        </TouchableOpacity>
                                        <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Selected Image Preview */}
                {selectedImage && (
                    <View style={[{ padding: 16, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row', alignItems: 'flex-start' }, contentWrapStyle]}>
                        <View style={{ position: 'relative' }}>
                            <Image source={{ uri: selectedImage }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                            <TouchableOpacity 
                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: theme.colors.error, borderRadius: 12 }}
                                onPress={() => setSelectedImage(null)}
                            >
                                <Ionicons name="close-circle" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
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
                        <Ionicons name="image" size={28} color={theme.colors.primary} />
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
                        style={[styles.sendButton, (!messageText.trim() && !selectedImage || sendMessageMutation.isPending) && styles.sendButtonDisabled]} 
                        onPress={handleSendMessage} 
                        disabled={(!messageText.trim() && !selectedImage) || sendMessageMutation.isPending}
                    >
                        {sendMessageMutation.isPending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="send" size={20} color="#FFFFFF" />
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
                                     <Picker
                                         selectedValue={assignedId}
                                         onValueChange={(itemValue) => handleAssignCaretaker(itemValue)}
                                         style={{ color: theme.colors.text }}
                                         dropdownIconColor={theme.colors.textSecondary}
                                         enabled={!isAssigning}
                                     >
                                         <Picker.Item label="Unassigned (Available to all)" value="" color={theme.colors.textSecondary} />
                                         {caretakers.map((c) => (
                                             <Picker.Item key={c.id} label={`${c.first_name} ${c.last_name}`} value={c.id} color={theme.colors.text} />
                                         ))}
                                     </Picker>
                                 </View>
                             </View>
                        )}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}