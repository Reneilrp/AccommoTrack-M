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
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    margin: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 16,
  },
  balanceDetails: {
    flexDirection: 'row',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  balanceItemText: {
    fontSize: 14,
    color: theme.colors.textInverse,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  methodCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    marginBottom: 16,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIconDisabled: {
    opacity: 0.5,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  methodNameDisabled: {
    color: theme.colors.textTertiary,
  },
  methodComingSoon: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  methodAvailableBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
  },
  methodAvailableText: {
    fontSize: 10,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  paymentNoteText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginLeft: 8,
  },
  paymentCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.2 : 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
  paymentDetails: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  paymentValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    paddingHorizontal: 16,
  },
  detailContainer: {
    padding: 16,
  },
  invoiceTitle: {
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8,
    color: theme.colors.text
  },
  separator: {
    height: 1, 
    marginVertical: 8,
    backgroundColor: theme.colors.borderLight
  },
  totalText: {
    fontSize: 16, 
    fontWeight: '700',
    color: theme.colors.text
  },
  statusRow: {
    marginBottom: 8,
  },
  statusLabel: {
    color: theme.colors.textSecondary,
  },
  statusValue: {
    fontWeight: '600',
    color: theme.colors.text
  },
  actionsRow: {
    flexDirection: 'row', 
    gap: 16,
  },
  payBtn: {
    padding: 14, 
    borderRadius: 10,
    backgroundColor: theme.colors.primary
  },
  payBtnText: {
    color: theme.colors.textInverse, 
    fontWeight: '700',
  },
  
  // Refund Stats (Sync with Landlord)
  refundStatsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(126,34,206,0.15)',
    backgroundColor: 'rgba(126,34,206,0.03)',
  },
  refundStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refundStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  refundStatValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '800',
  },
  refundStatEmphasis: {
    color: theme.colors.purple,
    fontWeight: '900',
  },
  invoiceAddonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  
  // Redesign Tokens
  summaryCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryMain: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  summaryGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
    marginTop: 4,
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryItemValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  
  cardSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  
  amountInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    height: 64,
    marginBottom: 8,
  },
  amountInputCurrency: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    marginRight: 8,
  },
  amountInputField: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    padding: 0,
  },
  
  methodSelectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 16,
  },
  methodTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodTileContent: {
    flex: 1,
  },
  methodTileName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  methodTileDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  uploadArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    padding: 16,
    height: 120,
  },
  uploadAreaText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  proofPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#000',
  },
});

export default getStyles;
