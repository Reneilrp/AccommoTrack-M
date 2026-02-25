import { StyleSheet } from "react-native";

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: { 
    padding: 8 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: theme.colors.text,
    flex: 1,
    marginLeft: 12,
  },
  placeholder: { 
    width: 40 
  },

  // Filter buttons
  filterScroll: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxHeight: 64,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    minWidth: 90,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },

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
    backgroundColor: theme.colors.background,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: theme.colors.textTertiary, 
    marginTop: 16 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: theme.colors.textTertiary, 
    marginTop: 4 
  },

  // Room Card Layout
  roomCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.2 : 0.05,
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
    backgroundColor: theme.colors.backgroundTertiary,
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
    color: theme.colors.primary,
  },
  
  priceLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
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
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
  },
  
  // View Details button on the right
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-end',
  },
  
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
