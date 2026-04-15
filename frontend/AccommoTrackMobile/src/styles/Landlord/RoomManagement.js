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
    paddingVertical: 8,
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
    marginTop: 0,
  },
  propertyScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  propertyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  propertyChipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  propertyChipTitleActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8
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
    marginTop: 8
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
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
  imageOverlayRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 30
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
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
    marginBottom: 16
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
  roomMenuAnchor: {
    position: 'relative',
    alignItems: 'flex-end'
  },
  roomMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  roomMenuButtonActive: {
    backgroundColor: theme.isDark ? '#334155' : '#E2E8F0'
  },
  roomMenuSheet: {
    position: 'absolute',
    top: 38,
    right: 0,
    minWidth: 168,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.isDark ? 0.35 : 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 20
  },
  roomMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  roomMenuItemLast: {
    borderBottomWidth: 0
  },
  roomMenuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
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
    padding: 16,
    marginBottom: 16
  },
  proxyHierarchySection: {
    gap: 10,
    marginBottom: 10,
  },
  proxyAccountCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    padding: 10,
    gap: 8,
  },
  proxyAccountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  proxyAccountName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  proxyAccountMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  proxyToggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  proxyToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
  },
  proxyOccupantList: {
    gap: 8,
    marginTop: 2,
  },
  proxyOccupantRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 3,
  },
  proxyOccupantName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  proxyOccupantMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  regularTenantSection: {
    gap: 6,
  },
  roomDetailsLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  roomDetailsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tenantLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary
  },
  tenantText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 8
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  amenityChip: {
    paddingHorizontal: 16,
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
    gap: 16
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
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
    marginTop: 16
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.background
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    marginTop: 24
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
    paddingVertical: 16,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 16,
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
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface
  },
  picker: {
    color: theme.colors.text,
    minHeight: 52,
    backgroundColor: theme.colors.surface,
  },
  pickerItem: {
    fontSize: 15,
    color: theme.colors.text,
  },
  selectTrigger: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  selectTriggerInner: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    paddingRight: 8,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 8
  },
  pillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
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
    marginTop: 16,
    gap: 16
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
    marginBottom: 8,
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
    marginBottom: 8
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
    padding: 16,
    marginBottom: 16
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
    padding: 8,
    zIndex: 10
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
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
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  detailsModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  detailsModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  detailsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailsModalMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailsProxyBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: theme.isDark ? 'rgba(245,158,11,0.18)' : '#FFFBEB',
  },
  detailsProxyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.isDark ? '#FCD34D' : '#B45309',
  },
  detailsModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailsModalScroll: {
    flex: 1,
  },
  detailsModalContent: {
    padding: 14,
    gap: 12,
  },
  detailsStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsStatCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  detailsStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailsStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailsTenantSection: {
    gap: 10,
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
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  modalEmptyView: {
    width: 42,
  },
  inputHalf: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row', 
    gap: 16
  },
  inputLabelRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between'
  },
  pricingGroup: {
    gap: 8
  },
  pricingRadioRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8
  },
  pricingTextContent: {
    flex: 1
  },
  pricingSelectionBox: {
    flexDirection: 'row', 
    gap: 8
  },
});

export default getStyles;
