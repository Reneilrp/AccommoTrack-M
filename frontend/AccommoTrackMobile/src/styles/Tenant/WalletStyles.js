import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    color: 'rgba(255,255,255,0.8)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border,
  },
  chartHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  timeRangeTextActive: {
    color: theme.colors.textInverse,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    marginTop: 16,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },
  listCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentDate: {
    fontSize: 13,
    marginTop: 8,
    color: theme.colors.textTertiary,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 16,
    color: theme.colors.textTertiary,
  },
  payBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  payBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.colors.text,
  },
  checkoutInfo: {
    marginBottom: 16,
  },
  checkoutPropName: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  checkoutRoom: {
    marginTop: 8,
    color: theme.colors.textSecondary,
  },
  checkoutAmount: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  methodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  methodBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  methodBtnActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  methodName: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  methodNameActive: {
    color: theme.colors.primary,
  },
  methodDesc: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  btnText: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  btnTextInverse: {
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
});

export default getStyles;
