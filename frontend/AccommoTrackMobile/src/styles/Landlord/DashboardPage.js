import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563'
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#16a34a'
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6
  },
  header: {
    position: 'relative',
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12
  },
  greeting: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#16A34A'
  },
  notificationBadgeText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
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
    color: '#1F2937'
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#1F2937'
  },
  sectionHelper: {
    fontSize: 13,
    color: '#6B7280'
  },
  seeAllText: {
    fontSize: 14,
    color: '#16A34A',
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6'
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
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4
  },
  actionArrow: {
    marginTop: 2
  },
  activityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
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
    color: '#1F2937',
    marginBottom: 4
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6B7280'
  },
  activityTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#16A34A'
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  listItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  listContent: {
    flex: 1
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  listSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  listMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  listAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C'
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4
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
    color: '#1F2937'
  },
  propertyAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  occupancyBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  occupancyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
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
    color: '#6B7280',
    fontWeight: '500'
  },
  performanceCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  performanceSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981'
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  performanceStatLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
    performanceStatValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#111827'
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
      backgroundColor: '#FFF7ED',
      borderColor: '#FED7AA',
    },
    bannerPending: {
      backgroundColor: '#FFFBEB',
      borderColor: '#FDE68A',
    },
    bannerRejected: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    bannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    bannerText: {
      fontSize: 12,
      color: '#4B5563',
      lineHeight: 16,
    }
  });
  