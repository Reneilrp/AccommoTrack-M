import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const sideWidth = Math.max(56, Math.round(width * 0.05));

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // HEADER STYLES
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 0,
    // Use a fixed app-bar height so SafeArea inset + header padding don't stack
    height: 56,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    padding: 8,
  },
  headerSide: {
    width: sideWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  flex1MarginLeft12: {
    flex: 1,
    marginLeft: 12,
  },
  buttonFlex: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainerPadding: {
    padding: 16,
    paddingBottom: 24,
  },
  surfaceCardSmall: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  surfaceCardMedium: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalContentBase: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  rowSpaceBetweenCenter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    // avoid fixed height or flex here; let container control vertical centering
    paddingHorizontal: 8,
  },

  // MENU DRAWER STYLES
  menuBackdrop: {
    flex: 1,
  },
  menuDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 30,
    zIndex: 1001,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  menuUserEmail: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#424242',
    fontWeight: '500',
  },

  // SEARCH BAR STYLES
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    height: 72,
    justifyContent: 'center',
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    color: '#212121',
  },
  searchButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  filterButtonsRow: {
  marginTop: 8,
  marginBottom: 12,
  height: 56,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  filterOptionsContainer: {
    padding: 20,
  },
  filterButtonsContainer: {
  flexDirection: 'row',
  paddingHorizontal: 10,
  gap: 8,
  alignItems: 'center',
},
  filterButtonActive: {
  backgroundColor: '#10b981',
  },
  filterButtonText: {
  color: '#757575',
  fontSize: 14,
  fontWeight: '500',
  },
  filterButtonTextActive: {
  color: '#fff',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#10b981',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  activeFilterContainer: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },

  // CARDS CONTAINER
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // CARD STYLES - Vertical Card with Image on Top
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 20,
  },
  dormName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
    flex: 1,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  availabilityText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'column',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10b981',
  },
  priceLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Horizontal card layout
  cardRow: {
    flexDirection: 'column',
    width: '100%',
  },
  cardHeader: {
    flex: 1,
  },

  // LOADING STATES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },

  // ERROR CONTAINER
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#C62828',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // NO RESULTS
  noResultsContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // FILTER MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },

  card: {
  backgroundColor: '#fff',
  borderRadius: 12,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  overflow: 'hidden',
},

imageContainer: {
  width: '100%',
  height: 200,
  position: 'relative',
},

image: {
  width: '100%',
  height: '100%',
},

typeBadge: {
  position: 'absolute',
  top: 12,
  left: 12,
  backgroundColor: '#10b981',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
},

typeBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},

cardContent: {
  padding: 16,
},

dormName: {
  fontSize: 18,
  fontWeight: '700',
  color: '#212121',
  marginBottom: 8,
},

locationContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},

locationText: {
  fontSize: 14,
  color: '#757575',
  marginLeft: 4,
  flex: 1,
},

availabilityBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E8F5E9',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
  alignSelf: 'flex-start',
  marginBottom: 16,
},

availabilityText: {
  fontSize: 12,
  color: '#10b981',
  marginLeft: 4,
  fontWeight: '500',
},

cardFooter: {
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
},

viewButton: {
  backgroundColor: '#10b981',
  paddingVertical: 12,
  paddingHorizontal: 40,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
},

viewButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},

  // BOTTOM NAVIGATION - Theme-aware with 5 tabs
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingBottom: 0,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingTop: 4,
    marginBottom: 6,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: -24,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  // Legacy styles kept for backward compatibility
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeIndicator: {
    width: 50,
    height: 4,
    backgroundColor: '#FFEB3B',
    borderRadius: 2,
    marginTop: 4,
  },
  guestBanner: {
  backgroundColor: '#EFF6FF',
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 8,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  overflow: 'hidden',
},
guestBannerContent: {
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
guestBannerText: {
  fontSize: 14,
  color: '#1E40AF',
  textAlign: 'center',
  lineHeight: 20,
},
guestBannerLink: {
  fontWeight: '700',
  color: '#2563EB',
  textDecorationLine: 'underline',
},
});

export default styles;