import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Tenant/MessagesPage.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import MessageService from '../../../../services/MessageService.js';
import { showSuccess, showError } from '../../../../utils/toast.js';
import MessagesList from './MessagesList.jsx';
import { navigate as rootNavigate } from '../../../../navigation/RootNavigation.js';
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

const getConversationStatus = (conversation) => {
    const role = normalizeRole(conversation?.other_user?.role);
    const latestSenderRole = normalizeRole(conversation?.last_message?.sender_role);
    const latestMessageIsMine = Boolean(conversation?.last_message?.is_mine);

    if (role === 'caretaker') {
        return { key: 'caretaker', label: 'Caretaker' };
    }

    if (latestSenderRole === 'caretaker' && !latestMessageIsMine) {
        return { key: 'caretaker-assisted', label: 'Caretaker-assisted' };
    }

    if (role === 'landlord') {
        return { key: 'owner', label: 'Property Owner' };
    }

    return { key: 'participant', label: getRoleLabel(role) };
};

export default function MessagesPage({ navigation, route }) {
    const { theme } = useTheme();
    const styles = React.useMemo(() => getStyles(theme), [theme]);
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState(null);
    const [newConversationId, setNewConversationId] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const conversationsQuery = useQuery({
        queryKey: tenantQueryKeys.messagesConversations(),
        queryFn: async () => {
            const result = await MessageService.getConversations();
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        placeholderData: (previousData) => previousData,
    });

    const conversations = useMemo(
        () => (Array.isArray(conversationsQuery.data?.items) ? conversationsQuery.data.items : Array.isArray(conversationsQuery.data) ? conversationsQuery.data : []),
        [conversationsQuery.data],
    );
    const isLoading = conversationsQuery.isLoading;
    const refetchConversations = conversationsQuery.refetch;
    const conversationRefetchers = React.useMemo(
        () => [refetchConversations],
        [refetchConversations],
    );

    useTenantFocusRefetch({ refetchers: conversationRefetchers });

    const onRefresh = useTenantRefreshHandler({
        setRefreshing,
        refetchers: conversationRefetchers,
    });

    // Calculate total unread count
    const totalUnreadCount = useMemo(() => {
        return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
    }, [conversations]);

    // Store unread count in AsyncStorage for bottom navigation
    useEffect(() => {
        AsyncStorage.setItem('messages_unread_count', totalUnreadCount.toString());
    }, [totalUnreadCount]);

    // Start conversation mutation
    const withParticipantMeta = React.useCallback((conversation) => {
        if (!conversation) return conversation;

        const role = normalizeRole(conversation?.other_user?.role);
        const status = getConversationStatus(conversation);

        return {
            ...conversation,
            participantMeta: {
                userId: conversation?.other_user?.id || null,
                role: role || 'participant',
                roleLabel: getRoleLabel(role),
                statusKey: status.key,
                statusLabel: status.label,
                propertyLabel: conversation?.property?.title || null,
                phone: conversation?.other_user?.phone || null,
                email: conversation?.other_user?.email || null,
            },
        };
    }, []);

    const startConversationMutation = useMutation({
        mutationFn: (payload) => MessageService.startConversation(payload),
        onSuccess: (result) => {
            if (result.success) {
                const conv = result.data?.conversation || result.data;
                // Clear the start params immediately
                navigation.setParams({ startConversation: false, recipient: null, property: null, room: null });
                
                if (conv?.id) {
                    // Invalidate and refetch conversations
                    queryClient.invalidateQueries({ queryKey: tenantQueryKeys.messagesConversations() });
                    const conversationWithMeta = withParticipantMeta(conv);
                    // Navigate to the dedicated Chat screen
                    navigation.navigate('Chat', {
                        conversation: conversationWithMeta,
                        participantMeta: conversationWithMeta?.participantMeta || null,
                    });
                }
            } else {
                showError('Error', result.error || 'Failed to start conversation');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to start conversation');
        }
    });

    const startConversation = startConversationMutation.mutate;
    const isStartingConversation = startConversationMutation.isPending;

    useFocusEffect(
        React.useCallback(() => {
            if (isStartingConversation) return;

            if (route.params?.startConversation && route.params?.recipient) {
                const payload = {
                    recipient_id: route.params.recipient.id,
                    property_id: route.params.property?.id || null,
                };
                startConversation(payload);
            }
        }, [route.params, startConversation, isStartingConversation])
    );

    const handleMenuItemPress = async (itemTitle) => {
        setMenuModalVisible(false);
        switch (itemTitle) {
            case 'Dashboard':
                rootNavigate('Dashboard');
                break;
            case 'Notifications':
                rootNavigate('Notifications');
                break;
            case 'My Bookings':
                rootNavigate('MyBookings');
                break;
            case 'Billing & Payments':
            case 'Payments':
                rootNavigate('Payments');
                break;
            case 'Maintenance & Add-ons':
            case 'Service Requests':
                rootNavigate('ServiceRequests');
                break;
            case 'Settings':
                rootNavigate('Settings');
                break;
            case 'Help & Support':
                rootNavigate('HelpSupport');
                break;
            case 'Logout':
                try {
                    await AsyncStorage.removeItem('user');
                    await AsyncStorage.removeItem('user_id');
                    await AsyncStorage.removeItem('token');
                    showSuccess('Logged out', 'You have been successfully logged out');
                } catch (err) {
                    console.error('Logout cleanup failed', err);
                }
                rootNavigate('TenantHome');
                break;
            default:
                console.log('Menu item pressed:', itemTitle);
        }
    };

    // Extract unique properties for filtering
    const properties = useMemo(() => {
        const props = [];
        const seen = new Set();
        
        conversations.forEach(conv => {
            if (conv.property && !seen.has(conv.property.id)) {
                seen.add(conv.property.id);
                props.push(conv.property);
            }
        });
        
        return props;
    }, [conversations]);

    const filteredConversations = useMemo(() => {
        const filtered = conversations.filter((conv) => {
            const otherUser = conv.other_user || {};
            const name = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase());
            const matchesProperty = !selectedPropertyId || conv.property?.id === selectedPropertyId;
            
            return matchesSearch && matchesProperty;
        });

        return filtered.map((conversation) => withParticipantMeta(conversation));
    }, [conversations, searchQuery, selectedPropertyId, withParticipantMeta]);

    if (startConversationMutation.isPending) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Starting conversation...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <MessagesList
                theme={theme}
                styles={styles}
                loading={isLoading}
                filteredConversations={filteredConversations}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                refreshing={refreshing}
                onRefresh={onRefresh}
                newConversationId={newConversationId}
                setNewConversationId={setNewConversationId}
                navigation={navigation}
                menuModalVisible={menuModalVisible}
                setMenuModalVisible={setMenuModalVisible}
                handleMenuItemPress={handleMenuItemPress}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                setSelectedPropertyId={setSelectedPropertyId}
            />
        </View>
    );
}
