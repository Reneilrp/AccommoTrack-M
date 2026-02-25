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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary
  },
  listContent: {
    paddingBottom: 40
  },
  propertySelector: {
    marginTop: 16,
  },
  propertyScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  propertyChip: {
    width: 150,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  propertyChipActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary
  },
  propertyChipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  propertyChipMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 6,
    elevation: 1,
    alignItems: 'center',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 4
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary
  },
  filterText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  filterTextActive: {
    color: theme.colors.primaryDark,
  },
  filterBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700'
  },
  roomCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  roomImage: {
    width: '100%',
    height: 190,
    backgroundColor: theme.colors.backgroundTertiary
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
    color: theme.colors.text
  },
  roomMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  priceBlock: {
    alignItems: 'flex-end'
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary
  },
  priceCaption: {
    fontSize: 11,
    color: theme.colors.textTertiary,
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
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  tenantCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  tenantLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary
  },
  tenantText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  amenityText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
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
    backgroundColor: theme.colors.backgroundSecondary
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  statusButton: {
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#FEF3C7'
  },
  statusButtonText: {
    color: theme.isDark ? theme.colors.brand100 : '#B45309'
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEE2E2',
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  errorText: {
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    fontSize: 13
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center'
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.background
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
    marginTop: 20
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
    backgroundColor: theme.colors.surface
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface
  },
  picker: {
    color: theme.colors.text
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
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
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface
  },
  pillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text
  },
  pillTextActive: {
    color: theme.colors.primaryDark
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundTertiary,
    position: 'relative'
  },
  addImageTile: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface
  },
  pricingCard: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    backgroundColor: theme.colors.surface
  },
  pricingCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight
  },
  pricingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  pricingCardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  pricingInfoBox: {
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#EFF6FF',
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.brand700 : '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  pricingInfoText: {
    fontSize: 13,
    color: theme.isDark ? theme.colors.brand100 : '#1E40AF'
  },
  imageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    padding: 4,
    zIndex: 10
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.isDark ? theme.colors.backgroundTertiary : '#1E293B',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  dangerButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  statusSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  statusOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  statusOptionLast: {
    borderBottomWidth: 0
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary
  }
});

export default getStyles;
