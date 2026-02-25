import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const getStyles = (theme) => StyleSheet.create({
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
    zIndex: 1000,
    elevation: 4
  },
  dropdownButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 200
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.primaryLight
  },
  dropdownItemText: {
    fontSize: 14,
    color: theme.colors.text
  },
  timeButtonContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 4,
    borderRadius: 10,
    gap: 4
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    width: (width - 36) / 2, // 2-column grid
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
    marginBottom: 12
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
    marginBottom: 4
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
    marginBottom: 20
  },
  // Horizontal Bar Chart
  hBarContainer: {
    gap: 16
  },
  hBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
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
    paddingVertical: 4,
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
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary
  }
});

export default getStyles;
