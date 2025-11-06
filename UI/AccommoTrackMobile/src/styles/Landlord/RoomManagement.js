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
    paddingBottom: 23
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'

  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: -5,
    backgroundColor: '#F5F5F5'
  },
  statChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80
  },
  statChipValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statChipLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12
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
  roomsList: {
    flex: 1,
    paddingHorizontal: 16
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  roomImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB'
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  roomContent: {
    padding: 16
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  roomNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  roomType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  roomPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right'
  },
  roomPriceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  roomInfo: {
    flexDirection: 'row',
    marginBottom: 12
  },
  roomInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  roomInfoText: {
    fontSize: 14,
    color: '#6B7280'
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12
  },
  tenantText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    flex: 1
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  amenityChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  amenityText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500'
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  editButton: {
    backgroundColor: '#E3F2FD'
  },
  statusButton: {
    backgroundColor: '#FFF3E0'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});