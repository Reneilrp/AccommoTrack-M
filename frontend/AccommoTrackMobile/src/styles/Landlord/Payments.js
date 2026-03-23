import { StyleSheet } from 'react-native';

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
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginLeft: 16,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: theme.colors.text,
  },
  filterContainer: {
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeFilterText: {
    color: theme.colors.textInverse,
  },
  listContent: {
    padding: 16,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  invoiceId: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  invoiceBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  amountLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  viewButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryLight,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  updateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    width: '48%',
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.border,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },

  // ── Record-payment form ──────────────────────────────────────────────────
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  fieldTextarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  methodChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  recordButton: {
    marginTop: 16,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  
  // Transaction List Styles
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  transactionMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  transactionRef: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  refundButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7E22CE',
  },
  refundedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  refundedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
  },
});

export default getStyles;
