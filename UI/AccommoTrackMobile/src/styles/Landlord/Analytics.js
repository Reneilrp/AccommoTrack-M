import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Header Styles
  header: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
  },
  timeButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonActive: {
    backgroundColor: '#059669',
  },
  timeButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  timeButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  timeButtonTextActive: {
    color: 'white',
  },
  timeButtonTextInactive: {
    color: '#4B5563',
  },

  body: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 24,
    width: '48%',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dropdownContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: 50,
    height: 40,
    justifyContent: 'center',
  },
  dropdown: {
    height: 40,
    color: '#111827',
    fontSize: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  // Chart Styles
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 24,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  barChartContainer: {
    height: 256,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 8,
  },
  barItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 8,
  },

  // Room Performance Styles
  roomPerformanceContainer: {
    gap: 16,
  },
  roomItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  roomInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomType: {
    fontWeight: '600',
    color: '#111827',
  },
  roomDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  roomRevenue: {
    alignItems: 'flex-end',
  },
  roomRevenueValue: {
    fontWeight: '600',
    color: '#059669',
  },
  roomRevenueLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  progressBarBackground: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 9999,
    height: 8,
  },
  progressBarFill: {
    backgroundColor: '#059669',
    height: 8,
    borderRadius: 9999,
  },
  roomOccupancy: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 8,
  },


  quickInsightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  insightCard: {
    flex: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
    padding: 24,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  insightValue: {
    fontSize: 30,
    fontWeight: '700',
    color: 'white',
  },
  insightDetail: {
    color: '#F0FDF4',
  },
});