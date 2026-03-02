import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    padding: 8,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  loadingCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  roomInfo: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '47%',
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentMethod: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  fullFlex: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalInner: {
    backgroundColor: theme.colors.surface, 
    borderRadius: 10, 
    padding: 20, 
    width: '90%'
  },
  modalTitle: {
    fontSize: 18, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
    marginBottom: 20
  },
  modalFooter: {
    marginTop: 20
  },
  modalCloseBtn: {
    color: theme.colors.primary, 
    textAlign: 'center'
  },
  roomImageScroll: {
    paddingHorizontal: 16, 
    paddingTop: 16
  },
  roomImage: {
    width: screenWidth * 0.6, 
    height: 150, 
    borderRadius: 8, 
    marginRight: 10
  },
  noImagesBox: {
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 150
  },
  noImagesText: {
    color: theme.colors.textTertiary
  },
  roomContent: {
    padding: 16
  },
  descriptionLabel: {
    color: theme.colors.text, 
    marginTop: 10, 
    marginBottom: 5, 
    fontWeight: 'bold'
  },
  descriptionText: {
    color: theme.colors.textSecondary
  },
  amenitiesList: {
    flexDirection: 'row', 
    flexWrap: 'wrap'
  },
  amenityRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '50%', 
    marginBottom: 8
  },
  amenityName: {
    color: theme.colors.text, 
    marginLeft: 5
  },
  actionRow: {
    flexDirection: 'row', 
    marginTop: 10
  },
});

export default getStyles;
