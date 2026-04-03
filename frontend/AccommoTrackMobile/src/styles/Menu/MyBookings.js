import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  bookingImage: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.backgroundTertiary
  },
  bookingInfo: {
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  dateItem: {
    flex: 1,
  },
  dateItemLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  dateIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 8,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paymentStatusLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelContainer: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600'
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  // Tab Styles
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.textInverse,
  },
  // Financials Styles
  financialsContainer: {
    padding: 16,
    gap: 16,
  },
  financialSummaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tableCell: {
    fontSize: 13,
    color: theme.colors.text,
  },
  tableCellBold: {
    fontWeight: '700',
  },
  // Addon Styles
  addonSection: {
    padding: 16,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 16,
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  addonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  addonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  addonName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  addonSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  addonPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  reviewBtnContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  reviewBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    marginRight: 0,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stayContent: {
    padding: 16,
  },
  stayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  stayAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  stayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
  },
  stayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  stayMeta: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  stayMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  stayMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stayMetaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  staySection: {
    marginBottom: 24,
  },
  staySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  staySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  historyDetailItem: {
    flex: 1,
  },
  historyDetailLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  historyDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  historyFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stayHeaderCard: {
    marginBottom: 16, 
    backgroundColor: '#FFFBEB', 
    borderColor: '#FEF3C7'
  },
  stayHeaderInner: {
    borderBottomColor: '#FEF3C7'
  },
  stayHeaderLabel: {
    color: '#92400E'
  },
  stayHeaderValue: {
    color: '#92400E', 
    fontSize: 14, 
    fontWeight: '500'
  },
  stayHeaderBtn: {
    marginTop: 16, 
    backgroundColor: '#D97706'
  },
  stayHeaderBtnText: {
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12
  },
  avatarSmall: {
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  avatarSmallText: {
    fontWeight: 'bold', 
    fontSize: 18
  },
  managerName: {
    fontWeight: 'bold',
  },
  managerEmail: {
    fontSize: 12,
  },
  financialsNotice: {
    marginBottom: 16, 
    backgroundColor: '#EFF6FF', 
    borderColor: '#DBEAFE'
  },
  financialsNoticeHeader: {
    borderBottomColor: '#DBEAFE'
  },
  financialsNoticeTitle: {
    color: '#1E40AF'
  },
  financialsNoticeText: {
    color: '#1E40AF', 
    fontSize: 14
  },
  invoiceDueDateCell: {
    flex: 1.5
  },
  invoiceAmountCell: {
    flex: 2
  },
  invoiceStatusCell: {
    flex: 1.5
  },
  emptyHistoryCard: {
    backgroundColor: theme.colors.surface, 
    borderRadius: 16, 
    padding: 32
  },
  emptyHistoryIcon: {
    alignSelf: 'center'
  },
  emptyHistoryTitle: {
    textAlign: 'center'
  },
  emptyHistoryText: {
    textAlign: 'center'
  },
  historyItemCard: {
    backgroundColor: theme.colors.surface
  },
  historyItemImage: {
    width: 80, 
    height: 80, 
    borderRadius: 8
  },
  historyItemContent: {
    flex: 1, 
    justifyContent: 'center'
  },
  historyItemName: {
    fontSize: 16, 
  },
  historyItemDate: {
    fontSize: 12, 
    marginTop: 8
  },
  historyItemBadge: {
    alignSelf: 'flex-start', 
    marginTop: 8
  },
  historyItemRight: {
    justifyContent: 'center', 
    alignItems: 'flex-end'
  },
  // Sliding Toggle Styles
  sliderContainer: {
    flexDirection: 'row',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
    borderRadius: 14,
    padding: 8,
    marginBottom: 24,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sliderIndicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sliderTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Property Selector Styles
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  selectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  selectorSublabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  selectorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  selectorValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#581C87',
  },
  warningText: {
    fontSize: 12,
    color: '#7E22CE',
    marginTop: 2,
    lineHeight: 18,
  },
});

export default getStyles;
