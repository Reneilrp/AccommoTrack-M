import React from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, FlatList, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConversationSkeleton } from '../../../../components/Skeletons';

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
}) {
    return (
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
            {!loading && properties.length > 0 && (
                <View style={{ paddingVertical: 12, backgroundColor: theme.colors.backgroundSecondary }}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    >
                        <TouchableOpacity
                            style={[
                                { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
                                !selectedPropertyId 
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } 
                                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                            ]}
                            onPress={() => setSelectedPropertyId(null)}
                        >
                            <Text style={{ 
                                color: !selectedPropertyId ? '#FFF' : theme.colors.textSecondary,
                                fontWeight: !selectedPropertyId ? '600' : '400'
                            }}>All Properties</Text>
                        </TouchableOpacity>

                        {properties.map((prop) => (
                            <TouchableOpacity
                                key={prop.id}
                                style={[
                                    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
                                    selectedPropertyId === prop.id 
                                        ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } 
                                        : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                                ]}
                                onPress={() => setSelectedPropertyId(prop.id)}
                            >
                                <Text style={{ 
                                    color: selectedPropertyId === prop.id ? '#FFF' : theme.colors.textSecondary,
                                    fontWeight: selectedPropertyId === prop.id ? '600' : '400'
                                }}>{prop.title}</Text>
                            </TouchableOpacity>
                        ))}
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
                        Contact a tenant from their profile to start chatting
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item: conv }) => {
                        const isNew = conv.id === newConversationId;
                        const initials = getInitials(conv.other_user);
                        return (
                            <TouchableOpacity
                                style={[styles.conversationItem, isNew && styles.newConversation]}
                                onPress={() => {
                                    navigation.navigate('Chat', { conversation: conv });
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
                                    {conv.property?.title && (
                                        <Text style={styles.propertyName} numberOfLines={1}>
                                            {conv.property.title}
                                        </Text>
                                    )}
                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                        {conv.last_message?.message || 'No messages yet'}
                                    </Text>
                                </View>

                                {conv.unread_count > 0 && (
                                    <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
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
        </View>
    );
}