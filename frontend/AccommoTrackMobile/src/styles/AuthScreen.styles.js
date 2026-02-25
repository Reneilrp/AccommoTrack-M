import { StyleSheet, Platform, StatusBar } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16,
    paddingBottom: 0,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  logoFull: {
    width: 200,
    height: 80,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  dismissButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 90,
    height: 90,
  },
  logoTextContainer: {
    marginLeft: -20,
  },
  logoTextGreen: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  logoTextGray: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.textTertiary,
    letterSpacing: -0.5,
    marginTop: -5,
    marginLeft: -10,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleButtonTextActive: {
    color: theme.colors.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.isDark ? theme.colors.text : '#991B1B',
  },
  inlineErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: -10,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    opacity: 0.5,
  },

  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    opacity: 0.8,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  toggleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  toggleLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  guestOptionContainer: {
    marginTop: 8,
    alignItems: 'center',
    marginBottom: 5,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  guestHintText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
  },
});

export default getStyles;
