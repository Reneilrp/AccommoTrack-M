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
    paddingHorizontal: 20,
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
    margin: 20,
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
    paddingHorizontal: 20,
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
    marginBottom: 12,
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
    marginBottom: 4,
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
    marginTop: 4,
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
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
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
    marginBottom: 12,
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
    marginBottom: 12,
    paddingBottom: 12,
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
    marginRight: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
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
    marginTop: 12,
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
    paddingHorizontal: 20,
  },
  detailContainer: {
    padding: 20,
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
    gap: 12,
  },
  payBtn: {
    padding: 14, 
    borderRadius: 10,
    backgroundColor: theme.colors.primary
  },
  payBtnText: {
    color: theme.colors.textInverse, 
    fontWeight: '700',
  }
});

export default getStyles;
