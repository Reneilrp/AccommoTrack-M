import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Landlord/Messages.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import MessageService from '../../../../services/MessageService.js';
import MessagesList from './MessagesList.jsx';
import {
    landlordQueryKeys,
    useLandlordFocusRefetch,
    useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';

export default function MessagesPage({ navigation, route }) {
    const { theme } = useTheme();
    const styles = React.useMemo(() => getStyles(theme), [theme]);
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState(null);
    const [newConversationId, setNewConversationId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const conversationsQuery = useQuery({
        queryKey: landlordQueryKeys.messagesConversations(),
        queryFn: async () => {
            const result = await MessageService.getConversations();
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        placeholderData: (previousData) => previousData,
    });

    const conversations = conversationsQuery.data || [];
    const isLoading = conversationsQuery.isLoading;
    const refetchConversations = conversationsQuery.refetch;
    const conversationRefetchers = React.useMemo(
        () => [refetchConversations],
        [refetchConversations],
    );

    useLandlordFocusRefetch({ refetchers: conversationRefetchers });

    const onRefresh = useLandlordRefreshHandler({
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
    const startConversationMutation = useMutation({
        mutationFn: (payload) => MessageService.startConversation(payload),
        onSuccess: (result) => {
            if (result.success) {
                const conv = result.data?.conversation || result.data;
                // Clear the start params
                navigation.setParams({ startConversation: false, tenant: null, propertyId: null });
                
                if (conv?.id) {
                    queryClient.invalidateQueries({ queryKey: landlordQueryKeys.messagesConversations() });
                    navigation.navigate('Chat', { conversation: conv });
                }
            } else {
                Alert.alert('Error', result.error || 'Failed to start conversation');
            }
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'Failed to start conversation');
        }
    });

    useFocusEffect(
        React.useCallback(() => {
            if (route.params?.startConversation && route.params?.tenant) {
                const tenant = route.params.tenant;
                const recipientId = tenant.user_id || tenant.userId || tenant.id || tenant.user?.id || tenant.tenant_id;
                
                if (recipientId) {
                    const payload = {
                        recipient_id: recipientId,
                        property_id: route.params.propertyId || tenant.property_id || null,
                    };
                    startConversationMutation.mutate(payload);
                }
            }
        }, [route.params])
    );

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
        return conversations.filter((conv) => {
            const otherUser = conv.other_user || {};
            const name = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase());
            const matchesProperty = !selectedPropertyId || conv.property?.id === selectedPropertyId;
            
            return matchesSearch && matchesProperty;
        });
    }, [conversations, searchQuery, selectedPropertyId]);

    if (startConversationMutation.isPending) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Starting conversation...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
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
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                setSelectedPropertyId={setSelectedPropertyId}
            />
        </View>
    );
}