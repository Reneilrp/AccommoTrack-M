import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
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
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12
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
    paddingVertical: 10,
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
    marginTop: 16,
    paddingHorizontal: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: 14,
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
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  section: {
    padding: 20,
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
    gap: 10,
    marginTop: 16
  },
  actionCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.4 : 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4
  },
  actionArrow: {
    marginTop: 2
  },
  activityContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
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
    marginRight: 12
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
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
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    gap: 12,
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
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    marginTop: 4
  },
  occupancyBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
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
    gap: 20
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
    gap: 12,
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

export default getStyles;
