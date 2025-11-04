import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 20
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 1
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937'
  },
  tenantsList: {
    flex: 1,
    paddingHorizontal: 16
  },
  tenantCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1
  },
  tenantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  tenantInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  tenantInfo: {
    flex: 1
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  tenantRoom: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6
  },
  tenantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tenantRent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937'
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600'
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center'
  }
});