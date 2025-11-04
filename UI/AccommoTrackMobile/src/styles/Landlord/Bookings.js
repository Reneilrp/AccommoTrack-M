import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 20
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  bookingsList: {
    flex: 1,
    paddingHorizontal: 16
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  guestInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  guestName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937'
  },
  guestEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280'
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  }
});