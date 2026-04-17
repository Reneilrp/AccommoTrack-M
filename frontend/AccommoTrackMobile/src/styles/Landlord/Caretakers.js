import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 48,
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },

  // ── List card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  cardIdentity: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  email: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // ── Action buttons (icon + label) ────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: 4,
  },
  actionBtnDanger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  actionBtnTextDanger: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },

  // ── Permission summary in list card ─────────────────────────────────────
  permSummarySection: {
    marginTop: 12,
    gap: 6,
  },
  permSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textTertiary,
  },
  permGroupPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  permGroupPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '18',
  },
  permGroupPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  permCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  permProgressOuter: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  permProgressInner: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  permCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
  },

  // ── Properties pill ──────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    color: theme.colors.textTertiary,
    marginTop: 14,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  noData: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },

  // ── Segmented tab bar ────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 4,
  },
  tabBarItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBarItemActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBarItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabBarItemTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Form ─────────────────────────────────────────────────────────────────
  formScroll: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: theme.colors.text,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
    color: theme.colors.textTertiary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
  },
  eyeIcon: {
    padding: 14,
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },

  // ── Warning banner (Select All) ──────────────────────────────────────────
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  warnBannerDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderColor: '#713F12',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  warnBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 16,
  },
  warnBannerTextDark: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#FCD34D',
    lineHeight: 16,
  },
  warnSelectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#D97706',
  },
  warnSelectAllBtnDeselect: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#DC2626',
  },
  warnSelectAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },

  // ── Property checkbox row ────────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '60',
  },
  checkLabel: {
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  checkSelected: {
    fontSize: 15,
    color: theme.colors.primary,
    flex: 1,
    fontWeight: '700',
  },

  // ── Footer / save button ─────────────────────────────────────────────────
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  cancelButtonText: {
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  saveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // ── Alert / modals ────────────────────────────────────────────────────────
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  alertIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMsg: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  alertCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  alertCancelText: {
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  alertConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertConfirmText: {
    fontWeight: 'bold',
    color: '#FFF',
  },
  reasonInput: {
    width: '100%',
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
});

export default getStyles;
