import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, RefreshControl, Text, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import createEcho from '../../../../services/echo';
import MessageService from '../../../../services/MessageService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getStyles } from '../../../../styles/Landlord/Messages';
import { API_BASE_URL, BASE_URL } from '../../../../config';

export default function ChatScreen({ navigation, route }) {
    const { theme } = useTheme();
    const styles = React.useMemo(() => getStyles(theme), [theme]);
    const queryClient = useQueryClient();
    const conv = route.params?.conversation || null;
    const [messageText, setMessageText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    const scrollViewRef = useRef(null);
    const echoRef = useRef(null);

    // Fetch messages using React Query
    const { 
        data: messages = [], 
        isLoading, 
        isRefetching, 
        refetch 
    } = useQuery({
        queryKey: ['messages', conv?.id],
        queryFn: async () => {
            if (!conv?.id) return [];
            const result = await MessageService.getConversationMessages(conv.id);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        enabled: !!conv?.id,
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: ({ text, imageUri }) => MessageService.sendMessage(conv.id, text, imageUri),
        onSuccess: (result) => {
            if (result.success) {
                setMessageText('');
                setSelectedImage(null);
                // Optimistically update
                queryClient.setQueryData(['messages', conv.id], (old) => [...(old || []), result.data]);
                scrollToBottom();
            } else {
                Alert.alert('Error', result.error || 'Failed to send message');
            }
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'Failed to send message');
        }
    });

    useEffect(() => {
        const loadUserId = async () => {
            const stored = await AsyncStorage.getItem('user');
            if (!stored) return;
            try {
                const parsed = JSON.parse(stored);
                const userId = parsed?.id || parsed?.user_id || parsed?.user?.id;
                setCurrentUserId(userId || null);
            } catch (e) {}
        };
        loadUserId();
    }, []);

    useEffect(() => {
        if (!conv) return;
        setupEcho();
        return () => {
            if (echoRef.current) {
                try { echoRef.current.leave(`conversation.${conv.id}`); } catch (e) {}
            }
        };
    }, [conv]);

    const setupEcho = async () => {
        try {
            echoRef.current = await createEcho();
            echoRef.current.private(`conversation.${conv.id}`).listen('.message.sent', (e) => {
                queryClient.setQueryData(['messages', conv.id], (old) => {
                    const exists = old?.find(m => m.id === e.message.id);
                    if (exists) return old;
                    return [...(old || []), e.message];
                });
                scrollToBottom();
            });
        } catch (err) {
            console.error('Echo setup failed:', err);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

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

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.replace(/^\/?(storage\/)?/, '');
        return `${BASE_URL}/storage/${cleanPath}`;
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
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '??';
    };

    const tenant = conv?.other_user;
    const propertyName = conv?.property?.title;

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                                {tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : 'Tenant'}
                            </Text>
                            {propertyName ? <Text style={styles.chatHeaderProperty} numberOfLines={1}>{propertyName}</Text> : null}
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
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
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
                            const isMine = String(msg.sender_id) === String(currentUserId);
                            return (
                                <View key={msg.id} style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                                    <View style={[styles.messageContent, isMine ? styles.myMessageContent : styles.theirMessageContent]}>
                                        <View style={[styles.messageBubble, isMine ? styles.myMessageBubble : styles.theirMessageBubble]}>
                                            {msg.image_url && (
                                                <Image 
                                                    source={{ uri: getImageUrl(msg.image_url) }} 
                                                    style={{ width: 200, height: 200, borderRadius: 8, marginBottom: msg.message ? 8 : 0 }} 
                                                    resizeMode="cover" 
                                                />
                                            )}
                                            {msg.message ? (
                                                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>{msg.message}</Text>
                                            ) : null}
                                        </View>
                                        <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Selected Image Preview */}
                {selectedImage && (
                    <View style={{ padding: 12, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row', alignItems: 'flex-start' }}>
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
                <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? 0 : 10 }]}>
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}