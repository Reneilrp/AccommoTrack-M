import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
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
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  statsScroll: {
    paddingBottom: 12,
    gap: 12,
  },
  statCard: {
    width: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  statValueGreen: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.success,
    textAlign: 'center',
  },
  statValueOrange: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.warning,
    textAlign: 'center',
  },
  statValueRed: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.error,
    textAlign: 'center',
  },
  statValueBlue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.info,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  mapButton: {
    padding: 6,
    marginLeft: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.text
  },
  filtersRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  filterActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary
  },
  filterInactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32
  },
  propertyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  cardBody: {
    flexDirection: 'row',
    marginTop: 12
  },
  imageColumn: {
    marginRight: 14,
    alignItems: 'center'
  },
  propertyImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundTertiary
  },
  propertyTypeContainer: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryLight
  },
  propertyTypeText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    fontWeight: '600'
  },
  propertyImageMedia: {
    width: '100%',
    height: '100%',
    borderRadius: 12
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardDetails: {
    flex: 1
  },
  addressText: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.backgroundTertiary,
    marginRight: 8,
    marginBottom: 6
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600'
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 10
  },
  metricsGrid: {
    marginTop: 10,
    gap: 6
  },
  metricsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  metricLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600'
  },
  progressBar: {
    marginTop: 12,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.backgroundTertiary,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginBottom: 12
  },
  errorText: {
    flex: 1,
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    fontSize: 13,
    marginLeft: 8
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center'
  },
  listHeaderSpacer: {
    paddingBottom: 12
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textSecondary
  }
});

export default getStyles;
