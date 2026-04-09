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
import { showError } from '../../../../utils/toast.js';
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
    const [refreshing, setRefreshing] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const safeAreaEdges = ['top', 'bottom'];
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const scrollViewRef = useRef(null);
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

    const messages = messagesQuery.data || [];
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
                queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
                scrollToBottom();
            } else {
                showError('Failed to send message', result.error);
            }
        },
        onError: (err) => {
            showError('Error', err.message);
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

    useEffect(() => {
        if (!conv?.id) return;

        const setupEcho = async () => {
            try {
                echoRef.current = await createEcho();
                echoRef.current.private(`conversation.${conv.id}`).listen('.message.sent', (e) => {
                    const incomingMessage = e.message;

                    queryClient.setQueryData(messagesQueryKey, (old) => {
                        const messages = old || [];
                        // Avoid duplicates by checking ID (convert to string for safe comparison)
                        if (messages.some((messageItem) => String(messageItem.id) === String(incomingMessage.id))) {
                            return old;
                        }
                        return [...messages, incomingMessage];
                    });
                    queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
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
            Alert.alert('Permission required', 'Please allow photo library access to send images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                Alert.alert('File too large', 'Image exceeds the 5MB limit.');
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
                            {participantStatusLine ? (
                                <Text style={styles.chatHeaderMeta} numberOfLines={1}>{participantStatusLine}</Text>
                            ) : null}
                            <Text style={styles.chatHeaderProperty} numberOfLines={1}>{participantPropertyLabel}</Text>
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
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyMessagesContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                            <Text style={[styles.emptyMessagesText, { color: theme.colors.textSecondary }]}>No messages yet</Text>
                            <Text style={[styles.emptyMessagesSubtext, { color: theme.colors.textTertiary }]}>Say hello to start the conversation!</Text>
                        </View>
                    ) : (
                        messages.map((msg) => {
                            // Local fallback for isMine calculation
                            const isMine = msg.is_mine || (currentUserId && String(msg.sender_id) === String(currentUserId));
                            const isCaretakerMessage = msg.sender_role === 'caretaker';
                            const actualSenderName = msg.actual_sender ? `${msg.actual_sender.first_name} ${msg.actual_sender.last_name}` : 'Caretaker';

                            return (
                                <View key={msg.id} style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                                    <View style={[styles.messageContent, isMine ? styles.myMessageContent : styles.theirMessageContent]}>
                                        {isCaretakerMessage && msg.actual_sender && (
                                            <Text style={{ fontSize: 10, color: theme.colors.textSecondary, marginBottom: 2, alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
                                                via {actualSenderName}
                                            </Text>
                                        )}
                                        <View style={[styles.messageBubble, isMine ? styles.myMessageBubble : styles.theirMessageBubble, isMine && { backgroundColor: theme.colors.primary }]}>
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
                                        </View>
                                        <Text style={[styles.messageTime, { color: theme.colors.textTertiary }]}>{formatTime(msg.created_at)}</Text>
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
                            backgroundColor: theme.colors.surface,
                            borderTopColor: theme.colors.border,
                            paddingBottom: 8,
                        },
                    ]}
                >
                    <TouchableOpacity style={styles.attachButton} activeOpacity={0.7} onPress={handlePickImage}>
                        <Ionicons name="image" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TextInput style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]} placeholder="Type a message..." placeholderTextColor="#9CA3AF" value={messageText} onChangeText={setMessageText} multiline />
                    <TouchableOpacity 
                        style={[styles.sendButton, (!messageText.trim() && !selectedImage || sendMessageMutation.isPending) && styles.sendButtonDisabled, !(!messageText.trim() && !selectedImage || sendMessageMutation.isPending) && { backgroundColor: theme.colors.primary }]} 
                        onPress={handleSendMessage} 
                        disabled={(!messageText.trim() && !selectedImage) || sendMessageMutation.isPending}
                    >
                        {sendMessageMutation.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
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
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
