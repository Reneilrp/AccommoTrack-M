import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginLeft: 12,
  },
  headerSubtitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subtitleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  addServiceButton: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addServiceButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primaryDark,
  },
  tabBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeTabBadge: {
    backgroundColor: theme.colors.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  activeTabBadgeText: {
    color: theme.colors.textInverse,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  
  // Manage Tab Styles
  addonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveAddonCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.borderLight,
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addonNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  addonName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  inactiveBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  addonActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionIconButton: {
    padding: 6,
    borderRadius: 8,
  },
  editIconButton: {
    backgroundColor: theme.colors.primaryLight,
  },
  deleteIconButton: {
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  monthlyBadge: {
    backgroundColor: theme.colors.infoLight,
  },
  monthlyBadgeText: {
    color: theme.colors.infoDark,
    fontSize: 11,
    fontWeight: '600',
  },
  oneTimeBadge: {
    backgroundColor: theme.colors.purpleLight,
  },
  oneTimeBadgeText: {
    color: theme.colors.purple,
    fontSize: 11,
    fontWeight: '600',
  },
  rentalBadge: {
    backgroundColor: theme.colors.successLight,
  },
  rentalBadgeText: {
    color: theme.colors.successDark,
    fontSize: 11,
    fontWeight: '600',
  },
  feeBadge: {
    backgroundColor: theme.colors.warningLight,
  },
  feeBadgeText: {
    color: theme.colors.warningDark,
    fontSize: 11,
    fontWeight: '600',
  },
  addonDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  addonPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 12,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  addonStock: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },

  // Requests Tab Styles
  requestCard: {
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.brand700 : '#FDE68A',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestTenantInfo: {
    marginTop: 8,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tenantRoom: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  tenantEmail: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  requestNote: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.border : '#FEF3C7',
    fontStyle: 'italic',
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  requestDate: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 10,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveButtonText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEE2E2',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  rejectButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '700',
  },

  // Active Tab Styles
  activeSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  activeItemCard: {
    backgroundColor: theme.colors.successLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  activeStatusBadge: {
    backgroundColor: theme.colors.surface,
  },
  activeStatusText: {
    color: theme.colors.success,
    fontSize: 10,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  pickerWrapper: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    width: '100%',
    color: theme.colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  errorBanner: {
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: theme.isDark ? theme.colors.text : '#DC2626',
    flex: 1,
  },
});

export default getStyles;
