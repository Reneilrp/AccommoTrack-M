import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    
    // Header
    header: {
        backgroundColor: '#10b981',
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
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    searchBar: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        shadowColor: 'transparent',
        elevation: 0,
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
        backgroundColor: '#F9FAFB',
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
        textAlign: 'center',
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
    newConversation: {
        backgroundColor: '#E0F2F1', 
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#10b981',
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
        color: '#10b981',
        marginTop: 2,
    },
    lastMessage: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    unreadBadge: {
        backgroundColor: '#10b981',
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
    chatScreenHeader: {
        backgroundColor: '#10b981',
        paddingHorizontal: 0,
        paddingTop: 8,
        paddingBottom: 8,
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        flexGrow: 1,
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
    emptyMessagesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyMessagesText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 12,
    },
    emptyMessagesSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
    },
    messageWrapper: {
        marginBottom: 12,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
        justifyContent: 'flex-start',
    },
    messageContent: {
        flexDirection: 'column',
        maxWidth: '92%',
    },
    myMessageContent: {
        alignItems: 'flex-end',
    },
    theirMessageContent: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '100%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    myMessageBubble: {
        backgroundColor: '#10b981',
        borderBottomRightRadius: 4,
        alignSelf: 'flex-end',
    },
    theirMessageBubble: {
        backgroundColor: '#D1FAE5',
        borderBottomLeftRadius: 4,
        borderWidth: 0,
        alignSelf: 'flex-start',
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
        marginTop: 6,
        color: '#9CA3AF',
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
        backgroundColor: '#10b981',
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

    // Skeletons & Spacing
    skeletonHeader: {
        flexDirection: 'row', 
        gap: 12, 
        marginBottom: 16
    },
    skeletonSpacer: {
        height: 16
    },
    scrollContent: {
        padding: 16
    },
    listContent: {
        paddingBottom: 16
    },
    placeholder: {
        width: 40
    }
});

export default styles;