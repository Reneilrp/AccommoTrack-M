import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },

  // Profile Card Styles
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 18,
    borderRadius: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme.isDark ? 0.3 : 0.06,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileInitials: {
    color: theme.colors.primary,
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
    color: theme.colors.text
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  profileAction: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.backgroundSecondary
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary
  },

  // Section and Card General Styles
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    paddingLeft: 4
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.isDark ? 0.3 : 0.04,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
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
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingTextBlock: {
    flex: 1,
    marginLeft: 14
  },
  settingLabel: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600'
  },
  settingDescription: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  settingValue: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
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
    color: theme.colors.text,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  // Logout Button Styles
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8
  },
  dangerButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
    fontSize: 16
  },
  footerNote: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  tempTextBold: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 15,
    marginBottom: 10,
  },
  tempTextNormal: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    marginBottom: 20,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  fieldContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  fieldLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
    marginTop: 2,
  },
  fieldValueEditable: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
  },
  editProfileButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
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
    color: theme.colors.textInverse,
  },

  // --- HelpSupport Specific Styles ---
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden', 
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  supportOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
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
    color: theme.colors.text,
  },
  supportSubtitle: {
    fontSize: 12,
    color: theme.colors.textTertiary,
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
    color: theme.colors.text,
    marginRight: 10,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight, 
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  }
});

export default getStyles;
