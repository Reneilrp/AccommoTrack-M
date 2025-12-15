import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 18
  },
  scrollContent: {
    paddingBottom: 32
  },
  header: {
    paddingVertical: 16,
    gap: 6
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280'
  },

  // Profile Card Styles
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileInitials: {
    color: '#047857',
    fontSize: 22,
    fontWeight: '700'
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  profileAction: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#ECFDF5'
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857'
  },

  // Section and Card General Styles
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingLeft: 4
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden'
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden'
  },

  // Notification Item Styles
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingTextBlock: {
    flex: 1,
    marginLeft: 14
  },
  settingLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600'
  },
  settingDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280'
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  settingValue: {
    fontSize: 13,
    color: '#6B7280'
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 18
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
    elevation: 2
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336'
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16
  },
  footerNote: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16
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