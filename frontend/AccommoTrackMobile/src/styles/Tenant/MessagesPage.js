import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.primary,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    
    // Header
    header: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textInverse,
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
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: theme.colors.text,
    },

    // Loading & Empty
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.textSecondary,
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
        color: theme.colors.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textTertiary,
        marginTop: 4,
        textAlign: 'center',
    },

    // Conversation List
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    newConversation: {
        backgroundColor: theme.isDark ? theme.colors.brand900 : '#E0F2F1', 
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.primary,
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
        color: theme.colors.text,
    },
    conversationTime: {
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
    propertyName: {
        fontSize: 12,
        color: theme.colors.primary,
        marginTop: 2,
    },
    lastMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    unreadBadge: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    unreadCount: {
        color: theme.colors.textInverse,
        fontSize: 12,
        fontWeight: '600',
    },

    // Chat Header
    chatScreenHeader: {
        backgroundColor: theme.colors.primary,
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
        backgroundColor: theme.colors.background,
    },
    messagesContent: {
        padding: 16,
        flexGrow: 1,
    },
    propertyCard: {
        backgroundColor: theme.colors.surface,
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
        borderWidth: theme.isDark ? 1 : 0,
        borderColor: theme.colors.border,
    },
    propertyCardInfo: {
        marginLeft: 12,
    },
    propertyCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    propertyCardSubtitle: {
        fontSize: 12,
        color: theme.colors.textTertiary,
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
        color: theme.colors.textSecondary,
        marginTop: 12,
    },
    emptyMessagesSubtext: {
        fontSize: 14,
        color: theme.colors.textTertiary,
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
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
        alignSelf: 'flex-end',
    },
    theirMessageBubble: {
        backgroundColor: theme.colors.primaryLight,
        borderBottomLeftRadius: 4,
        borderWidth: 0,
        alignSelf: 'flex-start',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: theme.colors.textInverse,
    },
    theirMessageText: {
        color: theme.colors.text,
    },
    messageTime: {
        fontSize: 11,
        marginTop: 6,
        color: theme.colors.textTertiary,
    },

    // Input
    inputContainer: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    attachButton: {
        padding: 4,
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        color: theme.colors.text,
    },
    sendButton: {
        backgroundColor: theme.colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: theme.colors.textTertiary,
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

export default getStyles;
