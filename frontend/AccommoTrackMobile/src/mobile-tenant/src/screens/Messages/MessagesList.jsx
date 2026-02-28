import React from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MenuDrawer from '../../components/MenuDrawer.jsx';
import { ConversationSkeleton, DashboardStatSkeleton } from '../../../../components/Skeletons';

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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
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
                        <View style={{ marginBottom: 12 }}>
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
                                    }}>All</Text>
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
                                            // Navigate to standalone Chat route so header and bottom nav are hidden
                                            try {
                                                navigation.navigate('Chat', { 
                                                    conversation: conv,
                                                    hideLayout: true 
                                                });
                                            } catch (e) {
                                                // fallback: keep local behavior
                                                try { navigation.setParams({ hideLayout: true }); } catch (err) {}
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
                                            <View style={styles.conversationHeader}>
                                                <Text style={[styles.conversationName, { color: theme.colors.text }]}>{conv.property?.title || `${conv.other_user?.first_name || ''} ${conv.other_user?.last_name || ''}`.trim()}</Text>
                                                <Text style={styles.conversationTime}>{formatTime(conv.last_message_at)}</Text>
                                            </View>
                                            <Text style={styles.propertyName}>{conv.other_user?.role ? conv.other_user.role.charAt(0).toUpperCase() + conv.other_user.role.slice(1) : 'Landlord'}</Text>
                                            <Text style={styles.lastMessage} numberOfLines={1}>{conv.last_message?.message || 'No messages yet'}</Text>
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
