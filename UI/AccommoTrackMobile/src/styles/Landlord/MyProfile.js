import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', 
  },
  header: {
    paddingTop: 35, 
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginLeft: 10,
  },
  editButton: {
    padding: 5,
  },
  editText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600'
  },
  scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
  },
  
  // Avatar Section
  avatarSection: {
      alignItems: 'center',
      marginBottom: 30,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
      fontSize: 20,
      fontWeight: '600',
      color: '#374151',
      marginTop: 10,
  },
  changePictureButton: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
  },
  changePictureText: {
      color: '#4CAF50',
      fontSize: 14,
      fontWeight: '500',
  },

  // Details Card
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    marginBottom: 20,
  },
  fieldContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fieldLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280', 
    textTransform: 'uppercase',
    fontWeight: '600',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#374151',
    padding: 0,
    marginTop: 2,
  },
  fieldValueEditable: {
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
  },
  
  // Cancel Button
  cancelButton: {
    backgroundColor: '#E5E7EB',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  }
});