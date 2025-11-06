import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: 40,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1, 
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // Profile Card Styles
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  // Section and Card General Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    paddingLeft: 4,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden',
  },

  // Notification Item Styles
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 15,
    fontSize: 15,
    color: '#374151',
  },
  
  // Menu Item Styles
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuLabel: {
    marginLeft: 15,
    fontSize: 15,
    color: '#374151',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  // Logout Button Styles
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },

  // --- Temporary Screen Styles ---
  tempScreenContent: {
    paddingHorizontal: 16,
    paddingTop: 30,
    alignItems: 'center',
  },
  tempContentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
  },
  tempTextBold: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 15,
    marginBottom: 10,
  },
  tempTextNormal: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // --- MyProfile Specific Styles ---
  avatarSection: {
      alignItems: 'center',
      marginBottom: 30,
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
  editProfileButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // --- HelpSupport Specific Styles ---
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden', 
  },
  supportOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supportTextContainer: {
    marginLeft: 15,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  supportSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginRight: 10,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', 
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  }
});