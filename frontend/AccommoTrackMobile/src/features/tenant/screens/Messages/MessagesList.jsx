import React from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import { ConversationSkeleton, DashboardStatSkeleton } from '../../../../components/Skeletons/index.jsx';

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

const getRolePalette = (theme, role) => {
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (normalizedRole === 'caretaker') {
        return theme.isDark
            ? { background: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.45)', text: '#FCD34D' }
            : { background: '#FEF3C7', border: '#FCD34D', text: '#92400E' };
    }

    if (normalizedRole === 'landlord') {
        return theme.isDark
            ? { background: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.45)', text: '#6EE7B7' }
            : { background: '#D1FAE5', border: '#6EE7B7', text: '#065F46' };
    }

    return theme.isDark
        ? { background: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.4)', text: '#CBD5E1' }
        : { background: '#F1F5F9', border: '#CBD5E1', text: '#334155' };
};

const getStatusPalette = (theme, statusKey) => {
    const normalized = String(statusKey || '').trim().toLowerCase();

    if (normalized === 'caretaker-assisted') {
        return theme.isDark
            ? { background: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.45)', text: '#93C5FD' }
            : { background: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8' };
    }

    if (normalized === 'owner') {
        return theme.isDark
            ? { background: 'rgba(20, 184, 166, 0.2)', border: 'rgba(20, 184, 166, 0.45)', text: '#5EEAD4' }
            : { background: '#CCFBF1', border: '#5EEAD4', text: '#115E59' };
    }

    return theme.isDark
        ? { background: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.4)', text: '#CBD5E1' }
        : { background: '#F1F5F9', border: '#CBD5E1', text: '#334155' };
};

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
    menuModalVisible,
    setMenuModalVisible,
    handleMenuItemPress,
    properties = [],
    selectedPropertyId,
    setSelectedPropertyId,
}) {
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.container}>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={[
                            styles.searchBar,
                            { borderColor: theme.colors.border || 'rgba(16,185,129,0.12)' },
                        ]}>
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

                    {/* Property Filters */}
                    {!loading && properties.length > 0 && (
                        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
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
                        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.skeletonHeader}>
                                <DashboardStatSkeleton />
                                <DashboardStatSkeleton />
                            </View>
                            <View style={styles.skeletonSpacer} />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                            <ConversationSkeleton />
                        </ScrollView>
                    ) : filteredConversations.length === 0 ? (
                        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }] }>
                            <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textTertiary} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No conversations yet</Text>
                            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>Contact a landlord from a property listing to start chatting</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredConversations}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item: conv }) => {
                                const isNew = conv.id === newConversationId;
                                return (
                                    <TouchableOpacity
                                        style={[styles.conversationItem, isNew && styles.newConversation]}
                                        onPress={() => {
                                            const participantMeta = conv?.participantMeta || null;
                                            // Navigate to standalone Chat route so header and bottom nav are hidden
                                            try {
                                                navigation.navigate('Chat', { 
                                                    conversation: conv,
                                                    participantMeta,
                                                    hideLayout: true 
                                                });
                                            } catch (_navigationError) {
                                                // fallback: keep local behavior
                                                try { navigation.setParams({ hideLayout: true }); } catch (_paramsError) {}
                                            }
                                            if (isNew) {
                                                setNewConversationId(null);
                                            }
                                        }}
                                    >
                                        <View style={styles.avatarContainer}>
                                            <View style={[styles.avatar, { backgroundColor: theme.colors.surface || '#E5E7EB' }]}>
                                                <Text style={styles.avatarText}>{
                                                    (conv.property?.title?.substring(0,2) || (conv.other_user?.first_name?.[0] || '?'))
                                                }</Text>
                                            </View>
                                        </View>

                                        <View style={styles.conversationInfo}>
                                            {(() => {
                                                const participantMeta = conv?.participantMeta || null;
                                                const role = participantMeta?.role || conv?.other_user?.role || 'participant';
                                                const roleLabel = participantMeta?.roleLabel || 'Participant';
                                                const statusLabel = participantMeta?.statusLabel || null;
                                                const rolePalette = getRolePalette(theme, role);
                                                const statusPalette = getStatusPalette(theme, participantMeta?.statusKey);
                                                const shouldShowStatusBadge = Boolean(statusLabel)
                                                    && String(statusLabel).trim().toLowerCase() !== String(roleLabel).trim().toLowerCase();

                                                return (
                                                    <View style={styles.participantMetaRow}>
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

                                                        {shouldShowStatusBadge && (
                                                            <View
                                                                style={[
                                                                    styles.participantBadge,
                                                                    {
                                                                        backgroundColor: statusPalette.background,
                                                                        borderColor: statusPalette.border,
                                                                    },
                                                                ]}
                                                            >
                                                                <Text style={[styles.participantBadgeText, { color: statusPalette.text }]}>
                                                                    {statusLabel}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })()}

                                            <View style={styles.conversationHeader}>
                                                <Text style={[styles.conversationName, { color: theme.colors.text }]}>{conv.property?.title || `${conv.other_user?.first_name || ''} ${conv.other_user?.last_name || ''}`.trim()}</Text>
                                                <Text style={styles.conversationTime}>{formatTime(conv.last_message_at)}</Text>
                                            </View>
                                            <Text style={styles.propertyName}>{conv.other_user?.role ? conv.other_user.role.charAt(0).toUpperCase() + conv.other_user.role.slice(1) : 'Landlord'}</Text>
                                            <Text style={styles.lastMessage} numberOfLines={1}>{conv.last_message?.message || 'No messages yet'}</Text>
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
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>

                <MenuDrawer
                    visible={menuModalVisible}
                    onClose={() => setMenuModalVisible(false)}
                    onMenuItemPress={handleMenuItemPress}
                    isGuest={false}
                />
            </View>
        </SafeAreaView>
    );
}
