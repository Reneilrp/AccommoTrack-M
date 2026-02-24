import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  propertyChipActive: {
    borderWidth: 2,
    borderColor: '#16A34A'
  },
  propertyChipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  propertyChipMeta: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2
  },
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A'
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  filterTextActive: {
    color: '#166534'
  },
  // Tenant Card
  listContent: {
    paddingBottom: 40
  },
  tenantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534'
  },
  tenantContent: {
    flex: 1
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  tenantEmail: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#16A34A'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  metaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6
  },
  secondaryBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  modalHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
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
    color: '#0F172A'
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
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#166534'
  },
  detailName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A'
  },
  detailEmail: {
    fontSize: 14,
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16
  },
  assignmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  assignmentMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },
  assignmentEmpty: {
    alignItems: 'center',
    padding: 24,
    borderStyle: 'dashed'
  },
  assignmentEmptyText: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 14
  },
  detailList: {
    gap: 12
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A'
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic'
  },
  // States
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  centerText: {
    marginTop: 12,
    color: '#64748B',
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
    color: '#0F172A',
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500'
  }
});
