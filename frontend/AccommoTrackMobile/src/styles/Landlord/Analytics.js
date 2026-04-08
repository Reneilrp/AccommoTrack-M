import { StyleSheet } from 'react-native';

export const getStyles = (theme, viewportWidth = 390) => {
  const resolvedWidth = Math.max(320, viewportWidth || 390);
  const isTablet = resolvedWidth >= 768;
  const tableMinWidth = isTablet ? Math.max(700, resolvedWidth - 56) : 840;

  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center'
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Filters Container
  filtersContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
    zIndex: 1000,
    elevation: 4
  },
  dropdownButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 250,
    zIndex: 5000
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  dropdownItemSelected: {
    backgroundColor: theme.isDark ? theme.colors.backgroundTertiary : theme.colors.primaryLight
  },
  dropdownItemText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500'
  },
  timeButtonContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 8,
    borderRadius: 10,
    gap: 8
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  timeButtonActive: {
    backgroundColor: theme.colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  timeButtonText: {
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase'
  },
  timeButtonTextActive: {
    color: theme.colors.primary
  },
  timeButtonTextInactive: {
    color: theme.colors.textSecondary
  },
  // Grid Layout for Metrics
  metricsScroll: {
    marginTop: 4
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    paddingRight: 20
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    width: Math.min(isTablet ? 260 : 220, Math.max(180, resolvedWidth * 0.62)),
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 4
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  metricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricTag: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase'
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text
  },
  metricSubValue: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: '500'
  },
  // Charts
  chartSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 24
  },
  // Horizontal Bar Chart
  hBarContainer: {
    gap: 16
  },
  hBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  hBarLabel: {
    width: 45,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  hBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 6,
    overflow: 'hidden'
  },
  hBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 6
  },
  hBarValue: {
    width: 70,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right'
  },
  // Table Styles
  tableCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  tableHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  tableContentContainer: {
    minWidth: tableMinWidth
  },
  tableGrid: {
    minWidth: tableMinWidth
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  tableHeadCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    alignItems: 'center'
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
    color: theme.colors.text
  },
  tableStatusCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center'
  },
  tableEmptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  tableEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500'
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    alignItems: 'center'
  },
  tableColMain: {
    flex: 2
  },
  tableColSide: {
    flex: 1,
    alignItems: 'flex-end'
  },
  tablePropName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  tablePropSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  tableRate: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary
  },
  tableRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 3,
    marginTop: 8,
    width: '100%',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start'
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  // States
  errorBanner: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  errorText: {
    color: theme.isDark ? theme.colors.text : '#DC2626',
    fontSize: 14,
    fontWeight: '500'
  },
  loadingState: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background
  },
  loadingLabel: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  exportModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text
  },
  exportLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase'
  },
  exportSegmentRow: {
    flexDirection: 'row',
    gap: 8
  },
  exportSegmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary
  },
  exportSegmentButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight
  },
  exportSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary
  },
  exportSegmentTextActive: {
    color: theme.colors.primary
  },
  exportStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    minHeight: 44
  },
  exportStepButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exportStepperValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text
  },
  exportActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  exportActionButton: {
    flex: 1,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exportCancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  exportConfirmButton: {
    backgroundColor: theme.colors.primary
  },
  exportCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text
  },
  exportConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverse
  }
  });
};

export default getStyles;
