import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 60
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center'
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonBg: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    gap: 16
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 3,
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
  helperText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6
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
    height: 48,
    color: theme.colors.text
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
  disabledInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    color: theme.colors.textTertiary
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  pill: {
    borderRadius: 999,
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
    color: theme.colors.text,
    fontWeight: '600'
  },
  pillTextActive: {
    color: theme.colors.primaryDark,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  imagePreview: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundTertiary
  },
  addImageButton: {
    width: '31%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface
  },
  imageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    padding: 4
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16
  },
  actionButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: theme.isDark ? theme.colors.surface : '#0F172A'
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 12,
    fontSize: 13
  },
  dangerCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2'
  },
  dangerText: {
    fontSize: 14,
    color: theme.isDark ? theme.colors.text : '#7F1D1D',
    marginBottom: 12
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14
  },
  deleteButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCard: {
    width: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary
  },
  modalButtonText: {
    color: theme.colors.text,
    fontWeight: '600'
  },
  modalButtonDanger: {
    backgroundColor: theme.colors.error
  },
  modalButtonDangerText: {
    color: theme.colors.textInverse
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface
  },
  inlineAddButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
  requiredAsterisk: {
    color: theme.colors.error,
  },
});

export default getStyles;
