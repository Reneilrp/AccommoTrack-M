import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { styles } from '../../../../styles/Tenant/MessagesPage';
import { useTheme } from '../../../../contexts/ThemeContext';
import MessageService from '../../../../services/MessageService.js';
import { showSuccess, showError } from '../../../../utils/toast.js';
import MessagesList from './MessagesList.jsx';

export default function MessagesPage({ navigation, route }) {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [currentUserId, setCurrentUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState(null);
    const [newConversationId, setNewConversationId] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);

    // Fetch conversations using React Query
    const { 
        data: conversations = [], 
        isLoading, 
        isRefetching, 
        refetch 
    } = useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const result = await MessageService.getConversations();
            if (!result.success) throw new Error(result.error);
            return result.data;
        }
    });

    // Start conversation mutation
    const startConversationMutation = useMutation({
        mutationFn: (payload) => MessageService.startConversation(payload),
        onSuccess: (result) => {
            if (result.success) {
                const conv = result.data;
                // Clear the start params immediately
                navigation.setParams({ startConversation: false, recipient: null, property: null, room: null });
                
                if (conv?.id) {
                    // Invalidate and refetch conversations
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                    // Navigate to the dedicated Chat screen
                    navigation.navigate('Chat', { conversation: conv });
                }
            } else {
                showError('Error', result.error || 'Failed to start conversation');
            }
        },
        onError: (err) => {
            showError('Error', err.message || 'Failed to start conversation');
        }
    });

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
                // not JSON
            }
            const maybeId = parseInt(stored, 10);
            setCurrentUserId(Number.isNaN(maybeId) ? null : maybeId);
        };

        getUserId();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (route.params?.startConversation && route.params?.recipient) {
                const payload = {
                    recipient_id: route.params.recipient.id,
                    property_id: route.params.property?.id || null,
                };
                startConversationMutation.mutate(payload);
            }
        }, [route.params])
    );

    const onRefresh = () => {
        refetch();
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
                    await AsyncStorage.removeItem('user');
                    await AsyncStorage.removeItem('user_id');
                    await AsyncStorage.removeItem('token');
                    showSuccess('Logged out', 'You have been successfully logged out');
                } catch (err) {
                    console.error('Logout cleanup failed', err);
                }
                navigation.navigate('TenantHome');
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
                refreshing={isRefetching}
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
