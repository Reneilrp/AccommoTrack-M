import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16a34a'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  // Header
  header: {
    backgroundColor: '#16a34a',
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
  // Filters Container
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
    zIndex: 1000,
    elevation: 4
  },
  dropdownButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    borderBottomColor: '#F1F5F9'
  },
  dropdownItemSelected: {
    backgroundColor: '#F0FDF4'
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0F172A'
  },
  timeButtonContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
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
    color: '#16a34a'
  },
  timeButtonTextInactive: {
    color: '#64748B'
  },
  // Grid Layout for Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 36) / 2, // 2-column grid
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
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
    color: '#94A3B8',
    textTransform: 'uppercase'
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  metricSubValue: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500'
  },
  // Charts
  chartSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
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
    color: '#64748B'
  },
  hBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden'
  },
  hBarFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 6
  },
  hBarValue: {
    width: 70,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right'
  },
  // Table Styles
  tableCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden'
  },
  tableHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    color: '#0F172A'
  },
  tablePropSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  tableRate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a'
  },
  tableRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500'
  },
  loadingState: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B'
  }
});
