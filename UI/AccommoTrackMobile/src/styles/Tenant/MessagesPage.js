import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#16a34a',
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    
    // Header
    header: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerIcon: {
        padding: 8,
    },

    // Search
    searchContainer: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    searchBar: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },

    // Loading & Empty
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
    },

    // Conversation List
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#16a34a',
    },
    conversationInfo: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    conversationTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    propertyName: {
        fontSize: 12,
        color: '#16a34a',
        marginTop: 2,
    },
    lastMessage: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    unreadBadge: {
        backgroundColor: '#16a34a',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    unreadCount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },

    // Chat Header
    chatHeader: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 8,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
    },
    chatHeaderInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    chatHeaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatHeaderAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    chatHeaderText: {
        marginLeft: 12,
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    chatHeaderProperty: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },

    // Messages
    messagesContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    messagesContent: {
        padding: 16,
    },
    propertyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    propertyCardInfo: {
        marginLeft: 12,
    },
    propertyCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    propertyCardSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    messageWrapper: {
        marginBottom: 12,
    },
    myMessageWrapper: {
        alignItems: 'flex-end',
    },
    theirMessageWrapper: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    myMessageBubble: {
        backgroundColor: '#16a34a',
        borderBottomRightRadius: 4,
    },
    theirMessageBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    theirMessageText: {
        color: '#1F2937',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    myMessageTime: {
        color: '#9CA3AF',
        textAlign: 'right',
    },
    theirMessageTime: {
        color: '#9CA3AF',
        textAlign: 'left',
    },

    // Input
    inputContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    attachButton: {
        padding: 4,
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        color: '#1F2937',
    },
    sendButton: {
        backgroundColor: '#16a34a',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
});

export default styles;