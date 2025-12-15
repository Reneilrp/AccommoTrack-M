import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { 
    padding: 8 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  placeholder: { 
    width: 40 
  },

  // Filter buttons - ADDED THIS
  filterScroll: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxHeight: 64, // Prevent it from expanding
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    minWidth: 90,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Scroll view - ADDED THIS
  scrollView: { 
    flex: 1,
  },
  
  roomsContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // FIXED: Removed flex: 1 from emptyContainer
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#9ca3af', 
    marginTop: 16 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#d1d5db', 
    marginTop: 4 
  },

  // Room Card Layout
  roomCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Left section: Image + Price stacked vertically
  leftSection: {
    width: 120,
    marginRight: 16,
  },
  
  roomImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  
  roomImage: {
    width: '100%',
    height: '100%',
  },
  
  // Price below image
  priceSection: {
    alignItems: 'flex-start',
  },
  
  roomPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  
  priceLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  
  // Right section: Room info
  roomInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  
  roomNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  roomType: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  
  roomDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  
  roomDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  roomDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  
  // View Details button on the right
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-end',
  },
  
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
});