import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)'
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
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
    color: '#111827'
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden'
  },
  picker: {
    height: 48
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#9CA3AF'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
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
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF'
  },
  pillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#34D399'
  },
  pillText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600'
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB'
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
    backgroundColor: '#F4F4F5'
  },
  addImageButton: {
    width: '31%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
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
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#0F172A'
  },
  errorText: {
    color: '#B91C1C',
    marginBottom: 12,
    fontSize: 13
  },
  dangerCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2'
  },
  dangerText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 12
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  modalDescription: {
    fontSize: 14,
    color: '#4B5563',
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
    backgroundColor: '#E5E7EB'
  },
  modalButtonText: {
    color: '#111827',
    fontWeight: '600'
  },
  modalButtonDanger: {
    backgroundColor: '#DC2626'
  },
  modalButtonDangerText: {
    color: '#FFFFFF'
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
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  inlineAddButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  requiredAsterisk: {
    color: '#DC2626',
  },
});