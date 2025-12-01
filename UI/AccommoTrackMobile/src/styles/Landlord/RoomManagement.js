import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    backgroundColor: '#4CAF50',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 14,
    alignSelf: 'flex-start'
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A'
  },
  listContent: {
    paddingBottom: 120
  },
  propertySelector: {
    marginTop: 16,
    paddingHorizontal: 16
  },
  propertyScroll: {
    paddingVertical: 12
  },
  propertyChip: {
    width: 250,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  propertyChipActive: {
    borderWidth: 2,
    borderColor: '#16A34A'
  },
  propertyChipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  propertyChipMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 12
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280'
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  filterText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600'
  },
  filterBadge: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700'
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
  },
  roomImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0'
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  roomContent: {
    padding: 18
  },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  roomTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A'
  },
  roomMeta: {
    fontSize: 13,
    color: '#6B7280'
  },
  priceBlock: {
    alignItems: 'flex-end'
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A'
  },
  priceCaption: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  capacityText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600'
  },
  tenantCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  tenantLabel: {
    fontSize: 11,
    color: '#94A3B8'
  },
  tenantText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5'
  },
  amenityText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600'
  },
  roomActions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#E0F2FE'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1'
  },
  statusButton: {
    backgroundColor: '#FEF3C7'
  },
  statusButtonText: {
    color: '#B45309'
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#16A34A',
    borderBottomWidth: 0,
    minHeight: 60
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center'
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 20
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
    backgroundColor: '#FFFFFF'
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF'
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10
  },
  pillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12
  },
  pill: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF'
  },
  pillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A'
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    marginBottom: 12
  },
  addImageTile: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  pricingCard: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF'
  },
  pricingCardActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4'
  },
  pricingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  pricingCardDesc: {
    fontSize: 13,
    color: '#6B7280'
  },
  pricingInfoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  pricingInfoText: {
    fontSize: 13,
    color: '#1E40AF'
  },
  imageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    padding: 4
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end'
  },
  statusSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24
  },
  statusOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB'
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A'
  },
  statusOptionLast: {
    borderBottomWidth: 0
  }
});