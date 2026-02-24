import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  statValueGreen: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'center',
  },
  statValueOrange: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#F97316',
    textAlign: 'center',
  },
  statValueRed: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
  },
  statValueBlue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  mapButton: {
    padding: 6,
    marginLeft: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827'
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
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  filterInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB'
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
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
    color: '#111827'
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
    backgroundColor: '#E5E7EB'
  },
  propertyTypeContainer: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7'
  },
  propertyTypeText: {
    fontSize: 11,
    color: '#166534',
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
    color: '#6B7280'
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
    backgroundColor: '#EEF2FF',
    marginRight: 8,
    marginBottom: 6
  },
  chipText: {
    fontSize: 12,
    color: '#4338CA',
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
    color: '#1F2937',
    fontWeight: '600'
  },
  progressBar: {
    marginTop: 12,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 12
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
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
    color: '#1F2937',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center'
  },
  listHeaderSpacer: {
    paddingBottom: 12
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280'
  }
});
