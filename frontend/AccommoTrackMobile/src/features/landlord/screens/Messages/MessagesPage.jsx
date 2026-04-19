import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStyles } from '../../../../styles/Landlord/Messages.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import MessageService from '../../../../services/MessageService.js';
import PropertyService from '../../../../services/PropertyService.js';
import CaretakerService from '../../../../services/CaretakerService.js';
import MessagesList from './MessagesList.jsx';
import {
    landlordQueryKeys,
    useLandlordFocusRefetch,
    useLandlordRefreshHandler,
} from '../../hooks/useLandlordQueryHelpers.js';
import { showError } from '../../../../utils/toast.js';

const ROLE_LABELS = {
    tenant: 'Tenant',
    caretaker: 'Caretaker',
    landlord: 'Landlord',
};

const TENANT_GUEST_STATUSES = new Set([
    'confirmed',
    'completed',
    'partial-completed',
    'active',
]);

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const getRoleLabel = (role) => {
    const normalized = normalizeStatus(role);
    if (ROLE_LABELS[normalized]) return ROLE_LABELS[normalized];
    if (!normalized) return 'Participant';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const deriveTenantOccupancy = ({ hasRoom, profileStatus, bookingStatus }) => {
    if (hasRoom && profileStatus !== 'evicted' && profileStatus !== 'inactive') {
        return { key: 'tenant', label: 'Tenant' };
    }

    if (profileStatus === 'active') {
        return { key: 'tenant', label: 'Tenant' };
    }

    if (TENANT_GUEST_STATUSES.has(profileStatus) || TENANT_GUEST_STATUSES.has(bookingStatus)) {
        return { key: 'tenant', label: 'Tenant' };
    }

    return { key: 'guest', label: 'Guest' };
};

const buildTenantParticipantMeta = (tenant) => {
    if (!tenant) return null;

    const profileStatus = normalizeStatus(tenant?.tenantProfile?.status);
    const bookingStatus = normalizeStatus(tenant?.latestBooking?.status);
    const roomNumber = tenant?.room?.room_number
        || tenant?.latestBooking?.room?.room_number
        || tenant?.latestBooking?.room_number
        || null;
    const hasRoom = Boolean(roomNumber);
    const occupancy = deriveTenantOccupancy({ hasRoom, profileStatus, bookingStatus });

    return {
        userId: tenant.id,
        role: 'tenant',
        roleLabel: 'Tenant',
        occupancyKey: occupancy.key,
        occupancyLabel: occupancy.label,
        roomLabel: hasRoom ? `Room ${roomNumber}` : 'No room assigned',
        propertyLabel: tenant?.room?.property_name || tenant?.latestBooking?.property?.title || null,
        phone: tenant?.phone || null,
        email: tenant?.email || null,
        isCurrentTenant: occupancy.key === 'current',
        isGuestTenant: occupancy.key === 'guest',
    };
};

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

    const conversations = useMemo(
        () => (Array.isArray(conversationsQuery.data) ? conversationsQuery.data : []),
        [conversationsQuery.data],
    );
    const isLoading = conversationsQuery.isLoading;

    const tenantsDirectoryQuery = useQuery({
        queryKey: landlordQueryKeys.tenants(),
        queryFn: async () => {
            const result = await PropertyService.getTenants();
            if (!result.success || !Array.isArray(result.data)) {
                return [];
            }
            return result.data;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 2 * 60 * 1000,
    });

    const caretakersDirectoryQuery = useQuery({
        queryKey: landlordQueryKeys.caretakersBundle(),
        queryFn: async () => {
            const result = await CaretakerService.getCaretakers();
            if (!result.success || !Array.isArray(result.data?.caretakers)) {
                return [];
            }

            return result.data.caretakers;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 2 * 60 * 1000,
    });

    const tenantDirectory = useMemo(
        () => (Array.isArray(tenantsDirectoryQuery.data) ? tenantsDirectoryQuery.data : []),
        [tenantsDirectoryQuery.data],
    );
    const caretakerDirectory = useMemo(
        () => (Array.isArray(caretakersDirectoryQuery.data) ? caretakersDirectoryQuery.data : []),
        [caretakersDirectoryQuery.data],
    );

    const participantMetaByUserId = useMemo(() => {
        const map = {};

        tenantDirectory.forEach((tenant) => {
            const userId = tenant?.id;
            if (!userId) return;

            const meta = buildTenantParticipantMeta(tenant);
            if (!meta) return;

            map[String(userId)] = meta;
        });

        caretakerDirectory.forEach((assignment) => {
            const caretaker = assignment?.caretaker;
            const userId = caretaker?.id;
            if (!userId) return;

            const assignedPropertyNames = Array.isArray(assignment?.assigned_properties)
                ? assignment.assigned_properties
                    .map((property) => property?.name || property?.title)
                    .filter(Boolean)
                : [];

            map[String(userId)] = {
                userId,
                role: 'caretaker',
                roleLabel: 'Caretaker',
                occupancyKey: 'caretaker',
                occupancyLabel: 'Caretaker',
                roomLabel: 'Not assigned to a room',
                propertyLabel: assignedPropertyNames[0] || null,
                assignedPropertyNames,
                phone: caretaker?.phone || null,
                email: caretaker?.email || null,
                isCurrentTenant: false,
                isGuestTenant: false,
            };
        });

        return map;
    }, [tenantDirectory, caretakerDirectory]);

    const withParticipantMeta = React.useCallback((conversation) => {
        if (!conversation) return conversation;

        const userId = conversation?.other_user?.id;
        if (!userId) {
            return {
                ...conversation,
                participantMeta: null,
            };
        }

        const baseMeta = participantMetaByUserId[String(userId)] || null;
        const role = normalizeStatus(conversation?.other_user?.role);

        const participantMeta = {
            userId,
            role: role || baseMeta?.role || 'participant',
            roleLabel: getRoleLabel(role || baseMeta?.role),
            occupancyKey: baseMeta?.occupancyKey || null,
            occupancyLabel: baseMeta?.occupancyLabel || null,
            roomLabel: baseMeta?.roomLabel || (role === 'caretaker' ? 'Not assigned to a room' : 'No room assigned'),
            propertyLabel: conversation?.property?.title || baseMeta?.propertyLabel || null,
            assignedPropertyNames: baseMeta?.assignedPropertyNames || [],
            phone: conversation?.other_user?.phone || baseMeta?.phone || null,
            email: conversation?.other_user?.email || baseMeta?.email || null,
            isCurrentTenant: Boolean(baseMeta?.isCurrentTenant),
            isGuestTenant: Boolean(baseMeta?.isGuestTenant),
        };

        return {
            ...conversation,
            participantMeta,
        };
    }, [participantMetaByUserId]);

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
                    const conversationWithMeta = withParticipantMeta(conv);
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

            if (route.params?.startConversation && route.params?.tenant) {
                const tenant = route.params.tenant;
                const recipientId = tenant.user_id || tenant.userId || tenant.id || tenant.user?.id || tenant.tenant_id;
                
                if (recipientId) {
                    const payload = {
                        recipient_id: recipientId,
                        property_id: route.params.propertyId || tenant.property_id || null,
                    };
                    startConversation(payload);
                }
            }
        }, [route.params, startConversation, isStartingConversation])
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