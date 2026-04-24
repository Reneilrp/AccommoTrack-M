import React from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, FlatList, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConversationSkeleton } from '../../../../components/Skeletons/index.jsx';

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

const getInitials = (user) => {
  if (!user) return 'TN';
  const first = user.first_name?.[0] || user.firstName?.[0] || '';
  const last = user.last_name?.[0] || user.lastName?.[0] || '';
  const fallback = user.full_name || user.name || '';
  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }
  return fallback
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TN';
};

const getRolePalette = (theme, role) => {
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (normalizedRole === 'caretaker') {
        return theme.isDark
            ? { background: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.45)', text: '#FCD34D' }
            : { background: '#FEF3C7', border: '#FCD34D', text: '#92400E' };
    }

    if (normalizedRole === 'tenant') {
        return theme.isDark
            ? { background: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.45)', text: '#6EE7B7' }
            : { background: '#D1FAE5', border: '#6EE7B7', text: '#065F46' };
    }

    return theme.isDark
        ? { background: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.4)', text: '#CBD5E1' }
        : { background: '#F1F5F9', border: '#CBD5E1', text: '#334155' };
};

const getOccupancyPalette = (theme, occupancyKey) => {
    const normalizedKey = String(occupancyKey || '').trim().toLowerCase();

    if (normalizedKey === 'tenant' || normalizedKey === 'current') {
        return theme.isDark
            ? { background: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.45)', text: '#93C5FD' }
            : { background: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8' };
    }

    if (normalizedKey === 'guest') {
        return theme.isDark
            ? { background: 'rgba(244, 114, 182, 0.2)', border: 'rgba(244, 114, 182, 0.45)', text: '#F9A8D4' }
            : { background: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' };
    }

    return theme.isDark
        ? { background: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.4)', text: '#CBD5E1' }
        : { background: '#F1F5F9', border: '#CBD5E1', text: '#334155' };
};

import { Modal, ActivityIndicator } from 'react-native';

export default function MessagesList({
    theme,
    styles,
    loading,
    filteredConversations,
    searchQuery,
    setSearchQuery,
    refreshing,
    onRefresh,
    newConversationId,
    setNewConversationId,
    navigation,
    properties = [],
    selectedPropertyId,
    setSelectedPropertyId,
    // Broadcast Props
    broadcastModalVisible,
    setBroadcastModalVisible,
    broadcastMessage,
    setBroadcastMessage,
    broadcastTargetPropertyId,
    setBroadcastTargetPropertyId,
    isSendingBroadcast,
    onSendBroadcast,
}) {
    return (
        <SafeAreaView style={[styles.safeArea]} edges={['top']}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

            {/* Property Filters (If Landlord has multiple properties) */}
            {!loading && properties.length > 1 && (
                <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                    >
                        <TouchableOpacity
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: !selectedPropertyId ? theme.colors.primary : theme.colors.border,
                                backgroundColor: !selectedPropertyId ? theme.colors.primary : theme.colors.surface,
                            }}
                            onPress={() => setSelectedPropertyId(null)}
                        >
                            <Text style={{ color: !selectedPropertyId ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                                All Properties
                            </Text>
                        </TouchableOpacity>

                        {properties.map((prop) => {
                            const isActive = selectedPropertyId === prop.id;
                            return (
                                <TouchableOpacity
                                    key={prop.id}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                        backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                                    }}
                                    onPress={() => setSelectedPropertyId(prop.id)}
                                >
                                    <Text style={{ color: isActive ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                                        {prop.title || prop.name || `Property ${prop.id}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Conversations List */}
            {loading ? (
                <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                </ScrollView>
            ) : filteredConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No conversations yet</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                        Contact a tenant or caretaker from their profile to start chatting
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item: conv }) => {
                        const isNew = conv.id === newConversationId;
                        const initials = getInitials(conv.other_user);
                        const participantMeta = conv?.participantMeta || null;
                        const role = participantMeta?.role || conv?.other_user?.role || 'participant';
                        const roleLabel = participantMeta?.roleLabel || role;
                        const occupancyLabel = participantMeta?.occupancyLabel || null;
                        const roomLabel = participantMeta?.roomLabel || null;
                        const tenantIndicatorLabel = occupancyLabel || roleLabel;
                        const isTenantParticipant = String(role).trim().toLowerCase() === 'tenant';

                        const rolePalette = getRolePalette(theme, role);
                        const occupancyPalette = getOccupancyPalette(theme, participantMeta?.occupancyKey);
                        const shouldShowOccupancyBadge = Boolean(occupancyLabel)
                            && String(occupancyLabel).trim().toLowerCase() !== String(roleLabel).trim().toLowerCase();

                        return (
                            <TouchableOpacity
                                style={[styles.conversationItem, isNew && styles.newConversation]}
                                onPress={() => {
                                    navigation.navigate('Chat', {
                                        conversation: conv,
                                        participantMeta,
                                    });
                                    if (isNew) {
                                        setNewConversationId(null);
                                    }
                                }}
                            >
                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{initials}</Text>
                                    </View>
                                </View>

                                <View style={styles.conversationInfo}>
                                    <View style={styles.conversationHeader}>
                                        <Text style={[styles.conversationName, { color: theme.colors.text }]} numberOfLines={1}>
                                            {conv.other_user?.first_name} {conv.other_user?.last_name}
                                        </Text>
                                        <Text style={styles.conversationTime}>{formatTime(conv.last_message_at)}</Text>
                                    </View>

                                    <View style={styles.participantMetaRow}>
                                        {isTenantParticipant ? (
                                            <View
                                                style={[
                                                    styles.participantBadge,
                                                    {
                                                        backgroundColor: occupancyPalette.background,
                                                        borderColor: occupancyPalette.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={[styles.participantBadgeText, { color: occupancyPalette.text }]}>
                                                    {tenantIndicatorLabel}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View
                                                style={[
                                                    styles.participantBadge,
                                                    {
                                                        backgroundColor: rolePalette.background,
                                                        borderColor: rolePalette.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={[styles.participantBadgeText, { color: rolePalette.text }]}>
                                                    {roleLabel}
                                                </Text>
                                            </View>
                                        )}

                                        {!isTenantParticipant && shouldShowOccupancyBadge && (
                                            <View
                                                style={[
                                                    styles.participantBadge,
                                                    {
                                                        backgroundColor: occupancyPalette.background,
                                                        borderColor: occupancyPalette.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={[styles.participantBadgeText, { color: occupancyPalette.text }]}>
                                                    {occupancyLabel}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {conv.property?.title && (
                                        <Text style={styles.propertyName} numberOfLines={1}>
                                            {conv.property.title}
                                        </Text>
                                    )}

                                    {roomLabel && role === 'tenant' && (
                                        <Text style={styles.participantRoomMeta} numberOfLines={1}>
                                            {roomLabel}
                                        </Text>
                                    )}

                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                        {conv.last_message?.message || 'No messages yet'}
                                    </Text>
                                </View>

                                {conv.unread_count > 0 && (
                                    <View style={[styles.unreadBadge, { backgroundColor: '#EF4444' }]}>
                                        <Text style={styles.unreadCount}>{conv.unread_count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                            colors={[theme.colors.primary]} 
                            tintColor={theme.colors.primary} 
                        />
                    }
                />
            )}

            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: theme.colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 8,
                }}
                onPress={() => setBroadcastModalVisible(true)}
            >
                <Ionicons name="megaphone" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal
                visible={broadcastModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => !isSendingBroadcast && setBroadcastModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ 
                        backgroundColor: theme.colors.surface, 
                        borderTopLeftRadius: 24, 
                        borderTopRightRadius: 24, 
                        padding: 24,
                        paddingBottom: 40,
                        maxHeight: '80%'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>Send Property Broadcast</Text>
                            <TouchableOpacity onPress={() => setBroadcastModalVisible(false)} disabled={isSendingBroadcast}>
                                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 }}>Target Property</Text>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, marginBottom: 20 }}
                        >
                            {properties.map((prop) => {
                                const isActive = broadcastTargetPropertyId === prop.id;
                                return (
                                    <TouchableOpacity
                                        key={prop.id}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                            backgroundColor: isActive ? theme.colors.primary : theme.colors.backgroundSecondary,
                                        }}
                                        onPress={() => setBroadcastTargetPropertyId(prop.id)}
                                        disabled={isSendingBroadcast}
                                    >
                                        <Text style={{ color: isActive ? '#FFFFFF' : theme.colors.text, fontWeight: '700', fontSize: 13 }}>
                                            {prop.title || prop.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 }}>Announcement Message</Text>
                        <TextInput
                            style={{
                                backgroundColor: theme.colors.backgroundSecondary,
                                borderRadius: 16,
                                padding: 16,
                                fontSize: 15,
                                color: theme.colors.text,
                                minHeight: 120,
                                textAlignVertical: 'top',
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                marginBottom: 24
                            }}
                            placeholder="Type your property-wide announcement here..."
                            placeholderTextColor={theme.colors.textTertiary}
                            multiline
                            value={broadcastMessage}
                            onChangeText={setBroadcastMessage}
                            disabled={isSendingBroadcast}
                        />

                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.colors.primary,
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 10,
                                opacity: !broadcastTargetPropertyId || !broadcastMessage.trim() || isSendingBroadcast ? 0.6 : 1
                            }}
                            disabled={!broadcastTargetPropertyId || !broadcastMessage.trim() || isSendingBroadcast}
                            onPress={onSendBroadcast}
                        >
                            {isSendingBroadcast ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={18} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Send to All Residents</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
        </SafeAreaView>
    );
}