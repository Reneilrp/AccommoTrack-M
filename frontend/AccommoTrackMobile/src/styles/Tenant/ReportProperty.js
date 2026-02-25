import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    marginLeft: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scrollContent: {
    padding: 20,
  },
  reportingText: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.textSecondary,
  },
  propertyTitle: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: theme.colors.text,
  },
  reasonsContainer: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  reasonItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  reasonText: {
    marginLeft: 12,
    color: theme.colors.text,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    color: theme.colors.text,
  },
  textArea: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 120,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  },
  warningBanner: {
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#FEF2F2',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.isDark ? theme.colors.brand100 : '#B91C1C',
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
    backgroundColor: theme.colors.primary,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default getStyles;
