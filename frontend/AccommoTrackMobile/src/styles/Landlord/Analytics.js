import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10b981'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  // Header
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Filters Container - Sticky
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
    zIndex: 1000,
    elevation: 10
  },
  // Custom Dropdown
  dropdownContainer: {
    zIndex: 1000
  },
  dropdownButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 200,
    overflow: 'hidden'
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
    color: '#0F172A',
    flex: 1
  },
  dropdownItemTextSelected: {
    color: '#10b981',
    fontWeight: '600'
  },
  propertyPicker: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    minHeight: 50,
    overflow: 'visible'
  },
  propertyPickerStyle: {
    backgroundColor: '#F8FAFC',
    height: 50,
    width: '100%',
    color: '#0F172A',
    fontSize: 14
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#0F172A',
    fontSize: 14
  },
  timeButtonContainer: {
    flexDirection: 'row',
    gap: 8
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  timeButtonActive: {
    backgroundColor: '#10b981'
  },
  timeButtonInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  timeButtonText: {
    fontWeight: '600',
    fontSize: 13
  },
  timeButtonTextActive: {
    color: '#FFFFFF'
  },
  timeButtonTextInactive: {
    color: '#475569'
  },
  // Error & Loading
  errorBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '500'
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12
  },
  loadingLabel: {
    fontSize: 14,
    color: '#64748B'
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center'
  },
  // Body
  body: {
    paddingVertical: 16
  },
  // Stats Cards - Horizontal Scroll
  statsScrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 16
  },
  statCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statHint: {
    fontSize: 12,
    fontWeight: '600'
  },
  statTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A'
  },
  // Chart Cards
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16
  },
  // Bar Chart
  barChartContainer: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 16
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    height: '100%'
  },
  barWrapper: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end'
  },
  bar: {
    width: '100%',
    backgroundColor: '#10b981',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4
  },
  barLabel: {
    marginTop: 8,
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center'
  },
  // Room Performance - Horizontal Scroll
  roomScrollContainer: {
    gap: 12
  },
  roomCard: {
    width: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  roomType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A'
  },
  roomDetails: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10
  },
  roomRevenueValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669'
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9'
  },
  progressBarFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#10b981'
  },
  roomOccupancy: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748B'
  },
  // Payment/Booking Status - Horizontal Scroll
  paymentScrollContainer: {
    gap: 10
  },
  paymentCard: {
    width: 100,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center'
  },
  paymentValue: {
    fontSize: 24,
    fontWeight: '700'
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4
  },
  collectionFooter: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  collectionLabel: {
    fontSize: 13,
    color: '#64748B'
  },
  collectionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A'
  },
  // Property Comparison
  propertyList: {
    gap: 0
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  propertyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A'
  },
  propertySubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  propertyStats: {
    alignItems: 'flex-end'
  },
  propertyOccupancy: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981'
  },
  propertyRevenue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  // Quick Insights - Horizontal Scroll
  insightsScrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24
  },
  insightCard: {
    width: 180,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  insightDetail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6
  }
});