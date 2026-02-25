import { StyleSheet } from 'react-native';

export const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center'
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Property Carousel
  propertySelector: {
    marginTop: 16
  },
  propertyScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  propertyChip: {
    width: 200,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border
  },
  propertyChipActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary
  },
  propertyChipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  propertyChipMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  // Stats Grid (5 columns)
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap'
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2
  },
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.text
  },
  // Filters
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
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
  // Tenant Card
  listContent: {
    paddingBottom: 40
  },
  tenantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 4
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryDark
  },
  tenantContent: {
    flex: 1
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  tenantEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8
  },
  roomText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight
  },
  metaLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6
  },
  primaryBtnText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 13
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  modalHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text
  },
  modalContent: {
    padding: 24
  },
  detailHero: {
    alignItems: 'center',
    marginBottom: 24
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.primaryDark
  },
  detailName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text
  },
  detailEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  detailTags: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text
  },
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16
  },
  assignmentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text
  },
  assignmentMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  assignmentEmpty: {
    alignItems: 'center',
    padding: 24,
    borderStyle: 'dashed'
  },
  assignmentEmptyText: {
    marginTop: 8,
    color: theme.colors.textTertiary,
    fontSize: 14
  },
  detailList: {
    gap: 12
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  helperText: {
    color: theme.colors.textTertiary,
    fontSize: 14,
    fontStyle: 'italic'
  },
  // States
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: theme.colors.background
  },
  centerText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },
  errorBanner: {
    backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEE2E2',
    padding: 12,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  errorText: {
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    fontSize: 13,
    fontWeight: '500'
  }
});

export default getStyles;
