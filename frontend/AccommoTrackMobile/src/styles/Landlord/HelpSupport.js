import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light gray background
  },
  header: {
    paddingTop: 40, 
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#16a34a', 
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
    color: '#374151',
    marginBottom: 10,
    paddingLeft: 4, 
  },
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
  
  // Support Options Styles
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
    color: '#374151',
    marginRight: 10,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', 
  },

  // Version Info Styles
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