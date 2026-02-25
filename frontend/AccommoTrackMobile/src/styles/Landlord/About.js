import { StyleSheet } from "react-native";

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  tempScreenContent: {
    alignItems: 'center',
    padding: 20,
  },
  tempTextBold: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  tempTextNormal: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
});

export default getStyles;
