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
  
  // Step Indicator
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  stepCircleCompleted: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textTertiary
  },
  stepNumberActive: {
    color: theme.colors.textInverse
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary
  },

  formContent: {
    padding: 16
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 16
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
    backgroundColor: theme.colors.background,
    marginBottom: 12
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: theme.colors.background
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 12
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  pillTextActive: {
    color: theme.colors.primaryDark
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundTertiary,
    overflow: 'hidden',
    position: 'relative'
  },
  imageRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight
  },
  
  // Navigation Footer
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12
  },
  prevButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.backgroundSecondary
  },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  draftButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  buttonTextPrimary: {
    color: theme.colors.textInverse
  },
  buttonTextDraft: {
    color: theme.colors.primary
  },

  errorBanner: {
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  errorText: {
    fontSize: 13,
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    flex: 1
  },
  
  verificationWarning: {
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#FFFBEB',
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.brand700 : '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.isDark ? theme.colors.brand100 : '#92400E'
  },
  warningText: {
    fontSize: 12,
    color: theme.isDark ? theme.colors.brand200 : '#B45309',
    marginTop: 2,
    lineHeight: 16
  },

  requiredAsterisk: {
    color: theme.colors.error,
  },

  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    gap: 10
  },
  credentialName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text
  },
  removeCredential: {
    padding: 4
  },

  // Enhanced Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  successModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.4 : 0.2,
    shadowRadius: 12,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center'
  },
  successMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32
  },
  successButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center'
  },
  successButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700'
  }
});

export default getStyles;
