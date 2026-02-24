import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#16A34A'
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF'
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
    backgroundColor: '#FEE2E2'
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '500'
  },
  statsScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 6,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A'
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  filterTextActive: {
    color: '#166534'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
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
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  guestAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  guestEmail: {
    fontSize: 13,
    color: '#64748B'
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
    color: '#475569',
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
    color: '#94A3B8'
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A'
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
    color: '#0F172A'
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  centerText: {
    fontSize: 15,
    color: '#64748B'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
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
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    color: '#2563EB',
    marginBottom: 2
  },
  timelineValueBlue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A'
  },
  timelineArrow: {
    fontSize: 14,
    color: '#93C5FD',
    marginHorizontal: 2
  },
  // Status Row
  statusRow: {
    flexDirection: 'row',
    gap: 12
  },
  statusItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  statusItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
    color: '#94A3B8'
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A'
  },
  infoValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A'
  },
  referenceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
    fontFamily: 'monospace'
  },
  totalAmountBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  totalAmountLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4
  },
  totalAmountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A'
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
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  paymentPillActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A'
  },
  paymentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  paymentPillTextActive: {
    color: '#FFFFFF'
  },
  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12
  },
  confirmBtnFull: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  rejectBtnFull: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  completeBtnFull: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelRefundBtnFull: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  cancelledNote: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12
  },
  cancelledNoteText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center'
  },
  // Legacy styles kept for backward compatibility
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16
  },
  timelineLabel: {
    fontSize: 13,
    color: '#94A3B8'
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  detailLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8
  },
  detailValue: {
    fontSize: 15,
    color: '#0F172A',
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
    borderColor: '#CBD5F5'
  },
  pillActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A'
  },
  pillText: {
    color: '#475569',
    fontWeight: '600'
  },
  pillTextActive: {
    color: '#FFFFFF'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap'
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  rejectBtnText: {
    color: '#DC2626',
    fontWeight: '700'
  },
  completeBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  cancelRefundBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  cancelRefundBtnText: {
    color: '#DC2626',
    fontWeight: '700'
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  secondaryBtnText: {
    color: '#0F172A',
    fontWeight: '600'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  goBackBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  goBackBtnText: {
    color: '#475569',
    fontWeight: '600'
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmCancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    padding: 12,
    fontSize: 14,
    color: '#0F172A'
  },
  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});