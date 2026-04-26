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
        paddingHorizontal: 16,
        paddingVertical: 8,
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
        marginTop: 16,
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
        marginTop: 8,
        textAlign: 'center',
    },

    // Conversation List
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    newConversation: {
        backgroundColor: theme.isDark ? '#4A1F1F' : '#FFEBEE', 
    },
    avatarContainer: {
        marginRight: 16,
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
    participantMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    participantBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
    },
    participantBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
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
        marginTop: 8,
    },
    unreadBadge: {
        backgroundColor: '#EF4444',
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
        marginLeft: 16,
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    chatHeaderMeta: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.92)',
        marginTop: 1,
    },
    chatHeaderProperty: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    timestampOnMedia: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
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
        marginLeft: 16,
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
        marginTop: 16,
    },
    emptyMessagesSubtext: {
        fontSize: 14,
        color: theme.colors.textTertiary,
        marginTop: 8,
    },
    messageWrapper: {
        marginBottom: 16,
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
        maxWidth: '80%',
        flexShrink: 1,
    },
    myMessageContent: {
        alignItems: 'flex-end',
    },
    theirMessageContent: {
        alignItems: 'flex-start',
    },
    messageRoleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: theme.isDark ? 'rgba(148,163,184,0.22)' : '#EEF2FF',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(148,163,184,0.45)' : '#C7D2FE',
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginBottom: 4,
    },
    messageRoleBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.isDark ? '#CBD5E1' : '#3730A3',
    },
    messageBubble: {
        maxWidth: '100%',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        flexShrink: 1,
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
        flexShrink: 1,
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
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
    attachmentPreviewContainer: {
        padding: 12,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexDirection: 'row',
    },
    attachmentPreviewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    attachmentPreviewFile: {
        width: 60,
        height: 60,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    attachmentPreviewFileName: {
        fontSize: 8,
        color: theme.colors.text,
        marginTop: 2,
        textAlign: 'center',
    },
    attachmentPreviewClose: {
        position: 'absolute',
        top: 4,
        left: 56,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        zIndex: 1,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 10,
        borderRadius: 12,
        maxWidth: 260,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    fileIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    fileInfo: {
        flex: 1,
        marginRight: 8,
    },
    fileName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    fileExt: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 1,
        textTransform: 'uppercase',
    },
    detailsBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        zIndex: 20,
    },
    detailsDrawer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        borderLeftWidth: 1,
        zIndex: 30,
        shadowColor: '#000',
        shadowOffset: { width: -8, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
    },
    detailsHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    detailsHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    detailsHeaderSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    detailsCloseButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
    },
    detailsContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    detailsIdentityCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 14,
    },
    detailsAvatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    detailsIdentityName: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    detailsIdentityRole: {
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    detailsSection: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        gap: 8,
    },
    detailsSectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    detailRow: {
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        width: 74,
    },
    detailValue: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },

    // Skeletons & Spacing
    skeletonHeader: {
        flexDirection: 'row', 
        gap: 16, 
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
