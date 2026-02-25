import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    textAlign: 'center'
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchContainer: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
    textAlign: 'center'
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  newConversation: {
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#E8F5E9'
  },
  avatarContainer: {
    marginRight: 12
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary
  },
  conversationInfo: {
    flex: 1
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  conversationTime: {
    fontSize: 12,
    color: theme.colors.textTertiary
  },
  propertyName: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8
  },
  unreadCount: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600'
  },
  chatScreenHeader: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  chatHeaderAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  chatHeaderText: {
    marginLeft: 12
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  chatHeaderProperty: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)'
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1
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
    borderColor: theme.colors.border
  },
  propertyCardInfo: {
    marginLeft: 12
  },
  propertyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  propertyCardSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4
  },
  messageWrapper: {
    marginBottom: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  myMessageWrapper: {
    justifyContent: 'flex-end'
  },
  theirMessageWrapper: {
    justifyContent: 'flex-start'
  },
  messageContent: {
    flexDirection: 'column',
    maxWidth: '92%'
  },
  myMessageContent: {
    alignItems: 'flex-end'
  },
  theirMessageContent: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16
  },
  myMessageBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end'
  },
  theirMessageBubble: {
    backgroundColor: theme.colors.primaryLight,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  myMessageText: {
    color: theme.colors.textInverse
  },
  theirMessageText: {
    color: theme.colors.text
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    color: theme.colors.textTertiary
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  attachButton: {
    padding: 4,
    marginRight: 8
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: theme.colors.text
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textTertiary
  }
});

export default getStyles;
