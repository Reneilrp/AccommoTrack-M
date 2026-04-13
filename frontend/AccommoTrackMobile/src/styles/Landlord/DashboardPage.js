import { StyleSheet } from 'react-native';

export const getStyles = (theme, viewportWidth = 390, viewportHeight = 844) => {
  const screenWidth = Math.max(320, viewportWidth || 390);
  const screenHeight = Math.max(480, viewportHeight || 844);
  const actionCardSize = Math.min(84, Math.max(72, (screenWidth - 56) / 3));

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.primary
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
    marginLeft: 6
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 12,
    color: theme.colors.textInverse,
    opacity: 0.9
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    textAlign: 'center'
  },
  notificationButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center'
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary
  },
  notificationBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: 'bold'
  },
  statsContainer: {
    marginTop: 8,
    paddingHorizontal: 16
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 6
  },
  statCard: {
    width: Math.min(230, Math.max(185, screenWidth * 0.62)),
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    marginRight: 2,
  },
  statCardLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statCardRight: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardBlue: {
    backgroundColor: theme.isDark ? '#1E293B' : '#EFF6FF',
    borderColor: theme.isDark ? '#334155' : '#DBEAFE',
  },
  statCardGreen: {
    backgroundColor: theme.isDark ? '#064E3B' : '#F0FDF4',
    borderColor: theme.isDark ? '#065F46' : '#DCFCE7',
  },
  statCardPurple: {
    backgroundColor: theme.isDark ? '#4C1D95' : '#FAF5FF',
    borderColor: theme.isDark ? '#5B21B6' : '#F3E8FF',
  },
  statCardAmber: {
    backgroundColor: theme.isDark ? '#78350F' : '#FFFBEB',
    borderColor: theme.isDark ? '#92400E' : '#FEF3C7',
  },
  statIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statBadgeText: {
    fontSize: 9,
    fontWeight: '600'
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  chartContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    alignSelf: 'flex-start',
    marginBottom: 16
  },
  section: {
    padding: 16,
    paddingTop: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  sectionHelper: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600'
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 10,
    columnGap: 8,
    marginTop: 8
  },
  actionCard: {
    width: actionCardSize,
    minHeight: 84,
    backgroundColor: 'transparent',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  actionCardRestricted: {
    opacity: 0.6,
  },
  actionRestrictedBadge: {
    position: 'absolute',
    top: 2,
    left: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#B45309',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 2,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  actionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionIcon: {
    width: 36,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 4,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.colors.border,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionsMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  quickActionsMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  quickActionsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  quickActionsModalCard: {
    width: Math.min(screenWidth - 24, 440),
    maxHeight: Math.min(screenHeight * 0.7 + 10, screenHeight - 32),
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  quickActionsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  quickActionsModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  quickActionsModalBody: {
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  quickActionsCategorySection: {
    marginBottom: 14,
  },
  quickActionsCategoryCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    overflow: 'hidden',
  },
  quickActionsCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickActionsCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  quickActionsCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  quickActionsCategoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  quickActionsCategoryAction: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  quickActionsCategoryActionLast: {
    marginRight: 0,
  },
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  logoutModalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  logoutModalMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  logoutModalActions: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  logoutModalCancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  logoutModalConfirmButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  permissionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  permissionModalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permissionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  permissionModalMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  permissionModalButton: {
    marginTop: 18,
    minWidth: 120,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionModalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionArrow: {
    marginTop: 2
  },
  activityContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  activitySubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  activityTimestamp: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textTertiary
  },
  listItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.border
  },
  listContent: {
    flex: 1
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  listSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  listMeta: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2
  },
  listAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.error
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600'
  },
  propertyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  propertyAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8
  },
  occupancyBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12
  },
  occupancyText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse
  },
  propertyStats: {
    flexDirection: 'row',
    gap: 24
  },
  propertyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  propertyStatText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500'
  },
  performanceCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    backgroundColor: theme.colors.surface
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  performanceSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize'
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  performanceStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
    performanceStatValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text
    },
    verificationBanner: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
    },
    bannerNotSubmitted: {
      backgroundColor: theme.isDark ? theme.colors.brand900 : '#FFF7ED',
      borderColor: theme.isDark ? theme.colors.brand700 : '#FED7AA',
    },
    bannerPending: {
      backgroundColor: theme.isDark ? theme.colors.brand800 : '#FFFBEB',
      borderColor: theme.isDark ? theme.colors.brand600 : '#FDE68A',
    },
    bannerRejected: {
      backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
      borderColor: theme.isDark ? theme.colors.error : '#FECACA',
    },
    bannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
      color: theme.colors.text,
    },
    bannerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    }
    });
  };

export default getStyles;
