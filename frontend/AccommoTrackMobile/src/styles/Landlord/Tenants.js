import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 16,
    backgroundColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonNoBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: '#16A34A',
    gap: 8
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  propertySelector: {
    paddingVertical: 12
  },
  propertyScroll: {
    paddingHorizontal: 16,
    gap: 12
  },
  propertyChip: {
    width: 220,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  propertyChipActive: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7'
  },
  propertyChipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A'
  },
  propertyChipMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 6,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A'
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A'
  },
  filterText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500'
  },
  filterTextActive: {
    color: '#065F46'
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12
  },
  centerState: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12
  },
  centerText: {
    fontSize: 14,
    color: '#6B7280'
  },
  tenantCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857'
  },
  tenantContent: {
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A'
  },
  tenantEmail: {
    fontSize: 12,
    color: '#6B7280',
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
    color: '#475569'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12
  },
  metaLabel: {
    fontSize: 11,
    color: '#94A3B8'
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9'
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1'
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#DC2626'
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A'
  },
  modalContent: {
    padding: 20,
    gap: 20
  },
  detailHero: {
    alignItems: 'center',
    gap: 10
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#047857'
  },
  detailName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A'
  },
  detailEmail: {
    fontSize: 13,
    color: '#475569'
  },
  detailTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0FDF4'
  },
  detailTagText: {
    fontSize: 12,
    color: '#065F46'
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12
  },
  assignmentCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A'
  },
  assignmentMeta: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4
  },
  assignmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  assignmentEmpty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF'
  },
  assignmentEmptyText: {
    fontSize: 13,
    color: '#6B7280'
  },
  detailList: {
    gap: 4
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8'
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 6
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF'
  }
});