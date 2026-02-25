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
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text
  },
  statusDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  lastReviewed: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 8,
  },
  rejectionCard: {
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.isDark ? theme.colors.text : '#991B1B',
  },
  rejectionReason: {
    fontSize: 13,
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  documentGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  documentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  previewPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  pdfPreview: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  resubmitButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  resubmitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  
  // History Styles
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  historyBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  historyList: {
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  historyDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  historyIdType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  historyRejection: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: theme.isDark ? theme.colors.error : '#FECACA',
  },

  // Form Modal Styles
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 4,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: theme.colors.error,
  },
  pickerWrapper: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: theme.colors.text
  },
  textInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text
  },
  uploadBox: {
    height: 120,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBoxText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  selectedFile: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
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
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
});

export default getStyles;
