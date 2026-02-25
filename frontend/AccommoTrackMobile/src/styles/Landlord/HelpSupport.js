import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 40, 
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary, 
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
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Section and Card General Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 10,
    paddingLeft: 4, 
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden', 
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  
  // Support Options Styles
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
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // FAQ Styles
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

  // Version Info Styles
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
