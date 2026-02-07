import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
  formContent: {
    padding: 16
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
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
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 12
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F9FAFB'
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8
  },
  pillActive: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7'
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937'
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden'
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
    justifyContent: 'center'
  },
  addImageButton: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    marginBottom: 12
  },
  requiredAsterisk: {
    color: '#DC2626',
  },
});
