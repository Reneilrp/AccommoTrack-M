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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Property Carousel
  propertySelector: {
    marginTop: 0
  },
  propertyScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8
  },
  propertyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  propertyChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary
  },
  propertyChipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  propertyChipTitleActive: {
    color: '#FFFFFF'
  },
  // Stats Carousel
  statsScroll: {
    marginTop: 8
  },
  statsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 2
  },
  statCard: {
    flexShrink: 0,
    borderRadius: 14,
    paddingVertical: 16,
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
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'visible'
  },
  tenantMenuAnchor: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    alignItems: 'flex-end'
  },
  tenantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 44
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
  tenantIdentity: {
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
    marginTop: 6
  },
  roomText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  metaColumn: {
    flex: 1
  },
  metaStatusColumn: {
    alignItems: 'flex-end'
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  cardActions: {
    marginTop: 12,
    gap: 8
  },
  primaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8
  },
  primaryActionBtn: {
    flex: 1,
    minWidth: 0
  },
  moreActionsTrigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  moreActionsTriggerActive: {
    backgroundColor: theme.isDark ? '#334155' : '#E2E8F0'
  },
  moreActionsMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 182,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.isDark ? 0.3 : 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 24,
    overflow: 'hidden'
  },
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  moreActionItemDisabled: {
    opacity: 0.45
  },
  moreActionLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700'
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13
  },
  warningBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  warningBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  successBtn: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  successBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  unassignBtn: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#B45309',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  unassignBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  dangerBtn: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  actionDisabledBtn: {
    opacity: 0.5
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
    marginTop: 8
  },
  detailTags: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
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
    marginTop: 8
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
    gap: 16
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
    marginTop: 16,
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
    padding: 16,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  errorText: {
    color: theme.isDark ? theme.colors.text : '#B91C1C',
    fontSize: 13,
    fontWeight: '500'
  },
  loadingIndicator: {
    marginTop: 40,
  },
  modalHeaderView: {
    width: 48,
  },
  profileScroll: {
    marginTop: 16, 
    backgroundColor: '#16a34a', 
    paddingVertical: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8
  },
  profileBtn: {
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 14
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16
  },
  actionModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    maxHeight: '86%'
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text
  },
  actionModalSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 19
  },
  actionFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8
  },
  roomsPicker: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 8,
    backgroundColor: theme.colors.backgroundSecondary
  },
  modalLoader: {
    marginVertical: 16
  },
  roomOption: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface
  },
  roomOptionActive: {
    borderColor: '#16a34a',
    backgroundColor: theme.isDark ? 'rgba(22, 163, 74, 0.18)' : '#DCFCE7'
  },
  roomOptionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14
  },
  roomOptionMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3
  },
  actionInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: theme.colors.text
  },
  dateInputButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateInputValue: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dateInputPlaceholder: {
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 2,
  },
  clearDateButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionTextArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 86,
    textAlignVertical: 'top',
    color: theme.colors.text
  },
  actionTextAreaLarge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 120,
    textAlignVertical: 'top',
    color: theme.colors.text
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: theme.colors.backgroundSecondary
  },
  modalCancelText: {
    color: theme.colors.text,
    fontWeight: '700'
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#D97706'
  },
  modalDangerBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#DC2626'
  },
  modalSuccessBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#16a34a'
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  modalDisabledBtn: {
    opacity: 0.45
  }
});

export default getStyles;
