import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEE2E2'
  },
  errorText: {
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    fontWeight: '500'
  },
  statsScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    width: 140,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 6,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  filterTextActive: {
    color: theme.colors.primaryDark
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: theme.isDark ? 0.3 : 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  guestBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1
  },
  guestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  guestAvatarText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  guestEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  detailText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13
  },
  cardBottom: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  metaLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600'
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    gap: 8
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: theme.colors.background
  },
  centerText: {
    fontSize: 15,
    color: theme.colors.textSecondary
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text
  },
  modalContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12
  },
  // Timeline - Blue themed like web
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.isDark ? theme.colors.brand900 : '#EFF6FF',
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.brand700 : '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  timelineItem: {
    flex: 1,
    alignItems: 'flex-start'
  },
  timelineItemCenter: {
    flex: 1,
    alignItems: 'center'
  },
  timelineItemEnd: {
    flex: 1,
    alignItems: 'flex-end'
  },
  timelineLabelBlue: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.isDark ? theme.colors.brand100 : '#2563EB',
    marginBottom: 2
  },
  timelineValueBlue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.isDark ? theme.colors.brand200 : '#1E3A8A'
  },
  timelineArrow: {
    fontSize: 14,
    color: theme.isDark ? theme.colors.brand600 : '#93C5FD',
    marginHorizontal: 2
  },
  // Status Row
  statusRow: {
    flexDirection: 'row',
    gap: 12
  },
  statusItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: theme.isDark ? 0.2 : 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  statusItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  // Section Card
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: theme.isDark ? 0.2 : 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  infoGrid: {
    gap: 12
  },
  infoItem: {
    gap: 2
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text
  },
  infoValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text
  },
  referenceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace'
  },
  totalAmountBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  totalAmountLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginBottom: 4
  },
  totalAmountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text
  },
  // Payment Pills
  paymentPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  paymentPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary
  },
  paymentPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  paymentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  paymentPillTextActive: {
    color: theme.colors.textInverse
  },
  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12
  },
  confirmBtnFull: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  rejectBtnFull: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.error,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surface
  },
  completeBtnFull: {
    flex: 1,
    backgroundColor: theme.colors.info,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelRefundBtnFull: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.error,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surface
  },
  cancelledNote: {
    flex: 1,
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEF2F2',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 10,
    padding: 12
  },
  cancelledNoteText: {
    fontSize: 13,
    color: theme.isDark ? theme.colors.text : '#991B1B',
    textAlign: 'center'
  },
  // Legacy styles kept for backward compatibility
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16
  },
  timelineLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 8
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 2
  },
  actionRow: {
    marginTop: 8,
    gap: 8
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  pillText: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  pillTextActive: {
    color: theme.colors.textInverse
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap'
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface
  },
  rejectBtnText: {
    color: theme.colors.error,
    fontWeight: '700'
  },
  completeBtn: {
    flex: 1,
    backgroundColor: theme.colors.info,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  completeBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  cancelRefundBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface
  },
  cancelRefundBtnText: {
    color: theme.colors.error,
    fontWeight: '700'
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: '600'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  goBackBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface
  },
  goBackBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmCancelBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: theme.colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  dangerBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '700'
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text
  },
  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});

export default getStyles;
